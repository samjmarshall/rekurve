"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import { Input } from "~/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { NativeIcon } from "~/icons/bento-icons";
import { authClient } from "~/lib/auth-client";
import { analytics } from "~/lib/posthog";

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (error) {
        setError(error.message ?? "Failed to send verification code");
        return;
      }

      analytics.auth.identify(email);
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (error) {
        setError(error.message ?? "Invalid or expired code");
        return;
      }

      analytics.auth.loginSuccess();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (error) {
        setError(error.message ?? "Failed to resend code");
        return;
      }

      setOtp("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      data-testid="login-page"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <NativeIcon className="size-8 text-primary" />
          <span className="font-bold font-mono text-xl dark:text-white">
            REKURVE
          </span>
        </div>

        <Card className="overflow-hidden hover:shadow-sm">
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <form onSubmit={handleSendOtp} data-testid="login-email-form">
                  <CardHeader>
                    <CardTitle className="text-foreground text-xl">
                      Sign in
                    </CardTitle>
                    <CardDescription>
                      Enter your email to receive a verification code
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email" className="font-medium text-sm">
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                        disabled={loading}
                        aria-invalid={!!error}
                        aria-describedby={error ? "email-error" : undefined}
                        data-testid="login-email-input"
                      />
                    </div>

                    {error && (
                      <p
                        id="email-error"
                        className="text-destructive text-sm"
                        role="status"
                        aria-live="polite"
                        data-testid="login-error"
                      >
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={loading}
                      data-testid="login-continue-button"
                    >
                      {loading ? "Sending..." : "Continue"}
                    </Button>
                  </CardContent>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <form onSubmit={handleVerifyOtp} data-testid="login-otp-form">
                  <CardHeader>
                    <CardTitle className="text-foreground text-xl">
                      Check your email
                    </CardTitle>
                    <CardDescription>
                      We sent a 6-digit code to{" "}
                      <span
                        className="font-medium text-foreground"
                        data-testid="login-otp-email"
                      >
                        {email}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="flex justify-center"
                      data-testid="login-otp-input"
                    >
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        disabled={loading}
                        autoFocus
                        aria-label="Verification code"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error && (
                      <p
                        id="otp-error"
                        className="text-destructive text-sm"
                        role="status"
                        aria-live="polite"
                        data-testid="login-error"
                      >
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={loading || otp.length !== 6}
                      data-testid="login-verify-button"
                    >
                      {loading ? "Verifying..." : "Verify"}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setOtp("");
                          setError("");
                        }}
                        className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                        data-testid="login-back-button"
                      >
                        <ArrowLeft className="size-3.5" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
                        data-testid="login-resend-button"
                      >
                        Resend code
                      </button>
                    </div>
                  </CardContent>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </main>
  );
}
