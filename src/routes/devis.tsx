import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { SERVICES } from "./index";

export const Route = createFileRoute("/devis")({ component: QuotePage });

function QuotePage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", service: SERVICES[0].title, message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Nom et téléphone requis");
    setLoading(true);
    const { error } = await supabase.from("quote_requests").insert({ name: form.name, phone: form.phone, email: form.email || null, service: form.service, message: form.message || null });
    setLoading(false);
    if (error) return toast.error("Envoi impossible");
    await createNotification({
      title: "Nouveau devis demandé", message: `${form.name} a demandé un devis pour ${form.service}.`, type: "info", entity_type: "quote_request"
    });
    toast.success("Demande envoyée !");
    setForm({ name: "", phone: "", email: "", service: SERVICES[0].title, message: "" });
  }

  return (
    <SiteShell>
      <div className="bg-hero-gradient text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4"><h1 className="text-display text-3xl md:text-5xl font-bold">Demande de devis</h1><p className="mt-2 text-primary-foreground/80">Décrivez votre besoin, nous vous répondons rapidement.</p></div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card><CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Nom complet *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>Type de service *</Label>
              <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICES.map((s) => <SelectItem key={s.slug} value={s.title}>{s.title}</SelectItem>)}<SelectItem value="Autre">Autre</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Description du besoin</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Envoi..." : "Envoyer ma demande"}</Button>
          </form>
        </CardContent></Card>
      </div>
    </SiteShell>
  );
}
