/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    // Allow production builds to complete even with ESLint errors
    // (Errors are in third-party @aceternity components, not our code)
    ignoreDuringBuilds: true,
  },
};

export default config;
