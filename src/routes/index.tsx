import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Zap, Sun, Camera, Wifi, Wind, Phone, Shield, Lock, PenTool, Sparkles, Wrench,
  ArrowRight, MapPin, Mail, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: PublicHome,
});

const SERVICES = [
  { icon: Zap, title: "Installation électrique", desc: "Conception et pose conformes aux normes." },
  { icon: Sun, title: "Énergie solaire", desc: "Étude, installation et maintenance photovoltaïque." },
  { icon: Camera, title: "Vidéosurveillance CCTV", desc: "Caméras, DVR, supervision distante." },
  { icon: Shield, title: "Alarmes de sécurité", desc: "Détection d'intrusion et alertes." },
  { icon: Lock, title: "Contrôle d'accès", desc: "Systèmes d'accès sécurisés." },
  { icon: Wifi, title: "Réseaux & Internet", desc: "Wi-Fi, LAN, antennes, liaisons." },
  { icon: Wind, title: "Froid & climatisation", desc: "Installation, réparation, entretien." },
  { icon: Phone, title: "Téléphonie & VoIP", desc: "Installation et maintenance." },
  { icon: Wrench, title: "Maintenance & dépannage", desc: "Diagnostic, réparation, entretien." },
  { icon: PenTool, title: "Plans CAD", desc: "AutoCAD, SketchUp, schémas techniques." },
  { icon: Sparkles, title: "Décoration intérieure", desc: "Aménagement lumineux et design." },
];

function PublicHome() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <Hero />
      <ServicesGrid />
      <QuoteSection />
      <ContactSection />
      <Footer />
    </div>
  );
}

function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-primary/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-energy text-energy-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-display font-bold tracking-tight">CONETEC</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-primary-foreground/80">
          <a href="#services" className="hover:text-primary-foreground">Services</a>
          <a href="#devis" className="hover:text-primary-foreground">Devis</a>
          <a href="#contact" className="hover:text-primary-foreground">Contact</a>
        </div>
        <Link to="/auth"><Button size="sm" variant="secondary">Accès admin</Button></Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="bg-hero-gradient pt-28 pb-24 text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-energy/40 bg-energy/10 px-3 py-1 text-xs font-medium text-energy">
              <span className="h-1.5 w-1.5 rounded-full bg-energy"></span> Solutions techniques intégrées
            </span>
            <h1 className="mt-6 text-display text-4xl md:text-6xl font-bold leading-[1.05]">
              L'énergie, la sécurité<br />et la connectivité<br />
              <span className="text-energy">au service de vos projets.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
              CONETEC vous accompagne dans l'installation, la maintenance et la fourniture d'équipements pour l'électricité, l'énergie solaire, la vidéosurveillance, les réseaux, le froid et la téléphonie.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#devis">
                <Button size="lg" className="bg-energy text-energy-foreground hover:bg-energy/90">
                  Demander un devis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#services">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                  Nos services
                </Button>
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "+10", v: "domaines d'expertise" },
              { k: "24/7", v: "assistance technique" },
              { k: "100%", v: "matériel garanti" },
              { k: "Pro", v: "équipe certifiée" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 backdrop-blur">
                <div className="text-display text-4xl font-bold text-energy">{s.k}</div>
                <div className="mt-1 text-sm text-primary-foreground/70">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesGrid() {
  return (
    <section id="services" className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-display text-3xl md:text-4xl font-bold">Nos services techniques</h2>
          <p className="mt-3 text-muted-foreground">
            De l'étude à la maintenance, une seule équipe pour l'ensemble de vos installations.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Card key={s.title} className="group relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuoteSection() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", service: SERVICES[0].title, message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.service) {
      toast.error("Merci de renseigner votre nom, téléphone et service.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("quote_requests").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      service: form.service,
      message: form.message.trim() || null,
    });
    setLoading(false);
    if (error) { toast.error("Envoi impossible. Réessayez."); return; }
    toast.success("Demande envoyée ! Nous vous rappelons rapidement.");
    setForm({ name: "", phone: "", email: "", service: SERVICES[0].title, message: "" });
  }

  return (
    <section id="devis" className="bg-secondary/40 py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2">
        <div>
          <h2 className="text-display text-3xl md:text-4xl font-bold">Demandez un devis gratuit</h2>
          <p className="mt-3 text-muted-foreground">
            Décrivez votre besoin — installation, dépannage, étude solaire, réseau, CCTV... Notre équipe vous répond sous 24h ouvrées.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Étude technique gratuite", "Matériel garanti", "Intervention rapide", "Devis détaillé et transparent"].map((li) => (
              <li key={li} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-energy text-energy-foreground">✓</span>
                {li}
              </li>
            ))}
          </ul>
        </div>
        <Card>
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Nom complet *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>Type de service *</Label>
                <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => <SelectItem key={s.title} value={s.title}>{s.title}</SelectItem>)}
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description du besoin</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer ma demande"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-24">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-3">
        {[
          { icon: Phone, title: "Téléphone", value: "+243 996 886 079", href: "tel:+243996886079" },
          { icon: MessageCircle, title: "WhatsApp", value: "+243 996 886 079", href: "https://wa.me/243996886079" },
          { icon: Mail, title: "Email", value: "oredymusanda@gmail.com", href: "mailto:oredymusanda@gmail.com" },
        ].map((c) => (
          <a key={c.title} href={c.href} className="group">
            <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.title}</div>
                  <div className="mt-1 text-display font-semibold">{c.value}</div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground/80">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-energy text-energy-foreground"><Zap className="h-4 w-4" /></div>
            <span className="text-display font-bold text-primary-foreground">CONETEC</span>
          </div>
          <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> République Démocratique du Congo</div>
        </div>
        <div className="mt-8 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} CONETEC. Tous droits réservés. Développé par OREDY TECHNOLOGIES.
        </div>
      </div>
    </footer>
  );
}
