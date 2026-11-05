export function supabaseSettings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function demoMode() {
  if (process.env.ASSETS_DEMO === "1") return true;
  return process.env.ASSETS_DEMO !== "0" && process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
