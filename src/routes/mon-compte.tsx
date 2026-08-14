import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/public/site-shell";
import { SiteMap } from "@/components/public/site-map";
import { AccountAddresses } from "@/components/public/account-addresses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { Package, Wallet, Gift, LogOut, Send, User as UserIcon, Search, Truck, FileDown, Link2, MapPin } from "lucide-react";
import { OrderTimeline, ORDER_STATUS_LABEL } from "@/components/public/order-timeline";
import { useSettings } from "@/lib/currency";
import { downloadOnlineOrderDocument } from "@/lib/order-pdf";


const fmtUsd = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;



export const Route = createFileRoute("/mon-compte")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Mon compte — CONETEC" },
      { name: "description", content: "Espace client CONETEC : suivez vos commandes, votre solde, vos bonus fidélité et contactez la boutique." },
      { property: "og:title", content: "Mon compte CONETEC" },
      { property: "og:description", content: "Commandes, solde, bonus fidélité et contact direct avec la boutique CONETEC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ORDER_LABEL = ORDER_STATUS_LABEL;

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "all", label: "Toutes", match: () => true },
  { key: "progress", label: "En cours", match: (s) => ["pending", "confirmed", "preparing", "shipping"].includes(s) },
  { key: "delivered", label: "Livrées", match: (s) => s === "delivered" },
  { key: "cancelled", label: "Annulées", match: (s) => s === "cancelled" || s === "refunded" },
];


function AccountPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [track, setTrack] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const { data: settings } = useSettings();


  const { data: profile } = useQuery({
    queryKey: ["account", "profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["account", "orders", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_orders")
        .select("id, code, created_at, status, total_usd, subtotal_usd, delivery_fee_usd, paid, payment_status, delivery_mode, delivery_address, customer_name, customer_phone, order_items(product_name, qty, unit_price_usd, line_total_usd)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  // Rattachement automatique des commandes passées sans compte (email / téléphone).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("claim_my_orders");
      if (!cancelled && Number(data) > 0) {
        toast.success(`${data} commande(s) passée(s) avant votre inscription ont été liées à votre compte.`);
        qc.invalidateQueries({ queryKey: ["account", "orders", user.id] });
      }
    })();
    return () => { cancelled = true; };
  }, [user.id, profile?.phone, qc]);

  async function claimByCode(e: React.FormEvent) {
    e.preventDefault();
    const code = claimCode.trim();
    if (!code) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_order_by_code", { _code: code });
    setClaiming(false);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (error || !res?.ok) {
      const reason = res?.reason;
      toast.error(
        reason === "not_found" ? "Commande introuvable."
        : reason === "already_linked" ? "Cette commande est déjà liée à un autre compte."
        : reason === "mismatch" ? "Le numéro ne correspond pas à votre email ou téléphone."
        : "Rattachement impossible.",
      );
      return;
    }
    toast.success("Commande rattachée à votre compte.");
    setClaimCode("");
    qc.invalidateQueries({ queryKey: ["account", "orders", user.id] });
  }

  async function downloadDoc(o: { code: string }) {
    const order = (orders ?? []).find((x) => x.code === o.code);
    if (!order) return;
    try {
      await downloadOnlineOrderDocument(
        {
          code: order.code,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          delivery_address: order.delivery_address,
          delivery_fee_usd: Number(order.delivery_fee_usd ?? 0),
          subtotal_usd: Number(order.subtotal_usd ?? order.total_usd),
          total_usd: Number(order.total_usd),
          paid: !!order.paid,
          order_items: (order.order_items ?? []).map((i) => ({
            product_name: i.product_name,
            qty: i.qty,
            unit_price_usd: Number(i.unit_price_usd),
            line_total_usd: Number(i.line_total_usd),
          })),
        },
        settings,
        order.paid ? "Reçu" : "Facture",
      );
    } catch {
      toast.error("Téléchargement impossible");
    }
  }



  const { data: customer } = useQuery({
    queryKey: ["account", "customer", user.email, profile?.phone],
    queryFn: async () => {
      const filters = [user.email ? `email.eq.${user.email}` : null, profile?.phone ? `phone.eq.${profile.phone}` : null].filter(Boolean).join(",");
      if (!filters) return null;
      const { data } = await supabase.from("customers").select("id, name, balance, credit_limit").or(filters).maybeSingle();
      return data;
    },
    enabled: !!(user.email || profile?.phone),
  });

  const delivered = (orders ?? []).filter((o) => o.status === "delivered");
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = (orders ?? []).filter((o) => activeFilter.match(o.status));
  const inProgress = (orders ?? []).filter((o) => ["pending", "confirmed", "preparing", "shipping"].includes(o.status));

  const spent = delivered.reduce((s, o) => s + Number(o.total_usd ?? 0), 0);
  const points = Math.floor(spent);
  const debt = Number(customer?.balance ?? 0);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <SiteShell>
      <section className="border-b bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:py-14">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-energy">Espace client</p>
            <h1 className="mt-2 text-display text-3xl md:text-4xl font-extrabold break-words">
              Bonjour {profile?.full_name || user.email}
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/80">Vous êtes connecté à votre compte CONETEC.</p>
          </div>
          <Button variant="secondary" onClick={signOut} className="self-start"><LogOut className="mr-2 h-4 w-4" />Se déconnecter</Button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Package} label="Commandes" value={String((orders ?? []).length)} hint={`${delivered.length} livrée(s)`} />
          <Stat icon={Truck} label="En cours" value={String(inProgress.length)} hint={inProgress.length ? `Dernière : ${inProgress[0].code}` : "Aucun suivi actif"} />
          <Stat icon={Wallet} label="Solde / dettes" value={fmtUsd(debt)} hint={debt > 0 ? "Montant dû à la boutique" : "Aucune dette"} />
          <Stat icon={Gift} label="Bonus fidélité" value={`${points} pts`} hint={`Sur ${fmtUsd(spent)} d'achats livrés`} />
        </div>


        <Card className="min-w-0">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-display text-xl font-bold flex items-center gap-2"><UserIcon className="h-5 w-5 text-energy" />Mes informations</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Nom" value={profile?.full_name || "—"} />
              <Info label="Email" value={user.email || "—"} />
              <Info label="Téléphone" value={profile?.phone || "—"} />
              <Info label="Client depuis" value={new Date(user.created_at).toLocaleDateString("fr-FR")} />
            </dl>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-display text-xl font-bold">Mes commandes & suivi</h2>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => {
                  const count = (orders ?? []).filter((o) => f.match(o.status)).length;
                  return (
                    <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)} className="h-8 text-xs">
                      {f.label} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
            {!orders?.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune commande pour le moment.
                <div className="mt-4"><Link to="/boutique"><Button>Découvrir la boutique</Button></Link></div>
              </div>
            ) : !filtered.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune commande dans cette catégorie.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {filtered.map((o) => (
                  <div key={o.id} className="rounded-lg border p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{o.code}</span>
                      <Badge variant={o.status === "delivered" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}>
                        {ORDER_LABEL[o.status] ?? o.status}
                      </Badge>
                      <Badge variant={o.paid ? "default" : "outline"}>{o.paid ? "Payé" : "Non payé"}</Badge>
                      <span className="ml-auto font-bold text-primary">{fmtUsd(Number(o.total_usd))}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("fr-FR")} · {o.delivery_mode === "pickup" ? "Retrait" : "Livraison"}
                    </div>
                    <OrderTimeline status={o.status} mode={o.delivery_mode} className="mt-4" />
                    <ul className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                      {(o.order_items ?? []).map((it, i) => (
                        <li key={i} className="break-words">{it.qty} × {it.product_name} — {fmtUsd(Number(it.line_total_usd))}</li>
                      ))}
                    </ul>
                    <Link to="/commande/$code" params={{ code: o.code }} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                      Voir le suivi détaillé →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-display text-xl font-bold">Suivre une commande passée sans compte</h2>
            <p className="mt-1 text-sm text-muted-foreground">Entrez le numéro reçu lors de votre achat (ex. CMD-20260813-0001).</p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => { e.preventDefault(); const c = track.trim(); if (c) navigate({ to: "/commande/$code", params: { code: c } }); }}
            >
              <Input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="CMD-…" className="uppercase" />
              <Button type="submit" className="sm:w-auto"><Search className="mr-2 h-4 w-4" />Suivre</Button>
            </form>
          </CardContent>
        </Card>


        <div className="grid gap-6 lg:grid-cols-2">
          <ContactCard defaultName={profile?.full_name ?? ""} defaultEmail={user.email ?? ""} defaultPhone={profile?.phone ?? ""} />
          <Card className="min-w-0">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-display text-xl font-bold">Nous trouver</h2>
              <p className="mt-1 text-sm text-muted-foreground">Nos bureaux et notre showroom.</p>
              <SiteMap className="mt-4" height={300} />
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Package; label: string; value: string; hint: string }) {
  return (
    <Card className="min-w-0 border-l-4 border-l-energy">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}</div>
          <div className="text-xs text-muted-foreground break-words">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

function ContactCard({ defaultName, defaultEmail, defaultPhone }: { defaultName: string; defaultEmail: string; defaultPhone: string }) {
  const [form, setForm] = useState({ name: defaultName, phone: defaultPhone, email: defaultEmail, subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Nom et téléphone requis");
    setLoading(true);
    const { error } = await supabase.from("quote_requests").insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      service: form.subject || "Message client",
      message: form.message || null,
    });
    setLoading(false);
    if (error) return toast.error("Envoi impossible");
    await createNotification({
      title: "Message d'un client",
      message: `${form.name} a envoyé un message depuis son espace client.`,
      type: "info",
      entity_type: "quote_request",
    });
    toast.success("Message envoyé à la boutique.");
    setForm({ ...form, subject: "", message: "" });
  }

  return (
    <Card className="min-w-0 border-t-4 border-t-energy">
      <CardContent className="p-4 sm:p-6">
        <h2 className="text-display text-xl font-bold">Contacter la boutique</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Téléphone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+243 …" /></div>
          </div>
          <div><Label>Objet</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Commande, SAV, devis…" /></div>
          <div><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button type="submit" className="w-full bg-energy text-energy-foreground hover:bg-energy/90" disabled={loading}>
            {loading ? "Envoi…" : (<><Send className="mr-2 h-4 w-4" />Envoyer</>)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
