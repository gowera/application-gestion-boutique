import { StorageImage } from "@/components/storage-image";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/public/site-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, useSettings } from "@/lib/currency";
import {
  Zap, Sun, Camera, Wifi, Wind, Phone, Shield, PenTool, Sparkles,
  ArrowRight, Truck, ShieldCheck, HeadphonesIcon, Award, Star, ShoppingCart,
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

export const Route = createFileRoute("/")({
  component: PublicHome,
  head: () => ({ meta: [
    { title: "CONETEC — Expert-Grade Technical Solutions" },
    { name: "description", content: "Fournisseur leader en solutions d'énergie solaire, sécurité CCTV et réseaux haute performance pour professionnels et particuliers exigeants." },
    { property: "og:title", content: "CONETEC — Solutions techniques" },
    { property: "og:description", content: "Énergie solaire, CCTV, réseaux, climatisation : matériel et installation par des experts certifiés." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
});

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
      <CategoriesBento />
      <TrustStrip />
      <FeaturedProducts />
      <CtaBanner />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-md border border-energy/40 bg-energy/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[oklch(0.80_0.11_195)]">
            Solutions Industrielles 4.0
          </span>
          <h1 className="mt-6 text-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Expert-Grade Technical<br />
            <span className="text-[oklch(0.78_0.12_195)]">Infrastructure</span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-primary-foreground/75 md:text-lg">
            Fournisseur leader en solutions d'énergie solaire, sécurité CCTV et réseaux haute performance pour les professionnels et les particuliers exigeants.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/boutique">
              <Button size="lg" className="bg-energy text-energy-foreground hover:bg-energy/90 rounded-md px-6">
                Explorer le Catalogue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/devis">
              <Button size="lg" variant="outline" className="rounded-md border-primary-foreground/25 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10">
                Demander un Devis
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-energy/10 blur-2xl" />
          <img src={elecPro} alt="Infrastructure technique CONETEC" className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl" />
        </div>
      </div>
    </section>
  );
}

function CategoriesBento() {
  const cats = [
    { slug: "solaire", title: "Énergie Solaire", desc: "Kits complets, onduleurs hybrides et panneaux haute performance.", img: elecPro, span: "lg:col-span-2 lg:row-span-2 aspect-[4/3] lg:aspect-auto" },
    { slug: "cctv", title: "CCTV & Sécurité", desc: "Surveillance IP, Alarmes, Contrôle d'accès.", img: elecDom, span: "lg:col-span-2" },
    { slug: "reseaux", title: "Réseautage", desc: "Fibre, switches, WiFi entreprise.", img: reseaux, span: "" },
    { slug: "electricite", title: "Outillage", desc: "Instruments de mesure & outils pro.", img: elecDom2, span: "" },
  ];
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-display text-3xl font-extrabold md:text-4xl">Nos Catégories Experts</h2>
            <p className="mt-2 text-muted-foreground">Des solutions segmentées pour chaque besoin technique.</p>
          </div>
          <Link to="/boutique" className="inline-flex items-center gap-1.5 text-sm font-semibold text-energy hover:underline">
            Voir tout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-4 lg:grid-rows-2 lg:h-[520px]">
          {cats.map((c) => (
            <Link
              key={c.slug}
              to="/services/$slug"
              params={{ slug: c.slug }}
              className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-secondary shadow-sm border-l-4 border-l-energy ${c.span}`}
            >
              <img src={c.img} alt={c.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-primary-foreground">
                <h3 className="text-display text-xl font-bold md:text-2xl">{c.title}</h3>
                <p className="mt-1 max-w-xs text-sm text-primary-foreground/85 line-clamp-2">{c.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-energy opacity-0 transition-opacity group-hover:opacity-100">
                  Découvrir <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
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
    <section className="border-y bg-secondary/50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><i.icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{i.title}</div>
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
    queryFn: async () => (await supabase.from("products").select("id,name,brand,sale_price,stock,images").eq("status", "active").limit(8).order("created_at", { ascending: false })).data ?? [],
  });
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";
  return (
    <section className="bg-secondary/40 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-display text-3xl font-extrabold md:text-4xl">Produits Populaires</h2>
          <Link to="/boutique" className="text-sm font-semibold text-energy hover:underline">Voir tout le catalogue →</Link>
        </div>
        {!products?.length ? (
          <div className="rounded-2xl border bg-background p-12 text-center text-muted-foreground">Aucun produit publié.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 4).map((p, idx) => (
              <div key={p.id} className="group">
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border-l-4 border-l-energy border border-border/60 bg-background shadow-sm transition-all group-hover:shadow-lg">
                  <Link to="/boutique/$productId" params={{ productId: p.id }} className="relative block aspect-square overflow-hidden bg-secondary">
                    {idx === 0 && <span className="absolute left-3 top-3 z-10 rounded bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Best Seller</span>}
                    {idx === 1 && <span className="absolute left-3 top-3 z-10 rounded bg-destructive px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">-15% Promo</span>}
                    <StorageImage
                      src={p.images?.[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      fallback={<div className="grid h-full w-full place-items-center"><Zap className="h-12 w-12 text-muted-foreground/30" /></div>}
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-energy text-energy" /> 4.8
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.brand ?? "CONETEC"}</div>
                    <Link to="/boutique/$productId" params={{ productId: p.id }} className="mt-0.5 min-h-[2.5rem] text-sm font-semibold line-clamp-2 hover:text-primary">{p.name}</Link>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-display text-lg font-extrabold text-primary">{formatMoney(Number(p.sale_price), cur, rate)}</div>
                      <span className="rounded-md bg-energy p-2 text-energy-foreground"><ShoppingCart className="h-4 w-4" /></span>
                    </div>
                    <Link
                      to="/produit/$productId"
                      params={{ productId: p.id }}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Voir tous les détails <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-3xl bg-hero-gradient p-10 text-center text-primary-foreground md:p-16">
          <h2 className="text-display text-3xl font-extrabold md:text-4xl">Un projet ? Un dépannage ? Une étude ?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/80">Nos experts vous répondent sous 24h ouvrées. Devis gratuit, matériel garanti, intervention rapide.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/devis"><Button size="lg" className="bg-energy text-energy-foreground hover:bg-energy/90">Demander un devis</Button></Link>
            <a href="https://wa.me/243996886079"><Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">WhatsApp</Button></a>
          </div>
        </div>
      </div>
    </section>
  );
}

export { SERVICES };
