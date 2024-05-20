import Link from "next/link"
import { Logo } from "~/components/logo"

export default function WebsiteHeader() {
  return (
    <header className="flex h-14 items-center px-4 lg:px-6">
      <Link
        className="flex items-center justify-center text-xl font-extrabold tracking-tighter md:text-2xl lg:text-3xl"
        href="/"
      >
        <Logo />
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 dark:text-gray-50">
        <Link
          className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
          href="#features"
        >
          Features
        </Link>
        {/* <Link
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="#pricing"
          >
            Pricing
          </Link> */}
        {/* <Link
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="#about"
          >
            About
          </Link> */}
        {/* <Link
          className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
          href="#testimonials"
        >
          Testimonials
        </Link> */}
        <Link
          className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
          href="#contact"
        >
          Contact
        </Link>
        {/* <Link
          className="text-sm font-medium text-gray-500 underline-offset-4 hover:underline dark:text-gray-400"
          href="/login"
        >
          Login
        </Link> */}
      </nav>
    </header>
  )
}
