/**
 * When IP/geo cannot resolve a US state, we store this value. It is not a US state abbreviation.
 */
export const INTERNATIONAL_INFERRED_STATE = "International" as const;

export function isUsStateAbbreviation(st: unknown): boolean {
  return typeof st === "string" && /^[A-Z]{2}$/i.test(st.trim());
}

export function isInternationalInferredState(st: unknown): boolean {
  return typeof st === "string" && st.trim().toLowerCase() === "international";
}

/** US state code or explicit international placeholder — geo resolution is complete. */
export function hasResolvedInferredRegion(st: unknown): boolean {
  return isUsStateAbbreviation(st) || isInternationalInferredState(st);
}
