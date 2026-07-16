import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllLeads, updateLeadStatus } from "@/lib/leads.functions";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus, type Lead } from "@/lib/types";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LeadDrawer } from "@/components/leads/lead-drawer";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Yesod CRM" }] }),
  component: Pipeline,
});

function Pipeline() {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listAllLeads);
  const updateStatus = useServerFn(updateLeadStatus);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Lead | null>(null);

  const { data: leads = [] } = useQuery({ queryKey: ["allLeads"], queryFn: () => fetchLeads() });

  const move = useMutation({
    mutationFn: (v: { id: string; status: LeadStatus }) => updateStatus({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["allLeads"] });
      const prev = qc.getQueryData<any[]>(["allLeads"]) ?? [];
      qc.setQueryData(["allLeads"], prev.map((l) => (l.id === v.id ? { ...l, status: v.status } : l)));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(["allLeads"], ctx.prev);
      toast.error("Falha ao mover lead");
    },
    onSettled: () => qc.invalidateQueries(),
  });

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const status = String(e.over.id) as LeadStatus;
    const lead = (leads as Lead[]).find((l) => l.id === id);
    if (lead && lead.status !== status) move.mutate({ id, status });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Arraste os cards para mudar o estágio</p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragging((leads as Lead[]).find((l) => l.id === e.active.id) ?? null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((s) => (
            <Column key={s} status={s} leads={(leads as Lead[]).filter((l) => l.status === s)} onOpen={setOpenId} />
          ))}
        </div>
        <DragOverlay>
          {dragging && <LeadCard lead={dragging} onOpen={() => {}} dragging />}
        </DragOverlay>
      </DndContext>

      <LeadDrawer id={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

function Column({ status, leads, onOpen }: { status: LeadStatus; leads: Lead[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 rounded-lg border bg-muted/30 p-2 ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="space-y-2 mt-2 min-h-[100px]">
        {leads.map((l) => <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function LeadCard({ lead, onOpen, dragging }: { lead: Lead; onOpen: (id: string) => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !dragging && onOpen(lead.id)}
      className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="text-sm font-medium truncate">{lead.nome}</div>
      <div className="text-xs text-muted-foreground truncate">{lead.empresa ?? "—"}</div>
      {lead.valor && (
        <div className="text-xs mt-1 text-emerald-500 font-medium">
          R$ {Number(lead.valor).toLocaleString("pt-BR")}
        </div>
      )}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {lead.tags.slice(0, 3).map((t, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{t}</span>
          ))}
        </div>
      )}
    </Card>
  );
}
