import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLead, updateLead, deleteLead } from "@/lib/leads.functions";
import { LeadForm, type LeadFormValues } from "./lead-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";
import { AiAnalysis } from "@/components/leads/ai-analysis";
import { LeadIndicators } from "@/components/leads/lead-indicators";
import { SummaryCards } from "@/components/leads/summary-cards";
import { FollowUpsTab } from "@/components/leads/follow-ups-tab";
import { ObservationsTab } from "@/components/leads/observations-tab";
import { ConversationsTab } from "@/components/leads/conversations-tab";
import { TimelineTab } from "@/components/leads/timeline-tab";

export function LeadDrawer({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const fetchLead = useServerFn(getLead);
  const update = useServerFn(updateLead);
  const del = useServerFn(deleteLead);

  const { data } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead({ data: { id: id! } }),
    enabled: !!id && open,
  });

  const updateMut = useMutation({
    mutationFn: (v: LeadFormValues) => update({ data: { id: id!, ...v } as any }),
    onSuccess: () => {
      toast.success("Lead atualizado");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => del({ data: { id: id! } }),
    onSuccess: () => {
      toast.success("Lead removido");
      onOpenChange(false);
      qc.invalidateQueries();
    },
  });

  const lead = data?.lead;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex flex-col gap-2">
            <SheetTitle>{lead?.nome ?? "Lead"}</SheetTitle>
            {lead && <LeadIndicators lead={lead as any} />}
          </div>
        </SheetHeader>
        {lead && id && (
          <div className="mt-4 space-y-4">
            <SummaryCards lead={lead as any} />
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="ai">IA</TabsTrigger>
                <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="obs">Obs.</TabsTrigger>
                <TabsTrigger value="conv">Conversas</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                <LeadForm
                  initial={lead}
                  onSubmit={(v) => updateMut.mutate(v)}
                  submitting={updateMut.isPending}
                />
                <div className="border-t mt-6 pt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { if (confirm("Excluir este lead?")) delMut.mutate(); }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir lead
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="ai" className="mt-4">
                <AiAnalysis lead={lead as any} />
              </TabsContent>
              <TabsContent value="tasks" className="mt-4">
                <TaskList leadId={id} />
              </TabsContent>
              <TabsContent value="followups" className="mt-4">
                <FollowUpsTab leadId={id} />
              </TabsContent>
              <TabsContent value="obs" className="mt-4">
                <ObservationsTab leadId={id} />
              </TabsContent>
              <TabsContent value="conv" className="mt-4">
                <ConversationsTab leadId={id} />
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <TimelineTab leadId={id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
