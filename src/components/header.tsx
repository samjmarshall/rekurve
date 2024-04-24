import Link from "next/link";
import { UserNav } from "./user-nav";
import { getServerAuthSession } from "~/server/auth";

export async function Header() {
  const session = await getServerAuthSession();

  return (
    <header className="flex w-full items-center justify-between bg-gradient-to-r from-blue-400 to-[#2e026d] text-white">
      <Link href={"/"}>
        <h1 className="py-2 pl-8 text-4xl font-extrabold tracking-tight">
          rekurve
        </h1>
      </Link>
      <div className="mr-2 flex items-center">
        {session ? (
          <UserNav user={session.user} />
        ) : (
          <Link
            href={"/api/auth/signin"}
            className="rounded bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
