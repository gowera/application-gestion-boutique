import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Nom et téléphone requis");
    setLoading(true);
    const { error } = await supabase.from("quote_requests").insert({ name: form.name, phone: form.phone, email: form.email || null, service: "Contact", message: form.message || null });
    setLoading(false);
    if (error) return toast.error("Envoi impossible");
    await createNotification({
      title: "Nouvelle demande de contact", message: `${form.name} a envoyé un message depuis le site.`, type: "info", entity_type: "quote_request"
    });
    toast.success("Message envoyé !");
    setForm({ name: "", phone: "", email: "", message: "" });
  }
  return (
    <SiteShell>
      <div className="bg-hero-gradient text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4"><h1 className="text-display text-3xl md:text-5xl font-bold">Contact</h1></div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {[
            { icon: Phone, label: "Téléphone", val: "+243 996 886 079", href: "tel:+243996886079" },
            { icon: MessageCircle, label: "WhatsApp", val: "+243 996 886 079", href: "https://wa.me/243996886079" },
            { icon: Mail, label: "Email", val: "oredymusanda@gmail.com", href: "mailto:oredymusanda@gmail.com" },
            { icon: MapPin, label: "Adresse", val: "République Démocratique du Congo" },
          ].map((c) => (
            <Card key={c.label}><CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><c.icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">{c.label}</div>
                {c.href ? <a href={c.href} className="font-semibold hover:text-primary">{c.val}</a> : <div className="font-semibold">{c.val}</div>}
              </div>
            </CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6">
          <h3 className="text-display font-semibold mb-4">Envoyez-nous un message</h3>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Envoi..." : "Envoyer"}</Button>
          </form>
        </CardContent></Card>
      </div>
    </SiteShell>
  );
}
