"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { authClient } from "~/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut();
    router.push("/login");
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
