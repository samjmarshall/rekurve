"use client";

import { useFormStatus } from "react-dom";
import { Button } from "~/components/ui/Button";
import { signOutAction } from "./sign-out-action";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      data-testid="settings-sign-out"
    >
      {pending ? "Signing out\u2026" : "Sign out"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  );
}
