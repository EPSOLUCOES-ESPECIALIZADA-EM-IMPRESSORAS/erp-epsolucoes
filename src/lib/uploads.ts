import { auth } from './firebase';

const uploadsApiUrl = (import.meta.env.VITE_UPLOADS_API_URL || '/api').replace(/\/$/, '');

export async function uploadFile(path: string, file: File, onProgress?: (progress: number) => void) {
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error('Faca login novamente para enviar anexos.');
  }

  const formData = new FormData();
  formData.append('path', path);
  formData.append('file', file);

  const response = await fetch(`${uploadsApiUrl}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || 'Erro ao enviar arquivo.');
  }

  const uploaded = await response.json();
  onProgress?.(100);
  return uploaded.url as string;
}
