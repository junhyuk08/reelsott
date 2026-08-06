type SupabaseLikeError = { code?: string; message?: string } | null | undefined;

// PL/pgSQL's `raise exception 'message'` (no explicit ERRCODE) always surfaces
// as Postgres code P0001 — that's how our RPCs signal a deliberate, already
// user-facing Korean message (e.g. "코인이 부족합니다."). Any other code means
// something unexpected broke (permission denied, connection issues, etc.),
// and that raw driver message must never reach the user.
export function getRpcErrorMessage(error: SupabaseLikeError, fallback: string): string {
  if (error?.code === 'P0001' && error.message) return error.message;
  return fallback;
}
