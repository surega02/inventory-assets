"use server";

import { redirect } from "next/navigation";
import { normalizeUsername, usernamePattern } from "@/lib/account-fields";
import { supabaseServer } from "@/lib/supabase-server";
import { internalEmail } from "@/lib/supabase-operator";
import { demoMode } from "@/lib/supabase-settings";

export async function signIn(form: FormData) {
  if (demoMode()) redirect("/inventaris");
  const username = normalizeUsername(form.get("username"));
  const password = form.get("password");
  const email = internalEmail(username);
  const client = await supabaseServer();
  if (!client || !email) redirect("/masuk?status=unavailable");

  if (!usernamePattern.test(username) || typeof password !== "string" || !password || password.length > 1024) {
    redirect("/masuk?status=invalid");
  }

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/masuk?status=invalid");
  redirect("/masuk");
}

export async function signOut() {
  const client = await supabaseServer();
  await client?.auth.signOut({ scope: "local" });
  redirect("/masuk");
}
