// frontend/lib/api.ts

function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;

    // Cloudflareトンネル(app.dreamgaragelite.com)経由の場合はバックエンドも
    // トンネル側(api.dreamgaragelite.com)を使う。それ以外はPC向けの通常HTTP(3001)。
    if (hostname === 'app.dreamgaragelite.com') {
      return 'https://api.dreamgaragelite.com/api';
    }

    return `http://${hostname}:3001/api`;
  }

  return 'http://localhost:3001/api';
}

const API_URL = resolveApiUrl();

export function apiBaseUrl() {
  return API_URL;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    // ログインセッション(httpOnly Cookie)をサーバーへ送るために必須。
    // 会社の識別はこのCookieのみで行い、クライアントからは一切申告しない。
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

/** PDF等バイナリのGETをBlobで取得する(認証Cookieを付けて) */
export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.blob();
}

export function extractErrorMessage(e: any) {
  try {
    return JSON.parse(e.message)?.message ?? e.message;
  } catch {
    return e.message;
  }
}

export async function upload(
  path: string,
  file: File,
  fields?: Record<string, string>,
) {
  const form = new FormData();

  form.append('file', file);

  for (const [key, value] of Object.entries(fields ?? {})) {
    form.append(key, value);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}