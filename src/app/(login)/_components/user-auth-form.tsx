import { type HTMLAttributes, type SyntheticEvent } from "react"

import { Button } from "~/components/ui/button"
import { Icons } from "~/components/icons"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"

interface UserAuthFormProps extends HTMLAttributes<HTMLDivElement> {
  googleSubmit: () => void
  emailSubmit?: (event: SyntheticEvent) => void
  isLoading: boolean
}

export function UserAuthForm({
  className,
  isLoading,
  googleSubmit,
  emailSubmit,
  ...props
}: UserAuthFormProps) {
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {emailSubmit && (
        <form onSubmit={emailSubmit}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
              />
            </div>
            <Button
              disabled={isLoading}
              title="Continue with Email"
              rel="nofollow"
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue with Email
            </Button>
          </div>
        </form>
      )}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {emailSubmit ? "Or " : null}continue with
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        type="button"
        onClick={googleSubmit}
        disabled={isLoading}
        title="Login with Google"
        rel="nofollow"
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}{" "}
        Google
      </Button>
    </div>
  )
}
