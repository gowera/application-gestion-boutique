import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [] });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("categories").insert({ name: form.name, slug: form.slug || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Catégorie créée"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); setOpen(false); setForm({ name: "", slug: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); },
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Catégories</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Slug</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{cats?.map((c) => <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell className="text-muted-foreground text-sm">{c.slug ?? "—"}</TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <div className="space-y-3"><div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
