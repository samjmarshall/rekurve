import { getPostHogServer } from '~/lib/posthog-server'

export function register() {
  // No-op for initialization
}

export const onRequestError = async (err: Error, request: { headers: { cookie?: string | string[] } }, _context: unknown) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const posthog = getPostHogServer()
    let distinctId: string | undefined

    if (request.headers.cookie) {
      // Normalize multiple cookie arrays to string
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join('; ')
        : request.headers.cookie

      const postHogCookieMatch = /ph_phc_.*?_posthog=([^;]+)/.exec(cookieString)

      if (postHogCookieMatch?.[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1])
          const postHogData = JSON.parse(decodedCookie) as { distinct_id?: string }
          distinctId = postHogData.distinct_id
        } catch (e) {
          console.error('Error parsing PostHog cookie:', e)
        }
      }
    }

    posthog.captureException(err, distinctId)
  }
}