import { put } from '@vercel/blob';
import { hasBlobToken } from './config.js';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_PREFIXES = ['image/', 'video/'];

export const MEDIA_LIMITS = { maxBytes: MAX_BYTES, allowed: ALLOWED_PREFIXES };

function assertAllowed(contentType, size) {
  if (size > MAX_BYTES) {
    throw new Error(`File too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
  }
  const ct = String(contentType || '').toLowerCase();
  if (!ALLOWED_PREFIXES.some((p) => ct.startsWith(p))) {
    throw new Error('Only image and video files are allowed.');
  }
}

function safeName(name) {
  const base = String(name || 'upload')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  const stamp = Date.now().toString(36);
  return `releasenotes/${stamp}-${base}`;
}

export async function storeBuffer(buffer, { filename, contentType }) {
  if (!hasBlobToken()) throw new Error('BLOB_READ_WRITE_TOKEN is not configured.');
  assertAllowed(contentType, buffer.length);
  const result = await put(safeName(filename), buffer, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
    addRandomSuffix: true,
  });
  return { url: result.url, contentType: contentType || '', bytes: buffer.length };
}

// Convert common share URLs into a directly downloadable form.
export function normalizeSourceUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) throw new Error('A media URL is required.');

  // Google Drive: https://drive.google.com/file/d/<id>/view -> uc?export=download
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) {
    return `https://drive.google.com/uc?export=download&id=${driveFile[1]}`;
  }
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) {
    return `https://drive.google.com/uc?export=download&id=${driveOpen[1]}`;
  }
  return url;
}

export async function importFromUrl(rawUrl) {
  const src = normalizeSourceUrl(rawUrl);
  let resp;
  try {
    resp = await fetch(src, { redirect: 'follow' });
  } catch {
    throw new Error('Could not fetch the URL. Check that it is public.');
  }
  if (!resp.ok) {
    throw new Error(`Fetch failed (${resp.status}). The file must be publicly accessible.`);
  }
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      'That URL returned a web page, not a file. For Google Drive, share as "Anyone with the link". Google Photos share links are not supported.'
    );
  }
  const arrayBuf = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const nameFromUrl = src.split('/').pop()?.split('?')[0] || 'import';
  return storeBuffer(buffer, { filename: nameFromUrl, contentType });
}
