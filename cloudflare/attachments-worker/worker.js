const FIREBASE_ACCOUNTS_LOOKUP =
  'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

const DEFAULT_ALLOWED_ORIGIN = 'https://erp-epsolucoes.pages.dev';

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGIN)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowOrigin = allowedOrigins.includes(origin) || isLocalhost ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, init = {}, request, env) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
      ...(init.headers || {}),
    },
  });
}

function sanitizePath(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_ .-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .slice(0, 700);
}

async function verifyFirebaseUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) return null;

  const response = await fetch(`${FIREBASE_ACCOUNTS_LOOKUP}?key=${env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });

  if (!response.ok) return null;

  const result = await response.json();
  return result.users?.[0] || null;
}

async function handleUpload(request, env) {
  const user = await verifyFirebaseUser(request, env);
  if (!user) {
    return json({ message: 'Login invalido ou expirado.' }, { status: 401 }, request, env);
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const requestedPath = formData.get('path');

  if (!(file instanceof File)) {
    return json({ message: 'Arquivo nao recebido.' }, { status: 400 }, request, env);
  }

  if (file.size > 10 * 1024 * 1024) {
    return json({ message: 'Arquivo excede o limite de 10MB.' }, { status: 413 }, request, env);
  }

  const basePath = typeof requestedPath === 'string' ? sanitizePath(requestedPath) : '';
  const key = `${Date.now()}-${crypto.randomUUID()}-${basePath || sanitizePath(file.name)}`;

  await env.ATTACHMENTS.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
      contentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
    },
    customMetadata: {
      uploadedBy: user.email || user.localId || 'unknown',
      originalName: file.name,
    },
  });

  const publicBaseUrl = (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');

  return json(
    {
      key,
      name: file.name,
      type: file.type,
      size: file.size,
      url: `${publicBaseUrl}/files/${encodeURIComponent(key)}`,
    },
    { status: 201 },
    request,
    env
  );
}

async function handleFile(request, env, key) {
  const object = await env.ATTACHMENTS.get(key);

  if (!object) {
    return new Response('Arquivo nao encontrado.', {
      status: 404,
      headers: corsHeaders(request, env),
    });
  }

  return new Response(object.body, {
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...(object.httpMetadata?.contentDisposition
        ? { 'Content-Disposition': object.httpMetadata.contentDisposition }
        : {}),
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/uploads') {
      return handleUpload(request, env);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/files/')) {
      const key = decodeURIComponent(url.pathname.slice('/files/'.length));
      return handleFile(request, env, key);
    }

    return json({ message: 'Endpoint nao encontrado.' }, { status: 404 }, request, env);
  },
};
