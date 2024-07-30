import Link from "next/link"
import { Logo } from "~/components/logo"

export default function WebsiteHeader() {
  return (
    <header className="flex h-14 items-center px-4 lg:px-6">
      <Link
        className="flex items-center justify-center text-xl font-extrabold tracking-tighter md:text-2xl lg:text-3xl"
        href="/"
        title="Home"
      >
        <Logo />
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <Link
          className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
          href="/#features"
          title="Features"
        >
          Features
        </Link>
        <Link
          className="text-sm font-medium underline-offset-4 hover:underline"
          href="/#pricing"
          title="Pricing"
        >
          Pricing
        </Link>
        {/* <Link
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="/#about"
            title="About"
          >
            About
          </Link> */}
        {/* <Link
          className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
          href="#testimonials"
          title="Testimonials"
        >
          Testimonials
        </Link> */}
        <Link
          className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
          href="/#contact"
          title="Contact"
        >
          Contact
        </Link>
        {/* <Link
          className="text-sm font-medium text-gray-500 underline-offset-4 hover:underline"
          href="/login"
          title="Login"
        >
          Login
        </Link> */}
      </nav>
    </header>
  )
}
