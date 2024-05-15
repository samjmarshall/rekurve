import { env } from "~/env";
import logger from "~/server/logger";

interface ReCAPTCHAResponse {
  success: boolean; // whether this request was a valid reCAPTCHA token for your site
  score: number; // the score for this request (0.0 - 1.0)
  action: string; // the action name for this request (important to verify)
  challenge_ts: string; // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
  hostname: string; // the hostname of the site where the reCAPTCHA was solved
  "error-codes"?: [unknown]; // optional
}

export const verifyRecaptcha = async (
  token: string,
): Promise<ReCAPTCHAResponse> => {
  const secretKey = env.RECAPTCHA_SECRET_KEY;
  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
    { method: "POST" },
  );
  const data = (await response.json()) as ReCAPTCHAResponse;
  // eslint-disable-next-line no-console
  logger.debug({
    message: "reCAPTCHA verification",
    data,
  });

  return data;
};
