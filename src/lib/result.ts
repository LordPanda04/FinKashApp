/** Error de dominio: `code` estable para lógica y pruebas; `message` en español para el usuario. */
export interface DomainError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Result<T> {
  return { ok: false, error: details ? { code, message, details } : { code, message } };
}
