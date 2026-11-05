import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseSettings } from "./supabase-settings";

export async function supabaseServer() {
  const settings = supabaseSettings();
  if (!settings) return null;
  const cookieStore = await cookies();
  return createServerClient(settings.url, settings.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        } catch {
          // Halaman Server Component menerima penyegaran sesi dari proxy.
        }
      },
    },
  });
}
