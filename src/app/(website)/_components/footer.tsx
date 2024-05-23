import Link from "next/link"

export default function WebsiteFooter() {
  return (
    <footer className="flex w-full shrink-0 flex-col items-center gap-2 px-4 py-6 text-xs text-gray-500 sm:flex-row md:px-6">
      <span>© 2024 rekurve. All rights reserved.</span>
      <nav className="flex gap-4 sm:ml-auto sm:gap-6">
        {/* <Link className="underline-offset-4 hover:underline" href="#">
      Terms of Service
    </Link> */}
        <Link className="underline-offset-4 hover:underline" href="/privacy">
          Privacy Policy
        </Link>
      </nav>
    </footer>
  )
}
