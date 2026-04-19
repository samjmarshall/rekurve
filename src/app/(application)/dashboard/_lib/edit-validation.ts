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
  const empty = body.trim().length === 0;
  const tooLong = body.length > max;
  return { empty, tooLong, valid: !empty && !tooLong };
}
