import { getSession } from "~/lib/session";
import { SignOutButton } from "./_components/sign-out-button";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="font-semibold text-lg">Settings</h1>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-muted-foreground text-sm">Email</p>
          <p className="font-medium text-sm" data-testid="settings-user-email">
            {session?.user.email}
          </p>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
