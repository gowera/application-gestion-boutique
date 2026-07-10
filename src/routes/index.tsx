import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteShell } from "@/components/public/site-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, useSettings } from "@/lib/currency";
import {
  Zap, Sun, Camera, Wifi, Wind, Phone, Shield, PenTool, Sparkles, Wrench, ArrowRight,
  Truck, ShieldCheck, HeadphonesIcon, Award,
} from "lucide-react";
import elecPro from "@/assets/services/electricite-pro.webp";
import elecDom from "@/assets/services/electricite-domestique.webp";
import elecDom2 from "@/assets/services/electricite-domestique-2.webp";
import elecDom3 from "@/assets/services/electricite-domestique-3.webp";
import reseaux from "@/assets/services/reseaux.webp";
import clim from "@/assets/services/climatisation.webp";
import decor from "@/assets/services/decor-interieur.webp";
import decor2 from "@/assets/services/decor-interieur-2.webp";
import habillement from "@/assets/services/habillement.webp";

export const Route = createFileRoute("/")({ component: PublicHome });

const SERVICES = [
  { slug: "electricite", icon: Zap, title: "Installation électrique", desc: "Conception et pose conformes aux normes.", img: elecDom3 },
  { slug: "solaire", icon: Sun, title: "Énergie solaire", desc: "Étude, installation et maintenance photovoltaïque.", img: elecPro },
  { slug: "cctv", icon: Camera, title: "Vidéosurveillance CCTV", desc: "Caméras, DVR, supervision distante.", img: elecDom },
  { slug: "reseaux", icon: Wifi, title: "Réseaux & Internet", desc: "Wi-Fi, LAN, antennes, liaisons.", img: reseaux },
  { slug: "climatisation", icon: Wind, title: "Froid & climatisation", desc: "Installation, réparation, entretien.", img: clim },
  { slug: "decoration", icon: Sparkles, title: "Décoration intérieure", desc: "Aménagement lumineux et design.", img: decor },
  { slug: "telephonie", icon: Phone, title: "Téléphonie & VoIP", desc: "Installation et maintenance.", img: elecDom2 },
  { slug: "securite", icon: Shield, title: "Sécurité & alarmes", desc: "Détection d'intrusion et alertes.", img: elecPro },
  { slug: "cad", icon: PenTool, title: "Plans CAD", desc: "AutoCAD, SketchUp, schémas techniques.", img: decor2 },
  { slug: "habillement", icon: Award, title: "Aménagement boutique", desc: "Habillement d'espaces commerciaux.", img: habillement },
];

function PublicHome() {
  return (
    <SiteShell>
      <Hero />
      <TrustStrip />
      <FeaturedProducts />
      <ServicesGrid />
      <CtaBanner />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="bg-hero-gradient py-20 md:py-28 text-primary-foreground overflow-hidden relative">
      <div className="mx-auto max-w-7xl px-4 grid gap-10 lg:grid-cols-2 lg:items-center relative">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-energy/40 bg-energy/10 px-3 py-1 text-xs font-medium text-energy">
            <span className="h-1.5 w-1.5 rounded-full bg-energy"></span> Company of New Technology
          </span>
          <h1 className="mt-6 text-display text-4xl md:text-6xl font-bold leading-[1.05]">
            Matériels, installation<br />& services techniques<br />
            <span className="text-energy">à portée de clic.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
            De l'électricité à l'énergie solaire, du CCTV aux réseaux, du froid à la décoration — CONETEC équipe et accompagne particuliers et professionnels.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/boutique">
              <Button size="lg" className="bg-energy text-energy-foreground hover:bg-energy/90">
                Visiter la boutique <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/devis">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                Demander un devis
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <img src={elecDom3} alt="Éclairage LED" className="rounded-2xl h-48 md:h-56 w-full object-cover" />
          <img src={clim} alt="Climatisation" className="rounded-2xl h-48 md:h-56 w-full object-cover mt-8" />
          <img src={reseaux} alt="Réseaux" className="rounded-2xl h-48 md:h-56 w-full object-cover -mt-4" />
          <img src={decor} alt="Décoration" className="rounded-2xl h-48 md:h-56 w-full object-cover mt-4" />
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: Truck, title: "Livraison rapide", desc: "Kinshasa & environs" },
    { icon: ShieldCheck, title: "Matériel garanti", desc: "Marques officielles" },
    { icon: HeadphonesIcon, title: "Support 7j/7", desc: "Équipe technique dédiée" },
    { icon: Award, title: "Équipe certifiée", desc: "10+ domaines d'expertise" },
  ];
  return (
    <section className="border-y bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><i.icon className="h-5 w-5" /></div>
            <div>
              <div className="font-semibold text-sm">{i.title}</div>
              <div className="text-xs text-muted-foreground">{i.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedProducts() {
  const { data: settings } = useSettings();
  const { data: products } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,brand,sale_price,stock,images").eq("status", "active").limit(8).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-display text-3xl md:text-4xl font-bold">Produits populaires</h2>
            <p className="mt-2 text-muted-foreground">Découvrez notre sélection de matériels.</p>
          </div>
          <Link to="/boutique"><Button variant="outline">Voir toute la boutique <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
        {!products?.length ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Aucun produit publié. Ajoutez-en depuis l'administration.</CardContent></Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} to="/boutique/$productId" params={{ productId: p.id }}>
                <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
                  <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Zap className="h-12 w-12 text-muted-foreground/30" />}
                  </div>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">{p.brand ?? "—"}</div>
                    <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                    <div className="mt-2 text-primary font-bold">{formatMoney(Number(p.sale_price), cur, rate)}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ServicesGrid() {
  return (
    <section className="py-16 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-2xl mb-10">
          <h2 className="text-display text-3xl md:text-4xl font-bold">Nos services techniques</h2>
          <p className="mt-3 text-muted-foreground">De l'étude à la maintenance, une seule équipe pour tous vos projets.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.slug} to="/services/$slug" params={{ slug: s.slug }}>
              <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
                <div className="aspect-video overflow-hidden bg-secondary">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
                    <h3 className="text-display font-semibold">{s.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-3xl bg-hero-gradient text-primary-foreground p-10 md:p-16 text-center">
          <h2 className="text-display text-3xl md:text-4xl font-bold">Un projet ? Un dépannage ? Une étude ?</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-2xl mx-auto">Nos experts vous répondent sous 24h ouvrées. Devis gratuit, matériel garanti, intervention rapide.</p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link to="/devis"><Button size="lg" className="bg-energy text-energy-foreground hover:bg-energy/90">Demander un devis</Button></Link>
            <a href="https://wa.me/243996886079"><Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">WhatsApp</Button></a>
          </div>
        </div>
      </div>
    </section>
  );
}

export { SERVICES };
