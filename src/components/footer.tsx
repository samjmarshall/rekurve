import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  const pages = [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Features",
      href: "/#features",
    },
    {
      title: "Pricing",
      href: "/#pricing",
    },
    {
      title: "Contact",
      href: "/#booking-form",
    },
    // {
    //   title: "Blog",
    //   href: "#",
    // },
  ];

  const socials = [
    {
      title: "Facebook",
      href: "https://www.facebook.com/people/Rekurve/61560714929578/",
    },
    {
      title: "Instagram",
      href: "https://www.instagram.com/rekurve.ai/",
    },
    {
      title: "LinkedIn",
      href: "https://www.linkedin.com/company/rekurve",
    },
  ];
  const legals = [
    {
      title: "Privacy Policy",
      href: "/privacy",
    },
    {
      title: "Terms of Service",
      href: "/privacy",
    },
    {
      title: "Cookie Policy",
      href: "/privacy",
    },
  ];

  const signups = [
    // {
    //   title: "Login",
    //   href: "#",
    // },
    {
      title: "Book a demo",
      href: "/#booking-form",
    },
  ];
  return (
    <section className="relative w-full overflow-hidden border-neutral-100 border-t bg-background px-8 py-20 dark:border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between text-neutral-500 text-sm sm:flex-row md:px-8">
        <div>
          <div className="mr-0 mb-4 md:mr-4 md:flex">
            <Logo />
          </div>

          <div className="mt-2 ml-2">
            &copy; copyright Rekurve.ai {new Date().getFullYear()}. All rights
            reserved.
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 items-start gap-10 sm:mt-0 md:mt-0 lg:grid-cols-4">
          <div className="flex w-full flex-col justify-center space-y-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              Pages
            </p>
            <ul className="list-none space-y-4 text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              {pages.map((page, idx) => (
                <li key={`pages${idx}`} className="list-none">
                  <Link
                    className="transition-colors hover:text-text-neutral-800"
                    href={page.href}
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              Socials
            </p>
            <ul className="list-none space-y-4 text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              {socials.map((social, idx) => (
                <li key={`social${idx}`} className="list-none">
                  <Link
                    className="transition-colors hover:text-text-neutral-800"
                    href={social.href}
                  >
                    {social.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              Legal
            </p>
            <ul className="list-none space-y-4 text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              {legals.map((legal, idx) => (
                <li key={`legal${idx}`} className="list-none">
                  <Link
                    className="transition-colors hover:text-text-neutral-800"
                    href={legal.href}
                  >
                    {legal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <p className="font-bold text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              Register
            </p>
            <ul className="list-none space-y-4 text-neutral-600 transition-colors hover:text-text-neutral-800 dark:text-neutral-300">
              {signups.map((auth, idx) => (
                <li key={`auth${idx}`} className="list-none">
                  <Link
                    className="transition-colors hover:text-text-neutral-800"
                    href={auth.href}
                  >
                    {auth.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="inset-x-0 mt-20 bg-linear-to-b from-background to-neutral-200/50 bg-clip-text text-center font-bold text-4xl text-transparent uppercase md:text-9xl lg:text-[10rem] xl:text-[12rem] dark:to-neutral-800/50">
        Make it rain
      </p>
    </section>
  );
}
