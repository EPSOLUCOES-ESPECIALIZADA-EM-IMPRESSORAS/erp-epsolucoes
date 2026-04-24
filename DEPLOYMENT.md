# Publicação Web

## 1. Firebase de produção

1. Criar um projeto Firebase próprio da EPSOLUÇÕES.
2. Ativar Authentication com provedor Google.
3. Criar Firestore. Use o banco padrão `(default)`, salvo se houver motivo para usar um database id customizado.
4. Ativar Firebase Storage.
5. Copiar as credenciais do app web para `.env.local` e para as variáveis de ambiente do Cloudflare Pages.
6. Publicar `firestore.rules` e `storage.rules`.

## 2. Cloudflare Pages

Projeto Pages criado na conta Cloudflare:

- Project name: `erp-epsolucoes`
- Project ID: `0e0ae990-dc1d-432f-b00d-c10fdb9a34c4`
- URL: `https://erp-epsolucoes.pages.dev`
- Production branch: `main`
- Current production deployment: `76a4b94e-c32e-4592-ac60-66baf3ed851e`

Uma primeira versão foi publicada por Direct Upload para validação do sistema no ar. Ela ainda usa o fallback `firebase-applet-config.json` enquanto o Firebase próprio da EPSOLUÇÕES não for configurado nas variáveis `VITE_FIREBASE_*`.

Para deploy contínuo:

1. Conectar o projeto Pages ao repositório GitHub.
2. Configurar:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node.js: versão 20 ou superior
3. Cadastrar as variáveis:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   - `VITE_FIREBASE_DATABASE_ID`
   - `VITE_APP_URL`
   - `VITE_GEMINI_API_KEY`, opcional

## 3. Checklist pós-deploy

- Adicionar o domínio final do Pages nos domínios autorizados do Firebase Authentication.
- Entrar com Google.
- Cadastrar cliente, equipamento e OS.
- Fazer upload de anexo em uma OS.
- Abrir uma rota pública `/track/:token`.
- Recarregar páginas internas e confirmar que não há 404.
