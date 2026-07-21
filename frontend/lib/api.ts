// frontend/lib/api.ts

function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    // https://.../ (スマホ/タブレット向けHTTPSプロキシ経由) の場合は
    // バックエンドもHTTPSプロキシ側(3444)を使う。それ以外はPC向けの通常HTTP(3001)。
    if (protocol === 'https:') {
      return `https://${hostname}:3444/api`;
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
  const companyId =
    typeof window !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((c) => c.startsWith('companyId='))
          ?.split('=')[1]
      : undefined;

  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (companyId) {
    headers.set('x-company-id', companyId);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
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
) {
  const companyId =
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('companyId='))
      ?.split('=')[1];

  const form = new FormData();

  form.append('file', file);

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: companyId
      ? {
          'x-company-id': companyId,
        }
      : undefined,
    body: form,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}