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
import { useSettings } from "@/lib/currency";
import { Phone, Mail, MessageCircle, MapPin, Clock, CheckCircle2, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({ meta: [
    { title: "Contact — CONETEC" },
    { name: "description", content: "Contactez les équipes techniques CONETEC : téléphone, WhatsApp, email ou formulaire direct pour un projet solaire, CCTV, réseau ou climatisation." },
    { property: "og:title", content: "Contact CONETEC" },
    { property: "og:description", content: "Support technique et commercial CONETEC — RDC." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
});

function ContactPage() {
  const { data: s } = useSettings();
  const phone = s?.phone || "+243 996 886 079";
  const email = s?.email || "oredymusanda@gmail.com";
  const whatsapp = s?.whatsapp || phone;
  const address = s?.address || "Kinshasa, République Démocratique du Congo";
  const waLink = `https://wa.me/${whatsapp.replace(/\D/g, "")}`;

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Nom et téléphone requis");
    setLoading(true);
    const { error } = await supabase.from("quote_requests").insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      service: form.subject || "Contact",
      message: form.message || null,
    });
    setLoading(false);
    if (error) return toast.error("Envoi impossible");
    await createNotification({
      title: "Nouveau message de contact",
      message: `${form.name} a envoyé un message depuis le site.`,
      type: "info",
      entity_type: "quote_request",
    });
    toast.success("Message envoyé — nous vous recontactons rapidement.");
    setSent(true);
    setForm({ name: "", phone: "", email: "", subject: "", message: "" });
  }

  const contacts = [
    { icon: Phone, label: "Téléphone", val: phone, href: `tel:${phone.replace(/\s/g, "")}` },
    { icon: MessageCircle, label: "WhatsApp", val: whatsapp, href: waLink },
    { icon: Mail, label: "Email", val: email, href: `mailto:${email}` },
    { icon: MapPin, label: "Adresse", val: address },
  ];

  return (
    <SiteShell>
      <section className="border-b bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-energy">Contact</p>
          <h1 className="mt-2 text-display text-4xl md:text-5xl font-extrabold">Parlons de votre projet</h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80">
            Notre équipe technique répond sous 24h ouvrées. Devis, dépannage, maintenance ou étude sur-mesure — nous sommes à votre écoute.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-14 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <h2 className="text-display text-2xl font-bold">Nos canaux directs</h2>
          <p className="text-sm text-muted-foreground">Choisissez le canal qui vous convient — WhatsApp est le plus rapide.</p>
          <div className="grid gap-3">
            {contacts.map((c) => (
              <Card key={c.label} className="border-l-4 border-l-energy transition-all hover:shadow-md">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
                    {c.href
                      ? <a href={c.href} className="block font-semibold text-primary hover:underline truncate">{c.val}</a>
                      : <div className="font-semibold truncate">{c.val}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-energy text-xs font-bold uppercase tracking-widest">
                <Clock className="h-4 w-4" /> Horaires
              </div>
              <ul className="mt-3 space-y-1 text-sm text-primary-foreground/85">
                <li className="flex justify-between"><span>Lundi – Vendredi</span><span>08:00 – 18:00</span></li>
                <li className="flex justify-between"><span>Samedi</span><span>09:00 – 15:00</span></li>
                <li className="flex justify-between"><span>Dimanche</span><span>Urgences uniquement</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-t-4 border-t-energy">
          <CardContent className="p-6 md:p-8">
            {sent ? (
              <div className="flex flex-col items-center text-center py-8 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-energy/15 text-energy">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-display text-2xl font-bold">Message envoyé !</h3>
                <p className="text-sm text-muted-foreground max-w-md">Notre équipe vous recontactera dans les meilleurs délais. Pour une urgence, contactez-nous directement sur WhatsApp.</p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSent(false)}>Envoyer un autre message</Button>
                  <a href={waLink}><Button className="bg-energy text-energy-foreground hover:bg-energy/90"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button></a>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-display text-2xl font-bold">Envoyez-nous un message</h3>
                <p className="mt-1 text-sm text-muted-foreground">Les champs marqués d'un * sont obligatoires.</p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Nom complet *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+243 …" /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div><Label>Objet</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Solaire, CCTV, dépannage…" /></div>
                  </div>
                  <div><Label>Message</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Décrivez votre besoin, la localisation, le délai souhaité…" /></div>
                  <Button type="submit" size="lg" className="w-full bg-energy text-energy-foreground hover:bg-energy/90" disabled={loading}>
                    {loading ? "Envoi en cours…" : (<><Send className="mr-2 h-4 w-4" />Envoyer le message</>)}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    En envoyant ce formulaire, vous acceptez d'être recontacté par notre équipe.
                  </p>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
