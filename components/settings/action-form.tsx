"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";

type Feedback = { message?: string };

export function SettingsActionForm({ action, children }: {
  action: (previous: Feedback, form: FormData) => Promise<Feedback>;
  children: ReactNode;
}) {
  const [feedback, submit, pending] = useActionState(action, {});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    startTransition(() => submit(fields));
  }

  return (
    <form action={submit} onSubmit={handleSubmit} className="settings-form" aria-busy={pending}>
      {feedback.message && <p className="settings-error" role="alert">{feedback.message}</p>}
      <fieldset disabled={pending}>{children}</fieldset>
      {pending && <p className="muted" role="status">Sedang menyimpan…</p>}
    </form>
  );
}
