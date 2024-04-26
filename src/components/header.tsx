import { Button } from "./ui/button";
import Link from "next/link";
import { UserNav } from "./user-nav";
import { getServerAuthSession } from "~/server/auth";

export async function Header() {
  const session = await getServerAuthSession();

  return (
    <header className="relative z-10">
      <div className="flex w-full items-center justify-between bg-white">
        <Link href={"/"}>
          <h1 className="z-50 py-2 pl-8 text-4xl font-extrabold tracking-tight text-blue-400">
            rekurve
          </h1>
        </Link>
        <div className="ml-12 mr-auto w-full">
          <Link
            href={"/"}
            className="mx-1 h-10 px-4 py-2 text-sm font-medium text-primary hover:underline hover:underline-offset-4"
          >
            Projects
          </Link>
          <Button className="mx-1" variant="link">
            Calendar
          </Button>
          <Button className="mx-1" variant="link">
            View All
          </Button>
        </div>
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
      </div>
      <div className="m-0 h-[3px] w-full bg-gradient-to-r from-blue-400 to-[#2e026d]"></div>
      <div className="absolute -z-10 m-0 h-[2px] w-full bg-gradient-to-r from-blue-400 to-[#2e026d] blur-sm"></div>
    </header>
  );
}
