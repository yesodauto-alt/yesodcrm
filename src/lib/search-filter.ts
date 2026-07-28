const SEARCH_COLUMNS = ["nome", "empresa", "email", "telefone", "whatsapp"] as const;

/**
 * PostgREST `.or()` filter strings are parsed: commas separate clauses and
 * parentheses/periods are syntax. Strip those (plus wildcards and quotes) from
 * user input so a search term can never alter the filter structure.
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[,().*%\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Builds a safe PostgREST `.or()` filter for the standard search columns. */
export function buildSearchFilter(
  input: string,
  columns: readonly string[] = SEARCH_COLUMNS,
): string | null {
  const term = sanitizeSearchTerm(input);
  if (!term) return null;
  return columns.map((c) => `${c}.ilike.%${term}%`).join(",");
}
