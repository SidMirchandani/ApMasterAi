export interface UserSearchSource {
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  inferredState?: string | null;
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildUserSearchFields(src: UserSearchSource): {
  searchName: string;
  searchEmail: string;
  searchState: string;
  searchBlob: string;
} {
  const searchName = normalizeText(src.displayName || src.username || "");
  const searchEmail = normalizeText(src.email || "");
  const searchState = normalizeText(src.inferredState || "");
  const searchBlob = [searchName, searchEmail, searchState].filter(Boolean).join(" ");
  return {
    searchName,
    searchEmail,
    searchState,
    searchBlob,
  };
}

