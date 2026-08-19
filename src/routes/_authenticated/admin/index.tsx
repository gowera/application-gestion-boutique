import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSettings, formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { AlertTriangle, DollarSign, ShoppingCart, Package, Users, Banknote, HandCoins, ArrowRight, Store } from "lucide-react";
import { WindowsAppCard } from "@/components/admin/windows-app-card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;

  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const now = new Date();
      const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
      const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
      const startMonth = new Date(now); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

      const [dayRes, weekRes, monthRes, lowStockRes, customersRes] = await Promise.all([
        supabase.from("sales").select("total_usd").eq("status", "completed").gte("created_at", startDay.toISOString()),
        supabase.from("sales").select("total_usd").eq("status", "completed").gte("created_at", startWeek.toISOString()),
        supabase.from("sales").select("total_usd").eq("status", "completed").gte("created_at", startMonth.toISOString()),
        supabase.from("products").select("id, name, stock, low_stock_threshold").order("stock"),
        supabase.from("customers").select("id, name, balance").gt("balance", 0),
      ]);
      const sum = (r: { data: { total_usd: number }[] | null }) => (r.data ?? []).reduce((a, b) => a + Number(b.total_usd || 0), 0);
      const threshold = 5;
      const low = (lowStockRes.data ?? []).filter((p) => p.stock <= (p.low_stock_threshold ?? threshold));
      return {
        today: sum(dayRes), todayCount: dayRes.data?.length ?? 0,
        week: sum(weekRes), month: sum(monthRes),
        low, debts: customersRes.data ?? [],
      };
    },
  });

  const { data: last30 } = useQuery({
    queryKey: ["dashboard-30d"],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("sales").select("created_at,total_usd").eq("status", "completed").gte("created_at", start.toISOString());
      const map = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        map.set(d.toISOString().slice(0, 10), 0);
      }
      (data ?? []).forEach((s) => {
        const k = s.created_at.slice(0, 10);
        map.set(k, (map.get(k) ?? 0) + Number(s.total_usd || 0));
      });
      return Array.from(map.entries()).map(([date, total]) => ({ date: date.slice(5), total }));
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["dashboard-top-products"],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 30);
      const { data } = await supabase.from("sale_items").select("product_name,qty,line_total_usd,sales!inner(created_at,status)")
        .gte("sales.created_at", start.toISOString()).eq("sales.status", "completed");
      const agg = new Map<string, number>();
      (data ?? []).forEach((r) => agg.set(r.product_name, (agg.get(r.product_name) ?? 0) + Number(r.qty)));
      return Array.from(agg.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty }));
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const debtsTotal = (kpis?.debts ?? []).reduce((a, b) => a + Number(b.balance), 0);
  const topDebtors = [...(kpis?.debts ?? [])].sort((a, b) => Number(b.balance) - Number(a.balance)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[#001a4d] p-6 md:p-8 text-primary-foreground shadow-xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-energy/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-energy/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-energy">Pilotage</p>
            <h1 className="mt-2 text-display text-3xl md:text-4xl font-extrabold">Tableau de bord</h1>
            <p className="mt-2 text-sm text-primary-foreground/80">Vue synthétique et temps réel de l'activité CONETEC.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="lg" className="gap-2 bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20"><Link to="/boutique" target="_blank" rel="noreferrer"><ArrowRight className="h-4 w-4" />Voir le site</Link></Button>
            <Button asChild size="lg" className="gap-2 bg-white text-primary hover:bg-white/90"><Link to="/admin/pos"><Store className="h-4 w-4" />Vente directe</Link></Button>
            <Button asChild size="lg" className="gap-2 bg-energy text-energy-foreground hover:bg-energy/90"><Link to="/admin/reports"><Banknote className="h-4 w-4" />Rapport de caisse</Link></Button>
          </div>

        </div>
      </div>

      <WindowsAppCard />

      {/* À recouvrer — highlight */}
      <Card className="overflow-hidden rounded-2xl border-warning/40 bg-gradient-to-br from-warning/10 via-transparent to-transparent shadow-sm">
        <CardContent className="p-5 flex flex-wrap items-center gap-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning/30 to-warning/10 text-warning-foreground shadow-inner">
            <HandCoins className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">À recouvrer</div>
            <div className="text-display text-3xl font-bold">{formatMoney(debtsTotal, currency, rate)}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpis?.debts.length ?? 0} client{(kpis?.debts.length ?? 0) > 1 ? "s" : ""} en dette</div>
          </div>
          {topDebtors.length > 0 && (
            <ul className="text-sm space-y-1 flex-1 min-w-[220px]">
              {topDebtors.map((d) => (
                <li key={d.id} className="flex justify-between gap-4">
                  <span className="truncate">{d.name}</span>
                  <span className="font-semibold text-warning-foreground">{formatMoney(Number(d.balance), currency, rate)}</span>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="rounded-full"><Link to="/admin/customers">Gérer les crédits<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} label="CA du jour" value={formatMoney(kpis?.today ?? 0, currency, rate)} sub={`${kpis?.todayCount ?? 0} ventes`} tone="from-primary/10 to-primary/0" />
        <Kpi icon={ShoppingCart} label="CA semaine (7j)" value={formatMoney(kpis?.week ?? 0, currency, rate)} tone="from-energy/15 to-energy/0" />
        <Kpi icon={DollarSign} label="CA mois en cours" value={formatMoney(kpis?.month ?? 0, currency, rate)} tone="from-[#006a6a]/15 to-transparent" />
        <Kpi icon={Users} label="Créances clients" value={formatMoney(debtsTotal, currency, rate)} sub={`${kpis?.debts.length ?? 0} clients`} tone="from-warning/15 to-transparent" />
      </div>


      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-display">Ventes des 30 derniers jours</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30 ?? []}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatMoney(Number(v), currency, rate)} />
                <Area type="monotone" dataKey="total" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-display">Top produits (30j)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts ?? []} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                <Tooltip />
                <Bar dataKey="qty" fill="var(--color-energy)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-display flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Stock faible</CardTitle></CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            {(kpis?.low ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun produit sous seuil. 🎉</p>
            ) : (
              <ul className="divide-y">
                {kpis!.low.slice(0, 10).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span className="truncate">{p.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.stock === 0 ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning-foreground"}`}>
                      {p.stock === 0 ? "Rupture" : `${p.stock} restant${p.stock > 1 ? "s" : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-display flex items-center gap-2"><Package className="h-4 w-4" /> Activité récente</CardTitle></CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            {(recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <ul className="divide-y text-sm">
                {(recentActivity ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <span className="font-mono text-xs">{a.action}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at, true)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof DollarSign; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className={`overflow-hidden rounded-2xl border-border/60 bg-gradient-to-br ${tone ?? "from-muted/40 to-transparent"} transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm"><Icon className="h-4 w-4" /></div>
        </div>
        <div className="mt-3 text-display text-2xl font-bold">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
