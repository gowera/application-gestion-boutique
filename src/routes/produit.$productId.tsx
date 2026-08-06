import { StorageImage } from "@/components/storage-image";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { deliveryAreaLabel, useDeliveryConfig } from "@/lib/delivery";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatMoney, useSettings } from "@/lib/currency";
import {
  ShoppingCart, Package, ChevronRight, ShieldCheck, Truck, HeadphonesIcon, Star, Zap,
  FileText, ArrowRight, CheckCircle2, Wrench, RotateCcw, CreditCard, BadgeCheck, Clock,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { ProductReviews, Stars, reviewStats, useProductReviews } from "@/components/public/product-reviews";
import { ProductIdentity } from "@/components/public/product-identity";
import { ShareButton } from "@/components/public/share-button";
import { getRequestOrigin } from "@/lib/origin.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/produit/$productId")({
  component: ProductDetailsPage,
  loader: async ({ params }) => {
    const [origin, res] = await Promise.all([
      getRequestOrigin().catch(() => ""),
      supabase
        .from("products")
        .select("name,description,brand,sale_price,images")
        .eq("id", params.productId)
        .maybeSingle(),
    ]);
    return { origin, product: res.data ?? null };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.product;
    const origin = loaderData?.origin ?? "";
    const path = `/produit/${params.productId}`;
    const title = p ? `${p.name}${p.brand ? ` — ${p.brand}` : ""} | CONETEC` : "Détails du produit — CONETEC";
    const description = p
      ? (p.description?.trim().slice(0, 155) ||
          `${p.name} disponible chez CONETEC à ${Number(p.sale_price).toFixed(2)} USD. Garantie, livraison à Kinshasa et installation par nos techniciens.`)
      : "Fiche complète : caractéristiques techniques, garantie, livraison et installation du matériel CONETEC.";
    const image = p?.images?.length ? `${origin}/api/public/og/product/${params.productId}` : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: origin ? `${origin}${path}` : path },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { property: "og:site_name", content: "CONETEC" },
        ...(p
          ? [
              { property: "product:price:amount", content: String(Number(p.sale_price)) },
              { property: "product:price:currency", content: "USD" },
              { property: "og:price:amount", content: String(Number(p.sale_price)) },
              { property: "og:price:currency", content: "USD" },
              { property: "product:availability", content: "in stock" },
              { property: "product:brand", content: p.brand ?? "CONETEC" },
            ]
          : []),
        ...(image
          ? [
              { property: "og:image", content: image },
              { property: "og:image:url", content: image },
              { property: "og:image:secure_url", content: image },
              { property: "og:image:type", content: "image/jpeg" },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { property: "og:image:alt", content: p?.name ?? "Produit CONETEC" },
              { name: "twitter:image", content: image },
              { name: "twitter:image:src", content: image },
              { name: "twitter:image:alt", content: p?.name ?? "Produit CONETEC" },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: path }],
    };
  },
});

function ProductDetailsPage() {
  const { productId } = useParams({ from: "/produit/$productId" });
  const { data: settings } = useSettings();
  const { add } = useCart();
  const navigate = useNavigate();
  const delivery = useDeliveryConfig();
  const areaLabel = deliveryAreaLabel(delivery);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const cur = settings?.primary_currency ?? "USD";

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", productId).maybeSingle()).data,
  });

  const { data: reviews } = useProductReviews(productId);
  const stats = reviewStats(reviews);

  const { data: related } = useQuery({
    queryKey: ["product-related", p?.category_id, productId],
    enabled: !!p,
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("id,name,sku,sale_price,images,stock,brand")
        .eq("status", "active")
        .neq("id", productId)
        .limit(4)).data ?? [],
  });

  if (isLoading) return <SiteShell><div className="py-24 text-center text-muted-foreground">Chargement…</div></SiteShell>;
  if (!p) return (
    <SiteShell>
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Produit introuvable.</p>
        <Link to="/boutique"><Button className="mt-4">Retour catalogue</Button></Link>
      </div>
    </SiteShell>
  );

  const images: string[] = p.images?.length ? p.images : [];
  const price = Number(p.sale_price);

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6">
        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link to="/boutique" className="hover:text-primary">Boutique</Link>
          <ChevronRight className="hidden h-3 w-3 shrink-0 sm:block" />
          <Link to="/boutique/$productId" params={{ productId }} className="hidden max-w-[40vw] truncate hover:text-primary sm:block">{p.name}</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground">Détails</span>
        </nav>
      </div>


      {/* Hero */}
      <section className="border-y bg-gradient-to-br from-primary via-primary to-primary/85 py-8 text-primary-foreground sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-energy px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-energy-foreground">
              <BadgeCheck className="h-3.5 w-3.5" /> Caractéristiques techniques
            </span>
            <h1 className="mt-4 text-display text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">{p.name}</h1>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                { k: "Marque", v: p.brand ?? "CONETEC" },
                { k: "Modèle", v: p.sku ?? p.id.slice(0, 8).toUpperCase() },
                { k: "Disponibilité", v: p.show_stock_public ? `${p.stock} en stock` : (p.stock > 0 ? "En stock" : "Sur commande") },
                { k: "Livraison", v: areaLabel || "Kinshasa et environs" },
              ].map((s) => (
                <div key={s.k} className="min-w-0 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/60">{s.k}</div>
                  <div className="truncate text-sm font-semibold">{s.v}</div>
                </div>
              ))}
            </div>
            {p.description?.trim() && (
              <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-primary-foreground/85 line-clamp-4">
                {p.description.trim()}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-primary-foreground/80">
              <a href="#avis" className="flex items-center gap-1.5 hover:text-primary-foreground">
                <Stars value={stats.count ? stats.average : 0} />
                {stats.count ? `${stats.average.toFixed(1)}/5 · ${stats.count} avis` : "Aucun avis pour l'instant"}
              </a>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 shrink-0 text-energy" /> Garantie incluse</span>
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 shrink-0 text-energy" /> Livraison {areaLabel || "Kinshasa et environs"}</span>
              <span className="flex items-center gap-1.5"><Wrench className="h-4 w-4 shrink-0 text-energy" /> Pose par nos techniciens</span>
            </div>

          </div>

          {/* Buy box */}
          <div className="rounded-2xl border border-primary-foreground/15 bg-background p-4 text-foreground shadow-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {p.stock > 0
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-energy/10 px-3 py-1 text-xs font-bold text-energy"><span className="h-1.5 w-1.5 rounded-full bg-energy" /> Disponible</span>
                : <Badge variant="destructive">Rupture de stock</Badge>}
              <Badge variant="outline" className="max-w-[50%] truncate border-primary/20 text-primary">{p.brand ?? "CONETEC"}</Badge>
            </div>
            <div className="mt-4 text-display text-3xl font-extrabold text-primary sm:text-4xl">{formatMoney(price, cur, rate)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Prix HT · TVA applicable selon règlementation</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-md border bg-background">
                <button className="px-3 py-2 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button className="px-3 py-2 text-lg" onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <Button
                className="min-w-[180px] flex-1 bg-energy text-energy-foreground hover:bg-energy/90"
                disabled={p.stock <= 0}
                onClick={() => { add({ product_id: p.id, name: p.name, price_usd: price, image: images[0] ?? null, qty }); toast.success("Ajouté au panier"); }}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
              </Button>
            </div>
            <Button
              className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={p.stock <= 0}
              onClick={() => {
                add({ product_id: p.id, name: p.name, price_usd: price, image: images[0] ?? null, qty });
                navigate({ to: "/checkout" });
              }}
            >
              Acheter maintenant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {areaLabel && (
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Livraison : {areaLabel}
              </p>
            )}
            <ShareButton
              title={p.name}
              text={`Découvrez ${p.name} chez CONETEC`}
              size="default"
              className="mt-3 w-full"
              label="Partager ce produit"
            />
            <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-primary" /> Paiement Mobile Money, cash ou virement</p>
              <p className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5 text-primary" /> Échange sous 7 jours si non conforme</p>
              <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> Expédition sous 24–48h</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Gallery */}
        {images.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <SectionTitle icon={Package} title="Galerie du produit" subtitle="Photos réelles du matériel en stock" />
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative overflow-hidden rounded-2xl border bg-secondary aspect-[4/3]">
                <StorageImage
                  src={images[activeImg]}
                  alt={p.name}
                  className="h-full w-full object-cover"
                  fallback={<div className="grid h-full w-full place-items-center"><Package className="h-24 w-24 text-muted-foreground/30" /></div>}
                />
              </div>
              <div className="grid grid-cols-4 gap-3 lg:grid-cols-1">
                {images.slice(0, 8).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 bg-secondary transition-all ${activeImg === i ? "border-energy" : "border-transparent hover:border-border"}`}
                  >
                    <StorageImage src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Autres descriptions */}
        <section className="mb-10 sm:mb-14">
          <SectionTitle icon={FileText} title="Autres descriptions" subtitle="Informations complémentaires fournies par CONETEC" />
          <div className="mt-5 rounded-2xl border bg-background p-5 sm:p-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
              {p.description?.trim()
                || "Aucune description détaillée n'a encore été publiée pour ce produit. Contactez notre équipe technique pour obtenir la fiche complète et les conseils d'installation."}
            </p>
          </div>
        </section>

        {/* Ce qui est inclus */}
        <section className="mb-10 sm:mb-14">
          <SectionTitle icon={CheckCircle2} title="Ce qui est inclus" subtitle="Livré avec chaque commande CONETEC" />
          <ul className="mt-5 grid gap-3 rounded-2xl border bg-background p-5 text-sm sm:grid-cols-2 sm:p-6">
            {[
              "Produit neuf avec emballage d'origine",
              "Garantie constructeur et facture officielle CONETEC",
              "Conseil technique gratuit avant et après achat",
              "Devis d'installation sur demande",
              "Service après-vente et pièces de rechange",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-energy" />
                <span className="text-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
        </section>


        {/* Why buy */}
        <section className="mb-10 sm:mb-14">
          <SectionTitle icon={Zap} title="Pourquoi choisir ce produit" subtitle="Les avantages concrets pour votre installation" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Perk icon={ShieldCheck} title="Qualité certifiée" text="Matériel conforme aux normes, sourcé auprès de fournisseurs agréés." />
            <Perk icon={Wrench} title="Installation clé en main" text="Nos techniciens posent, configurent et testent sur site." />
            <Perk icon={HeadphonesIcon} title="Support 7j/7" text="Assistance téléphonique et WhatsApp après achat." />
            <Perk icon={Truck} title="Livraison rapide" text={areaLabel ? `Livraison : ${areaLabel}.` : "Kinshasa et environs, retrait boutique possible."} />
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10 sm:mb-14">
          <SectionTitle icon={HeadphonesIcon} title="Questions fréquentes" subtitle="Tout ce qu'il faut savoir avant de commander" />
          <div className="mt-5 rounded-2xl border bg-background px-4 sm:px-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="1">
                <AccordionTrigger className="text-sm">Quels sont les délais de livraison ?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Expédition sous 24 à 48h pour les articles en stock à Kinshasa. {areaLabel ? `Zones desservies : ${areaLabel}.` : "Pour les autres provinces, nous convenons du transporteur avec vous lors de la confirmation de commande."}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="2">
                <AccordionTrigger className="text-sm">Comment puis-je payer ?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Mobile Money (Airtel Money, M-Pesa, Orange Money) directement en ligne, ou en cash / virement bancaire en boutique.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="3">
                <AccordionTrigger className="text-sm">L'installation est-elle possible ?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">Oui. Nos techniciens interviennent pour la pose, le raccordement et la mise en service. Demandez un devis d'installation gratuit.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="4">
                <AccordionTrigger className="text-sm">Quelle garantie s'applique ?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">La garantie constructeur s'applique dès la facture. En cas de défaut à la réception, l'échange est possible sous 7 jours.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Reviews */}
        <section id="avis" className="mb-10 scroll-mt-24 sm:mb-14">
          <SectionTitle icon={Star} title="Avis clients" subtitle="Ce que nos clients disent de ce produit" />
          <div className="mt-5"><ProductReviews productId={productId} /></div>
        </section>

        {/* CTA */}
        <section className="mb-10 grid gap-4 rounded-2xl border-l-4 border-l-energy bg-primary p-5 text-primary-foreground sm:mb-14 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-display text-lg font-extrabold sm:text-xl">Prêt à commander « {p.name} » ?</h2>
            <p className="mt-1 text-sm text-primary-foreground/80">Ajoutez-le au panier ou demandez un devis avec installation incluse.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-energy text-energy-foreground hover:bg-energy/90"
              disabled={p.stock <= 0}
              onClick={() => { add({ product_id: p.id, name: p.name, price_usd: price, image: images[0] ?? null, qty }); toast.success("Ajouté au panier"); }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
            </Button>
            <Button
              variant="secondary"
              disabled={p.stock <= 0}
              onClick={() => {
                add({ product_id: p.id, name: p.name, price_usd: price, image: images[0] ?? null, qty });
                navigate({ to: "/checkout" });
              }}
            >
              Acheter maintenant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link to="/devis"><Button variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">Demander un devis</Button></Link>
          </div>
        </section>

        {/* Related */}
        {!!related?.length && (
          <section>
            <SectionTitle icon={Package} title="Produits similaires" subtitle="D'autres références qui pourraient vous intéresser" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((r: any) => (
                <Link
                  key={r.id}
                  to="/produit/$productId"
                  params={{ productId: r.id }}
                  className="group overflow-hidden rounded-2xl border border-l-4 border-l-energy bg-background shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="aspect-square overflow-hidden bg-secondary">
                    <StorageImage
                      src={r.images?.[0]}
                      alt={r.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      fallback={<div className="grid h-full w-full place-items-center"><Package className="h-10 w-10 text-muted-foreground/30" /></div>}
                    />
                  </div>
                  <div className="p-4">
                    <ProductIdentity className="min-h-[2.5rem] group-hover:text-primary" name={r.name} brand={r.brand} sku={r.sku} id={r.id} />
                    <div className="mt-2 text-display text-lg font-extrabold text-primary">{formatMoney(Number(r.sale_price), cur, rate)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground sm:h-10 sm:w-10"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <h2 className="text-display text-lg font-extrabold sm:text-xl">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}

function Perk({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-background p-5 transition-shadow hover:shadow-md">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-energy/10 text-energy"><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-sm font-bold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}


