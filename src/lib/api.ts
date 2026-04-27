type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');

  if (!trimmed) {
    return '';
  }

  if (trimmed.endsWith('/api/mobile')) {
    return trimmed;
  }

  if (trimmed.endsWith('/api')) {
    return `${trimmed}/mobile`;
  }

  return `${trimmed}/api/mobile`;
}

export async function loginRequest<T>(
  baseUrl: string,
  body: { email: string; password: string; device_name?: string }
): Promise<T> {
  return mobileRequest<T>(baseUrl, '/login', {
    method: 'POST',
    body,
  });
}

export async function mobileRequest<T = unknown>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const url = new URL(`${normalizedBaseUrl}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Tidak bisa terhubung ke server API.');
  }

  const text = await response.text();
  let data: Record<string, unknown> = {};

  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    throw new ApiError(
      (typeof data.message === 'string' && data.message) || `Permintaan gagal (HTTP ${response.status}).`,
      response.status,
      (data.errors as Record<string, string[]>) || undefined
    );
  }

  return data as T;
}
