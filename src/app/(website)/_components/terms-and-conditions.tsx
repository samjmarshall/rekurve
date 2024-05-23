import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"

import { Button } from "~/components/ui/button"
import Link from "next/link"

export default function TermsAndConditions() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 text-xs text-gray-500">
          Terms &amp; Conditions
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terms &amp; Conditions</DialogTitle>
        </DialogHeader>
        <article className="space-y-4 text-gray-500">
          <p>
            You may unsubscribe from any communications at any time. For more
            information on how to unsubscribe, our privacy practices, and how we
            are committed to protecting and respecting your privacy, please
            visit the{" "}
            <Link className="underline underline-offset-2" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            This site is protected by reCAPTCHA and the Google{" "}
            <Link
              className="underline underline-offset-2"
              href="https://policies.google.com/privacy"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              className="underline underline-offset-2"
              href="https://policies.google.com/terms"
            >
              Terms of Service
            </Link>{" "}
            apply.
          </p>
          <p>
            By clicking <strong>Join the Waitlist</strong>, you agree to the
            Privacy Policies and the Terms of Service above.
          </p>
        </article>
      </DialogContent>
    </Dialog>
  )
}
