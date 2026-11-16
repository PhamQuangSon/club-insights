import type { ApiError } from "./types";

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** SWR fetcher: parses JSON and turns API errors into thrown FetchErrors. */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const message = body && typeof body === "object" && "error" in body ? body.error.message : `Request failed (${res.status})`;
    throw new FetchError(message, res.status);
  }
  return body as T;
}
