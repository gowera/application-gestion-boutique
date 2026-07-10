import { createFileRoute, useParams, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SERVICES } from "./index";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/services/$slug")({ component: ServiceDetail });

function ServiceDetail() {
  const { slug } = useParams({ from: "/services/$slug" });
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) throw notFound();
  const benefits = ["Étude technique gratuite", "Matériel garanti et certifié", "Équipe qualifiée", "Intervention rapide", "Suivi et maintenance", "Devis transparent"];
  return (
    <SiteShell>
      <div className="bg-hero-gradient text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-energy text-energy-foreground"><s.icon className="h-7 w-7" /></div>
            <h1 className="mt-4 text-display text-3xl md:text-5xl font-bold">{s.title}</h1>
            <p className="mt-3 text-primary-foreground/80 text-lg max-w-xl">{s.desc}</p>
            <div className="mt-6 flex gap-3">
              <Link to="/devis"><Button size="lg" className="bg-energy text-energy-foreground hover:bg-energy/90">Demander un devis <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <a href="https://wa.me/243996886079"><Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">WhatsApp</Button></a>
            </div>
          </div>
          <img src={s.img} alt={s.title} className="rounded-2xl w-full h-72 object-cover" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-display text-2xl font-bold">Notre approche</h2>
          <p className="mt-3 text-muted-foreground">Chez CONETEC, chaque projet {s.title.toLowerCase()} commence par une écoute attentive de vos besoins, suivi d'une étude technique, d'un devis clair, puis d'une installation soignée par nos équipes certifiées. Nous restons disponibles pour la maintenance et le SAV.</p>
          <ul className="mt-6 space-y-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" /> {b}</li>
            ))}
          </ul>
        </div>
        <Card><CardContent className="p-6">
          <h3 className="text-display font-semibold">Vous avez un projet ?</h3>
          <p className="mt-2 text-sm text-muted-foreground">Envoyez-nous les détails de votre besoin, nous vous rappelons sous 24h ouvrées.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/devis"><Button className="w-full">Formulaire de devis</Button></Link>
            <a href="tel:+243996886079"><Button variant="outline" className="w-full">Appeler +243 996 886 079</Button></a>
          </div>
        </CardContent></Card>
      </div>
    </SiteShell>
  );
}
