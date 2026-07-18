import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/trash")({ component: Page });

type TrashRow = {
  id: string;
  table_name: string;
  entity_name: string | null;
  deleted_at: string;
};

function Page() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<TrashRow[]>({
    queryKey: ["trash"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_trash_items");
      return (data ?? []) as TrashRow[];
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("restore_trash_item", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Élément restauré"); qc.invalidateQueries({ queryKey: ["trash"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("purge_trash_item", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Élément supprimé définitivement"); qc.invalidateQueries({ queryKey: ["trash"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Corbeille</h1>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Entité</TableHead><TableHead>Type</TableHead><TableHead>Supprimé le</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.entity_name ?? "—"}</TableCell><TableCell><Badge variant="secondary">{row.table_name}</Badge></TableCell><TableCell>{formatDate(row.deleted_at, true)}</TableCell><TableCell className="space-x-2"><Button size="sm" variant="outline" onClick={() => restore.mutate(row.id)}>Restaurer</Button><Button size="sm" variant="destructive" onClick={() => purge.mutate(row.id)}>Supprimer</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  );
}
