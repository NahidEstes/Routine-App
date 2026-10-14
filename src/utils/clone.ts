// Persisted models contain only JSON-safe primitives. Works on Hermes and web.
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
