import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/purchases")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["purchases"], queryFn: async () => (await supabase.from("purchases").select("*, suppliers(name)").order("created_at", { ascending: false })).data ?? [] });
  const recv = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("receive_purchase", { _purchase_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Achat reçu, stock mis à jour"); qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Achats fournisseurs</h1>
      <Card><CardContent className="p-4 text-sm text-muted-foreground">Créez des bons d'achat depuis un futur formulaire enrichi. Cette liste vous permet de valider la réception (le stock s'incrémente automatiquement).</CardContent></Card>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Fournisseur</TableHead><TableHead>Statut</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {!data?.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun achat enregistré.</TableCell></TableRow>}
            {data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell>{(p.suppliers as { name: string } | null)?.name ?? "—"}</TableCell>
                <TableCell><Badge>{p.status}</Badge></TableCell>
                <TableCell>${Number(p.total_usd).toFixed(2)}</TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell>{p.status !== "received" && <Button size="sm" onClick={() => recv.mutate(p.id)}>Réceptionner</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
