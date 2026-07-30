/** Utilitários de exibição de números e nomes de contatos do WhatsApp. */

export function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

/** Retorna apenas telefones plausíveis; IDs internos da Evolution não passam. */
export function validDisplayPhone(value?: string | null): string | null {
  const digits = onlyDigits(value);
  if (digits.length < 8 || digits.length > 13) return null;
  return digits;
}

/** Formata um número em padrão legível (BR quando possível). */
export function formatPhone(value?: string | null): string {
  const d = onlyDigits(value);
  if (!d) return "—";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    const meio = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const fim = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `+55 (${ddd}) ${meio}-${fim}`;
  }
  if (d.length === 10 || d.length === 11) {
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    const meio = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const fim = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `(${ddd}) ${meio}-${fim}`;
  }
  return `+${d}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMeaningfulName(name?: string | null) {
  if (!name) return false;
  const n = name.trim();
  if (!n) return false;
  if (UUID_RE.test(n)) return false;
  if (/^\d+$/.test(n)) return false;
  return true;
}

/** Nome real do contato — nunca exibe IDs internos. */
export function contactDisplayName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    if (isMeaningfulName(c)) return c!.trim();
  }
  return "Contato sem nome";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
