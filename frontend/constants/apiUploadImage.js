// Upload an image file to the backend image upload endpoint
import { API_BASE_URL } from './api';

export async function apiUploadImage(uri) {
  const formData = new FormData();
  // Extract filename and type from uri
  const filename = uri.split('/').pop();
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image';
  formData.append('file', {
    uri,
    name: filename,
    type,
  });
  const res = await fetch(`${API_BASE_URL}/images/upload`, {
    method: 'POST',
    // Do NOT set Content-Type header, let fetch set it with boundary
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // returns image URL or path
}
