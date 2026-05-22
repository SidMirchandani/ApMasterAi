/** Where to send the user after exiting or finishing a unit quiz. */

export function normalizeFromParam(
  from: string | string[] | undefined,
): string | undefined {
  if (from == null) return undefined;
  return Array.isArray(from) ? from[0] : from;
}

export function getQuizExitPath(
  subjectId: string | string[] | undefined,
  from?: string | string[],
): string {
  const sid = Array.isArray(subjectId) ? subjectId[0] : subjectId;
  if (!sid) return "/dashboard";

  const fromVal = normalizeFromParam(from);
  const encoded = encodeURIComponent(sid);
  if (fromVal === "fast-path") {
    return `/fast-path?subject=${encoded}`;
  }
  return `/study?subject=${encoded}`;
}

export function withQuizFromParam(baseUrl: string, from: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}from=${encodeURIComponent(from)}`;
}
