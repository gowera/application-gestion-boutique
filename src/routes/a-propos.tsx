import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/a-propos")({ component: AboutPage });

function AboutPage() {
  const values = [
    "Expertise multi-domaines : électricité, solaire, sécurité, réseaux, froid",
    "Équipe qualifiée et certifiée",
    "Matériel garanti issu de marques reconnues",
    "Approche projet : étude, installation, maintenance, SAV",
    "Transparence des devis et des délais",
  ];
  return (
    <SiteShell>
      <div className="bg-hero-gradient text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4"><h1 className="text-display text-3xl md:text-5xl font-bold">À propos de CONETEC</h1><p className="mt-2 text-primary-foreground/80">Company of New Technology</p></div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <p className="text-lg text-muted-foreground">CONETEC est une entreprise spécialisée dans la vente de matériels, l'installation, la maintenance et les services techniques liés à l'électricité, l'énergie solaire, la sécurité, les réseaux, le froid, la climatisation, la téléphonie et l'aménagement intérieur.</p>
        <Card><CardContent className="p-6">
          <h2 className="text-display text-xl font-bold">Notre mission</h2>
          <p className="mt-2 text-muted-foreground">Rendre accessibles à tous — particuliers et professionnels — des solutions techniques modernes, fiables et durables, avec un accompagnement de bout en bout.</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <h2 className="text-display text-xl font-bold">Nos valeurs</h2>
          <ul className="mt-3 space-y-2">
            {values.map((v) => <li key={v} className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-primary mt-0.5" /> <span>{v}</span></li>)}
          </ul>
        </CardContent></Card>
      </div>
    </SiteShell>
  );
}
