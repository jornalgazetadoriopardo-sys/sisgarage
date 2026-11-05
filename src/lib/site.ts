export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path; // ex.: fotos no Vercel Blob
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
