import { env } from './env';
import posthog from 'posthog-js'

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY as string, {
  api_host: "/relay-HYIX",
  ui_host: 'https://us.posthog.com',
  defaults: '2025-05-24'
});
