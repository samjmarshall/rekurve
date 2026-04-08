// Australian mobile: 04xx xxx xxx or +614xx xxx xxx
// Strips spaces/dashes/parens before matching
export const AU_MOBILE_REGEX = /^(\+?61|0)4\d{8}$/;

export function isValidAuMobile(value: string): boolean {
  const stripped = value.replace(/[\s\-()]/g, "");
  return AU_MOBILE_REGEX.test(stripped);
}
