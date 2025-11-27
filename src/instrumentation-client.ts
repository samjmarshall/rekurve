import { env } from './env';
import posthog from 'posthog-js'

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  defaults: '2025-05-24'
});
