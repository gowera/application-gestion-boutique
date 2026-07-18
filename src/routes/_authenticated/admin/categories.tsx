import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [migrationCategory, setMigrationCategory] = useState<string>("");
  const [form, setForm] = useState({ name: "", slug: "" });
  const { data: cats = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("*, products(id)").order("name")).data ?? [] });
  const { data: allCategories = [] } = useQuery({ queryKey: ["all-categories"], queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [] });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("categories").insert({ name: form.name, slug: form.slug || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Catégorie créée"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); setOpen(false); setForm({ name: "", slug: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async ({ id, migrationId }: { id: string; migrationId: string | null }) => {
      if (migrationId) {
        const { error } = await supabase.from("products").update({ category_id: migrationId }).eq("category_id", id);
        if (error) throw error;
      }
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); setDeleteTarget(null); },
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Catégories</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Slug</TableHead><TableHead>Produits</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{cats?.map((c) => <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell className="text-muted-foreground text-sm">{c.slug ?? "—"}</TableCell><TableCell>{Array.isArray((c as { products?: unknown[] }).products) ? (c as { products: unknown[] }).products.length : 0}</TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ id: c.id, name: c.name }); setMigrationCategory(""); }}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer la catégorie</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Cette catégorie est associée à des produits. Choisissez une catégorie de migration avant la suppression.</p>
            <Label>Catégorie de destination</Label>
            <Select value={migrationCategory} onValueChange={setMigrationCategory}>
              <SelectTrigger><SelectValue placeholder="Conserver sans catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucune migration</SelectItem>
                {allCategories.filter((item) => item.id !== deleteTarget?.id).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteTarget && del.mutate({ id: deleteTarget.id, migrationId: migrationCategory || null })} disabled={del.isPending}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <div className="space-y-3"><div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Éclairage" /></div><div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="eclairage" /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
