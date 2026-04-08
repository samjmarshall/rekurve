"use client";

import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { authClient } from "~/lib/auth-client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={loading}
      data-testid="settings-sign-out"
    >
      {loading ? "Signing out\u2026" : "Sign out"}
    </Button>
  );
}
