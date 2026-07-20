import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getContact, updateContact, deleteContact } from "@/lib/contacts.functions";
import { ContactForm, type ContactFormValues } from "./contact-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function ContactDrawer({
  id,
  open,
  onOpenChange,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const fetchContact = useServerFn(getContact);
  const update = useServerFn(updateContact);
  const del = useServerFn(deleteContact);

  const { data } = useQuery({
    queryKey: ["contact", id],
    queryFn: () => fetchContact({ data: { id: id! } }),
    enabled: !!id && open,
  });

  const updateMut = useMutation({
    mutationFn: (v: ContactFormValues) => update({ data: { id: id!, ...v } as any }),
    onSuccess: () => {
      toast.success("Contato atualizado");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => del({ data: { id: id! } }),
    onSuccess: () => {
      toast.success("Contato removido");
      onOpenChange(false);
      qc.invalidateQueries();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{data?.nome ?? "Contato"}</SheetTitle>
        </SheetHeader>
        {data && (
          <div className="mt-4">
            <ContactForm initial={data} onSubmit={(v) => updateMut.mutate(v)} submitting={updateMut.isPending} />
            <div className="border-t mt-6 pt-4 flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { if (confirm("Excluir este contato?")) delMut.mutate(); }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir contato
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
