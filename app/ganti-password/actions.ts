"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { accountAccess, accountDestination } from "@/lib/account-access";
import { validPassword } from "@/lib/account-fields";
import { authOperator, internalEmail, passwordVerifier } from "@/lib/supabase-operator";

export async function changeTemporaryPassword(form: FormData) {
  const access = await accountAccess();
  if (access.kind !== "signed-in") redirect("/masuk");
  if (!access.needsPassword) redirect(accountDestination(access));
  const current = form.get("current");
  const password = form.get("password");
  if (typeof current !== "string" || !current || current.length > 1024) redirect("/ganti-password?status=incorrect");
  if (!validPassword(password) || password === current || password !== form.get("confirmation")) {
    redirect("/ganti-password?status=invalid");
  }
  const email = internalEmail(access.username);
  const operator = authOperator();
  const verifier = passwordVerifier();
  if (!email || !operator || !verifier) redirect("/ganti-password?status=unavailable");

  const { data, error } = await verifier.auth.signInWithPassword({ email, password: current });
  if (error || data.user?.id !== access.id) redirect("/ganti-password?status=incorrect");
  const result = await operator.auth.admin.updateUserById(access.id, {
    password,
    app_metadata: { assets_password_changed: { nonce: randomUUID(), version: access.version } },
  });
  if (result.error) {
    await verifier.auth.signOut({ scope: "local" });
    redirect("/ganti-password?status=unavailable");
  }
  await access.client.auth.signOut({ scope: "local" });
  redirect("/masuk?status=password-changed");
}
