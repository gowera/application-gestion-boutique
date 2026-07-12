import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { useSettings } from "@/lib/currency";
import { Mail, MessageCircle, Phone, Send, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/messages")({ component: Page });

type QuoteRequest = {
  id: string; name: string; phone: string; email: string | null;
  service: string; message: string | null; status: string; created_at: string;
};
type Reply = { id: string; channel: string; body: string; created_at: string; user_id: string | null };

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl font-bold">Devis & messages</h1>
        <p className="text-sm text-muted-foreground">Répondre aux demandes, envoyer des messages aux clients.</p>
      </div>
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Boîte de réception</TabsTrigger>
          <TabsTrigger value="broadcast">Message groupé</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4"><InboxTab /></TabsContent>
        <TabsContent value="broadcast" className="mt-4"><BroadcastTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Inbox ---------------- */

function InboxTab() {
  const [open, setOpen] = useState<QuoteRequest | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["quote-requests", filter],
    queryFn: async () => {
      const q = supabase.from("quote_requests").select("*").order("created_at", { ascending: false });
      const { data, error } = filter === "all" ? await q : await q.eq("status", filter);
      if (error) throw error;
      return (data ?? []) as QuoteRequest[];
    },
  });

  const mark = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mis à jour"); qc.invalidateQueries({ queryKey: ["quote-requests"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { v: "all", l: "Toutes" }, { v: "new", l: "Nouvelles" },
          { v: "read", l: "Lues" }, { v: "replied", l: "Répondues" }, { v: "closed", l: "Fermées" },
        ].map((f) => (
          <Button key={f.v} size="sm" variant={filter === f.v ? "default" : "outline"} onClick={() => setFilter(f.v)}>{f.l}</Button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <div className="divide-y">
          {data?.map((r) => (
            <div key={r.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => { setOpen(r); if (r.status === "new") mark.mutate({ id: r.id, status: "read" }); }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant={r.status === "new" ? "default" : "secondary"}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{r.service}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>
                    {r.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                    <span>{formatDate(r.created_at, true)}</span>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{r.message ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
          {data?.length === 0 && <div className="p-8 text-center text-muted-foreground">Aucune demande</div>}
        </div>
      </CardContent></Card>

      <ThreadDialog request={open} onClose={() => setOpen(null)} onMark={(s) => open && mark.mutate({ id: open.id, status: s })} />
    </div>
  );
}

function ThreadDialog({ request, onClose, onMark }: { request: QuoteRequest | null; onClose: () => void; onMark: (s: string) => void }) {
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<"whatsapp" | "email" | "note">("whatsapp");
  const [body, setBody] = useState("");

  const { data: replies } = useQuery({
    queryKey: ["replies", request?.id],
    enabled: !!request,
    queryFn: async () => ((await supabase.from("message_replies").select("*").eq("quote_request_id", request!.id).order("created_at")).data ?? []) as Reply[],
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!request || !body.trim()) throw new Error("Message vide");
      const { error } = await supabase.from("message_replies").insert({
        quote_request_id: request.id, channel, body,
      });
      if (error) throw error;
      if (channel === "whatsapp") {
        const phone = request.phone.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, "_blank");
      } else if (channel === "email" && request.email) {
        const subject = `Re: Demande de devis — ${request.service}`;
        window.location.href = `mailto:${request.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    },
    onSuccess: () => {
      toast.success("Réponse enregistrée");
      qc.invalidateQueries({ queryKey: ["replies", request?.id] });
      qc.invalidateQueries({ queryKey: ["quote-requests"] });
      onMark("replied");
      setBody("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!request} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Devis — {request?.name} <Badge variant="outline" className="ml-2">{request?.service}</Badge></DialogTitle>
        </DialogHeader>
        {request && <div className="space-y-4">
          <div className="rounded border bg-muted/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground mb-1">Demande initiale — {formatDate(request.created_at, true)}</div>
            <p className="whitespace-pre-wrap">{request.message ?? "—"}</p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <a href={`tel:${request.phone}`} className="hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{request.phone}</a>
              {request.email && <a href={`mailto:${request.email}`} className="hover:underline flex items-center gap-1"><Mail className="h-3 w-3" />{request.email}</a>}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {replies?.map((r) => (
              <div key={r.id} className="rounded border-l-4 border-primary bg-primary/5 p-3 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  {r.channel === "whatsapp" && <MessageCircle className="h-3 w-3" />}
                  {r.channel === "email" && <Mail className="h-3 w-3" />}
                  <span className="capitalize">{r.channel}</span>
                  <span>·</span>
                  <span>{formatDate(r.created_at, true)}</span>
                </div>
                <p className="whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex gap-2">
              {(["whatsapp", "email", "note"] as const).map((c) => (
                <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} onClick={() => setChannel(c)} disabled={c === "email" && !request.email}>
                  {c === "whatsapp" && <MessageCircle className="mr-1 h-3 w-3" />}
                  {c === "email" && <Mail className="mr-1 h-3 w-3" />}
                  <span className="capitalize">{c}</span>
                </Button>
              ))}
            </div>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder={channel === "note" ? "Note interne (non envoyée)" : `Bonjour ${request.name}, merci pour votre demande…`} />
            {settings?.shop_name && channel !== "note" && (
              <p className="text-xs text-muted-foreground">Signature auto: — {settings.shop_name}</p>
            )}
          </div>
        </div>}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onMark("closed")}>Fermer le ticket</Button>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending || !body.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {channel === "note" ? "Enregistrer" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Broadcast ---------------- */

function BroadcastTab() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: customers } = useQuery({
    queryKey: ["customers-broadcast"],
    queryFn: async () => ((await supabase.from("customers").select("id,name,phone,email").eq("is_archived", false).order("name")).data ?? []),
  });

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    setSelected(selected.size === customers?.length ? new Set() : new Set(customers?.map((c) => c.id) ?? []));
  };

  const sendWhatsApp = () => {
    if (!body.trim()) return toast.error("Message vide");
    const targets = customers?.filter((c) => selected.has(c.id) && c.phone) ?? [];
    if (targets.length === 0) return toast.error("Aucun destinataire avec téléphone");
    targets.forEach((c, i) => {
      setTimeout(() => {
        const phone = (c.phone ?? "").replace(/\D/g, "");
        const text = body.replace(/\{nom\}/g, c.name);
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
      }, i * 400);
    });
    toast.success(`${targets.length} onglets WhatsApp ouverts`);
  };

  const sendEmail = () => {
    if (!body.trim() || !subject.trim()) return toast.error("Sujet et message requis");
    const targets = customers?.filter((c) => selected.has(c.id) && c.email) ?? [];
    if (targets.length === 0) return toast.error("Aucun destinataire avec email");
    const to = targets.map((c) => c.email).join(",");
    window.location.href = `mailto:?bcc=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2"><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span className="font-medium">Destinataires ({selected.size})</span></div>
          <Button size="sm" variant="ghost" onClick={toggleAll}>{selected.size === customers?.length ? "Tout désélectionner" : "Tout sélectionner"}</Button>
        </div>
        <div className="max-h-96 overflow-y-auto border rounded divide-y">
          {customers?.map((c) => (
            <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <div className="flex-1">
                <div>{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone ?? "—"} · {c.email ?? "—"}</div>
              </div>
            </label>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <div><Label>Sujet (email)</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div>
          <Label>Message</Label>
          <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Bonjour {nom}, ..." />
          <p className="text-xs text-muted-foreground mt-1">Utilisez <code>{"{nom}"}</code> pour personnaliser (WhatsApp).</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={sendWhatsApp} disabled={selected.size === 0}><MessageCircle className="mr-2 h-4 w-4" />Envoyer via WhatsApp</Button>
          <Button variant="outline" onClick={sendEmail} disabled={selected.size === 0}><Mail className="mr-2 h-4 w-4" />Envoyer via Email</Button>
        </div>
        <p className="text-xs text-muted-foreground">Ouvre WhatsApp Web / client mail. Aucun envoi automatique.</p>
      </CardContent></Card>
    </div>
  );
}
