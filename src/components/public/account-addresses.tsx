import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Star, Pencil } from "lucide-react";

type Address = {
  id: string;
  label: string;
  city: string | null;
  address: string;
  phone: string | null;
  is_default: boolean;
};

const EMPTY = { id: "", label: "Domicile", city: "", address: "", phone: "", is_default: false };

export function AccountAddresses({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);

  const { data: addresses } = useQuery({
    queryKey: ["account", "addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("id, label, city, address, phone, is_default")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Address[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.address.trim()) throw new Error("Adresse requise");
      const payload = {
        user_id: userId,
        label: form.label.trim() || "Adresse",
        city: form.city.trim() || null,
        address: form.address.trim(),
        phone: form.phone.trim() || null,
        is_default: form.is_default,
      };
      if (form.is_default) {
        await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", userId);
      }
      const { error } = form.id
        ? await supabase.from("customer_addresses").update(payload).eq("id", form.id)
        : await supabase.from("customer_addresses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adresse enregistrée");
      setForm({ ...EMPTY });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["account", "addresses", userId] });
    },
    onError: (e: Error) => toast.error(e.message || "Enregistrement impossible"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adresse supprimée");
      qc.invalidateQueries({ queryKey: ["account", "addresses", userId] });
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", userId);
      const { error } = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account", "addresses", userId] }),
  });

  return (
    <Card className="min-w-0">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-display text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-energy" />Mes adresses de livraison
          </h2>
          <Button size="sm" variant={open ? "outline" : "default"} onClick={() => { setForm({ ...EMPTY }); setOpen(!open); }}>
            <Plus className="mr-2 h-4 w-4" />{open ? "Fermer" : "Ajouter"}
          </Button>
        </div>

        {open && (
          <form
            className="mt-4 space-y-3 rounded-lg border p-3 sm:p-4"
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Libellé</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Domicile, Bureau…" /></div>
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Goma…" /></div>
            </div>
            <div><Label>Adresse *</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="Avenue, quartier, repère…" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+243 …" /></div>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                Adresse par défaut
              </label>
            </div>
            <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
              {save.isPending ? "Enregistrement…" : form.id ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </form>
        )}

        {!addresses?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune adresse enregistrée pour le moment.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className="min-w-0 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.label}</span>
                  {a.is_default && <Badge>Par défaut</Badge>}
                </div>
                <div className="mt-1 break-words text-sm text-muted-foreground">
                  {[a.city, a.address].filter(Boolean).join(" — ")}
                  {a.phone ? <div>{a.phone}</div> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setForm({ id: a.id, label: a.label, city: a.city ?? "", address: a.address, phone: a.phone ?? "", is_default: a.is_default }); setOpen(true); }}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />Modifier
                  </Button>
                  {!a.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(a.id)}>
                      <Star className="mr-1 h-3.5 w-3.5" />Par défaut
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(a.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
