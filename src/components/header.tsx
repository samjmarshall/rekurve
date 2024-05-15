import { Button, buttonVariants } from "./ui/button"

import Link from "next/link"
import { UserNav } from "./user-nav"
import { getServerAuthSession } from "~/server/auth"

export async function Header() {
  const session = await getServerAuthSession()

  return (
    <header>
      <nav className="flex w-full items-center justify-between bg-white">
        <Link href="/dashboard">
          <h1 className="py-2 pl-4 text-4xl font-extrabold tracking-tight text-purple lg:pl-6">
            rekurve
          </h1>
        </Link>
        <div className="flex w-full gap-x-1">
          <Link
            href="/projects"
            className={`ml-auto ${buttonVariants({ variant: "link" })}`}
          >
            Projects
          </Link>
          <Button
            className="cursor-default text-gray-400 hover:text-gray-400 hover:no-underline"
            variant="link"
          >
            Calendar
          </Button>
          <Button
            className="cursor-default text-gray-400 hover:text-gray-400 hover:no-underline"
            variant="link"
          >
            View All
          </Button>
          <div className="mx-3">
            {session ? <UserNav user={session.user} /> : null}
          </div>
        </div>
      </nav>
    </header>
  )
}
