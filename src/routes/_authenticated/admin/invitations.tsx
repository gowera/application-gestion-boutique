import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { LocalUnavailable } from "@/components/admin/local-unavailable";

export const Route = createFileRoute("/_authenticated/admin/invitations")({ component: RoutePage });

function RoutePage() {
  if (typeof window !== "undefined" && window.conetecDesktop) return <LocalUnavailable feature="Invitations" />;
  return <Page />;
}

function Page() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("admin");
  const { data: invitations = [] } = useQuery({ queryKey: ["invitations"], queryFn: async () => (await supabase.from("invitations").select("*").order("created_at", { ascending: false })).data ?? [] });

  const invite = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("invitations").insert({ email: email || null, phone: phone || null, role, token, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString() });
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      toast.success("Invitation créée");
      qc.invalidateQueries({ queryKey: ["invitations"] });
      const link = `${window.location.origin}/magic-link/${token}`;
      if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, vous êtes invité à rejoindre Gestion Stock. Ouvrez ce lien : ${link}`)}`, "_blank", "noopener,noreferrer");
      if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent("Invitation Gestion Stock")}&body=${encodeURIComponent(`Bonjour, vous êtes invité à rejoindre Gestion Stock. Ouvrez ce lien : ${link}`)}`;
      setEmail(""); setPhone(""); setRole("admin");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Invitations</h1>
      <Card><CardContent className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2"><div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.com" /></div><div><Label>WhatsApp</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 99 000 0000" /></div></div>
        <div><Label>Rôle</Label><Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="cashier">Caissier</SelectItem></SelectContent></Select></div>
        <Button onClick={() => invite.mutate()} disabled={invite.isPending}>Créer l’invitation</Button>
      </CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Téléphone</TableHead><TableHead>Rôle</TableHead><TableHead>Expire le</TableHead></TableRow></TableHeader><TableBody>{invitations.map((invitation: { id: string; email?: string | null; phone?: string | null; role: string; expires_at: string }) => <TableRow key={invitation.id}><TableCell>{invitation.email ?? "—"}</TableCell><TableCell>{invitation.phone ?? "—"}</TableCell><TableCell>{invitation.role}</TableCell><TableCell>{formatDate(invitation.expires_at, true)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  );
}
