import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

type Props = { onCreated?: (id: string) => void; triggerLabel?: string };

export function CustomerQuickAdd({ onCreated, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "" });
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      if (!f.name.trim()) throw new Error("Nom requis");
      const { data, error } = await supabase.from("customers")
        .insert({ name: f.name, phone: f.phone || null, email: f.email || null, address: f.address || null })
        .select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Client créé");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["pos-customers"] });
      onCreated?.(id);
      setOpen(false);
      setF({ name: "", phone: "", email: "", address: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm"><UserPlus className="mr-1 h-3.5 w-3.5" />{triggerLabel ?? "Nouveau"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom *</Label><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><Label>Adresse</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
