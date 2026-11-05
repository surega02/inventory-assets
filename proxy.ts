import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { demoMode, supabaseSettings } from "@/lib/supabase-settings";

export async function proxy(request: NextRequest) {
  const settings = supabaseSettings();
  if (!settings || demoMode()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const client = createServerClient(settings.url, settings.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  await client.auth.getClaims();
  return response;
}

export const config = { matcher: ["/inventaris/:path*", "/pengaturan/:path*", "/aset-saya/:path*", "/serah-terima/:path*", "/stok-opname/:path*", "/masuk", "/ganti-password"] };
