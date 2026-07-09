import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/messages")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["quote-requests"],
    queryFn: async () => (await supabase.from("quote_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const mark = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "read" | "replied" | "closed" }) => {
      const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mis à jour"); qc.invalidateQueries({ queryKey: ["quote-requests"] }); },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Demandes de devis</h1>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Nom</TableHead><TableHead>Téléphone</TableHead><TableHead>Service</TableHead><TableHead>Message</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {data?.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm">{formatDate(r.created_at, true)}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell><a href={`tel:${r.phone}`} className="underline">{r.phone}</a></TableCell>
              <TableCell>{r.service}</TableCell>
              <TableCell className="max-w-sm text-sm text-muted-foreground truncate">{r.message ?? "—"}</TableCell>
              <TableCell><Badge variant={r.status === "new" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {r.status === "new" && <Button size="sm" variant="ghost" onClick={() => mark.mutate({ id: r.id, status: "read" })}>Lu</Button>}
                  {r.status !== "closed" && <Button size="sm" variant="ghost" onClick={() => mark.mutate({ id: r.id, status: "closed" })}>Fermer</Button>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  );
}
