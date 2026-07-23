// Upload an image file to the backend image upload endpoint
import { API_BASE_URL } from './api';

export async function apiUploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/images/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // returns image URL or path
}
