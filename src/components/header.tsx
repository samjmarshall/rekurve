import { Button, buttonVariants } from "./ui/button";

import Link from "next/link";
import { UserNav } from "./user-nav";
import { getServerAuthSession } from "~/server/auth";

export async function Header() {
  const session = await getServerAuthSession();

  return (
    <header className="relative z-10">
      <nav className="flex w-full items-center justify-between bg-white">
        <Link href={"/"}>
          <h1 className="z-50 py-2 pl-8 text-4xl font-extrabold tracking-tight text-blue-400">
            rekurve
          </h1>
        </Link>
        <div className="ml-12 mr-auto w-full">
          <Link
            href={"/projects"}
            className={`mx-1 ${buttonVariants({ variant: "link" })}`}
          >
            Projects
          </Link>
          <Button
            className="mx-1 cursor-default text-gray-400 hover:text-gray-400 hover:no-underline"
            variant="link"
          >
            Calendar
          </Button>
          <Button
            className="mx-1 cursor-default text-gray-400 hover:text-gray-400 hover:no-underline"
            variant="link"
          >
            View All
          </Button>
        </div>
        <div className="mr-2 flex items-center">
          {session ? (
            <UserNav user={session.user} />
          ) : (
            <Link
              href={"/api/auth/signin"}
              className={buttonVariants({ variant: "outline" })}
            >
              Login
            </Link>
          )}
        </div>
      </nav>
      <div className="m-0 h-[3px] w-full bg-gradient-to-r from-blue-400 to-[#2e026d]"></div>
      <div className="absolute -z-10 m-0 h-[2px] w-full bg-gradient-to-r from-blue-400 to-[#2e026d] blur-sm"></div>
    </header>
  );
}
