import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSettings } from "./supabase-settings";

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function authOperator() {
  const settings = supabaseSettings();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return settings && secret ? createClient(settings.url, secret, options) : null;
}

export function passwordVerifier() {
  const settings = supabaseSettings();
  return settings ? createClient(settings.url, settings.key, options) : null;
}

export function internalEmail(username: string) {
  const domain = process.env.ASSETS_AUTH_DOMAIN?.trim().toLowerCase();
  return domain && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain) ? `${username}@${domain}` : null;
}
