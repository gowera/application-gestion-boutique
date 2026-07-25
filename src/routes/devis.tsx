import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { SERVICES } from "./index";
import { Upload, FileCheck, Award, ClipboardCheck, Clock, ShieldCheck, X } from "lucide-react";
import elecPro from "@/assets/services/electricite-pro.webp";

export const Route = createFileRoute("/devis")({
  component: QuotePage,
  head: () => ({ meta: [
    { title: "Demande de devis — CONETEC" },
    { name: "description", content: "Décrivez votre besoin technique : nos experts CONETEC vous répondent sous 24h avec un devis gratuit et détaillé." },
    { property: "og:title", content: "Devis CONETEC" },
    { property: "og:description", content: "Étude de faisabilité et devis gratuit sous 24h." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
});

function QuotePage() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", service: SERVICES[0].title, message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Nom et téléphone requis");
    setLoading(true);
    let attachment_url: string | null = null;
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("quote-attachments").upload(path, file, { upsert: false });
      if (up.error) { setLoading(false); return toast.error("Envoi de la pièce jointe impossible"); }
      attachment_url = up.data.path;
    }
    const { error } = await supabase.from("quote_requests").insert({ name: form.name, phone: form.phone, email: form.email || null, service: form.service, message: form.message || null, attachment_url });
    setLoading(false);
    if (error) return toast.error("Envoi impossible");
    await createNotification({ title: "Nouveau devis demandé", message: `${form.name} a demandé un devis pour ${form.service}.`, type: "info", entity_type: "quote_request" });
    toast.success("Demande envoyée !");
    setForm({ name: "", phone: "", email: "", service: SERVICES[0].title, message: "" });
    setFile(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <SiteShell>
      <section className="border-b bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-energy">Étude technique</p>
          <h1 className="mt-2 text-display text-3xl font-extrabold md:text-4xl">Demande de devis expert</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Décrivez votre projet. Nos ingénieurs vous répondent sous 24h ouvrées avec une étude chiffrée et détaillée.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* Left column */}
          <aside className="space-y-5">
            <SideCard icon={Award} title="Certification industrielle" desc="Équipe technique certifiée sur 10+ domaines : solaire, CCTV, réseaux, climatisation." />
            <SideCard icon={ClipboardCheck} title="Étude de faisabilité" desc="Visite technique, dimensionnement, choix des marques et plan d'installation détaillé." />
            <SideCard icon={Clock} title="Réponse sous 24h" desc="Un chargé d'affaires vous rappelle rapidement pour affiner votre besoin." />
            <SideCard icon={ShieldCheck} title="Matériel garanti" desc="Marques officielles, factures conformes, garantie constructeur." />
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <img src={elecPro} alt="Ingénieurs CONETEC sur chantier" className="h-56 w-full object-cover" />
              <div className="border-l-4 border-l-energy bg-primary p-4 text-primary-foreground">
                <p className="text-sm font-semibold">Chantiers récents</p>
                <p className="text-xs text-primary-foreground/80">Installations solaires, systèmes CCTV et réseaux haute performance à Kinshasa.</p>
              </div>
            </div>
          </aside>

          {/* Form */}
          <div className="rounded-2xl border bg-background p-6 shadow-sm md:p-8">
            <h2 className="text-display text-2xl font-extrabold">Décrivez votre besoin</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les champs marqués d'un * sont obligatoires.</p>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom complet *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jean Doe" /></Field>
                <Field label="Téléphone *"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+243 …" /></Field>
              </div>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.com" /></Field>
              <Field label="Type de service *">
                <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => <SelectItem key={s.slug} value={s.title}>{s.title}</SelectItem>)}
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Description du besoin"><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Superficie, contraintes, délais souhaités…" /></Field>

              <div>
                <Label className="mb-1.5 block">Pièce jointe (plan, photo, cahier des charges)</Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-energy bg-accent/40" : "border-border bg-secondary/40 hover:bg-secondary"}`}
                >
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground"><Upload className="h-5 w-5" /></div>
                  <p className="text-sm font-medium">Glissez votre fichier ici ou <span className="text-energy">parcourez</span></p>
                  <p className="text-xs text-muted-foreground">PDF, images, DOC — jusqu'à 10 Mo</p>
                  <input ref={inputRef} type="file" hidden accept="image/*,application/pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                {file && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border bg-secondary/60 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 truncate"><FileCheck className="h-4 w-4 text-energy" /> {file.name} <span className="text-xs text-muted-foreground">({Math.round(file.size / 1024)} Ko)</span></span>
                    <button type="button" onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full bg-energy text-energy-foreground hover:bg-energy/90" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer ma demande"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">En envoyant, vous acceptez d'être recontacté par notre équipe commerciale.</p>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-sm font-semibold">{label}</Label>{children}</div>;
}
function SideCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-xl border-l-4 border-l-energy border bg-background p-4 shadow-sm">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="text-display text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
