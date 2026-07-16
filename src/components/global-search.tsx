import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { searchLeads } from "@/lib/leads.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATUS_LABELS } from "@/lib/types";
import { useNavigate } from "@tanstack/react-router";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const search = useServerFn(searchLeads);
  const navigate = useNavigate();

  async function onChange(v: string) {
    setQ(v);
    if (v.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const r = await search({ data: { q: v } });
    setResults(r);
    setOpen(true);
  }

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Buscar leads (nome, empresa, email, telefone)"
            className="pl-8"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between text-sm border-b last:border-0"
              onClick={() => {
                setOpen(false);
                setQ("");
                navigate({ to: "/leads", search: { open: r.id } as any });
              }}
            >
              <div>
                <div className="font-medium">{r.nome}</div>
                <div className="text-xs text-muted-foreground">{r.empresa ?? "—"} · {r.email ?? r.telefone ?? ""}</div>
              </div>
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
