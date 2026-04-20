export const MAX_BODY = 1600;

export interface EditBodyValidation {
  empty: boolean;
  tooLong: boolean;
  valid: boolean;
}

export function validateEditBody(
  body: string,
  max: number = MAX_BODY,
): EditBodyValidation {
  const trimmed = body.trim();
  const empty = trimmed.length === 0;
  const tooLong = trimmed.length > max;
  return { empty, tooLong, valid: !empty && !tooLong };
}
