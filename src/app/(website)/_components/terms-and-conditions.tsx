import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";

import Link from "next/link";

export default function TermsAndConditions() {
  return (
    <HoverCard>
      <HoverCardTrigger className="underline underline-offset-2">
        Terms &amp; Conditions
      </HoverCardTrigger>
      <HoverCardContent className="w-80 max-w-full space-y-2">
        <span className="text-base font-semibold">Terms &amp; Conditions</span>
        <p>
          You may unsubscribe from any communications at any time. For more
          information on how to unsubscribe, our privacy practices, and how we
          are committed to protecting and respecting your privacy, please visit
          the{" "}
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
      </HoverCardContent>
    </HoverCard>
  );
}
