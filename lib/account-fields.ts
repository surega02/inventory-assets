export function normalizeUsername(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export const usernamePattern = /^[a-z0-9._-]{3,32}$/;
export const PASSWORD_MIN_LENGTH = 8;

export function validPassword(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && [...value].length >= PASSWORD_MIN_LENGTH && new TextEncoder().encode(value).length <= 72;
}
