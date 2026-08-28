import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, ArrowUpCircle, Download, PackageSearch } from "lucide-react";
import { exportToXlsx } from "@/lib/xlsx-export";
import { offlineQueryFn } from "@/lib/offline/query";

export const Route = createFileRoute("/_authenticated/admin/stock")({ component: StockPage });

type Reason = "sale" | "sale_cancel" | "purchase" | "manual_in" | "manual_out" | "correction" | "return";

const REASON_LABELS: Record<Reason, string> = {
  sale: "Vente",
  sale_cancel: "Annulation vente",
  purchase: "Achat / réception",
  manual_in: "Entrée manuelle",
  manual_out: "Sortie manuelle",
  correction: "Correction",
  return: "Retour client",
};

type Movement = {
  id: string;
  product_id: string;
  delta: number;
  reason: Reason;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  user_id: string | null;
  created_at: string;
  products?: { id: string; name: string; sku: string | null; stock: number } | null;
};

function StockPage() {
  const [productId, setProductId] = useState<string>("all");
  const [reason, setReason] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["stock-products"],
    queryFn: offlineQueryFn("query:stock-products", async () => (await supabase.from("products").select("id,name,sku,stock,low_stock_threshold").order("name")).data ?? [], "table:products"),
  });

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements", productId, reason, from, to],
    queryFn: offlineQueryFn("query:stock-movements", async () => {
      let query = supabase
        .from("stock_movements")
        .select("*, products(id,name,sku,stock)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (productId !== "all") query = query.eq("product_id", productId);
      if (reason !== "all") query = query.eq("reason", reason as Reason);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to + "T23:59:59");
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Movement[];
    }, "table:stock_movements"),
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return movements.filter((m) => {
      const matchesProduct = productId === "all" || m.product_id === productId;
      const matchesReason = reason === "all" || m.reason === reason;
      const matchesFrom = !from || m.created_at >= from;
      const matchesTo = !to || m.created_at <= `${to}T23:59:59`;
      const matchesText = !needle || (m.products?.name ?? "").toLowerCase().includes(needle) || (m.products?.sku ?? "").toLowerCase().includes(needle);
      return matchesProduct && matchesReason && matchesFrom && matchesTo && matchesText;
    });
  }, [movements, q, productId, reason, from, to]);

  const totals = useMemo(() => {
    let inQty = 0;
    let outQty = 0;
    for (const m of filtered) {
      if (m.delta > 0) inQty += m.delta;
      else outQty += Math.abs(m.delta);
    }
    return { inQty, outQty, net: inQty - outQty, count: filtered.length };
  }, [filtered]);

  const lowStock = useMemo(
    () =>
      (products as { id: string; name: string; sku: string | null; stock: number; low_stock_threshold: number | null }[])
        .filter((p) => p.stock <= (p.low_stock_threshold ?? 5))
        .slice(0, 8),
    [products],
  );

  const handleExport = () => {
    exportToXlsx(
      `mouvements-stock-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filtered.map((m) => ({
        Date: new Date(m.created_at).toLocaleString("fr-FR"),
        Produit: m.products?.name ?? "—",
        SKU: m.products?.sku ?? "",
        Motif: REASON_LABELS[m.reason],
        Quantité: m.delta,
        Référence: m.ref_type ? `${m.ref_type}:${m.ref_id ?? ""}` : "",
        Note: m.note ?? "",
      })),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl md:text-3xl font-bold">Traçabilité du stock</h1>
          <p className="text-sm text-muted-foreground">Historique complet des mouvements et alertes de rupture.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!filtered.length}>
          <Download className="mr-2 h-4 w-4" />
          Exporter Excel
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Mouvements</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Entrées</div><div className="text-2xl font-bold text-emerald-600">+{totals.inQty}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sorties</div><div className="text-2xl font-bold text-red-600">−{totals.outQty}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Solde net</div><div className={`text-2xl font-bold ${totals.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{totals.net >= 0 ? "+" : ""}{totals.net}</div></CardContent></Card>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-warning" />
              <h2 className="font-semibold">Produits en alerte de stock</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p) => (
                <Badge key={p.id} variant={p.stock <= 0 ? "destructive" : "secondary"} className="cursor-pointer" onClick={() => setProductId(p.id)}>
                  {p.name} · {p.stock}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <Label>Produit</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  {(products as { id: string; name: string }[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motif</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {(Object.keys(REASON_LABELS) as Reason[]).map((r) => (
                    <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div><Label>Recherche</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou SKU…" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Stock actuel</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Aucun mouvement trouvé.</TableCell></TableRow>}
              {filtered.map((m) => {
                const positive = m.delta > 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">
                      {m.products?.name ?? "—"}
                      {m.products?.sku && <div className="text-xs text-muted-foreground font-mono">{m.products.sku}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{REASON_LABELS[m.reason]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-1 font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {positive ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
                        {positive ? "+" : ""}{m.delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{m.products?.stock ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.ref_type ? `${m.ref_type}` : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">{m.note ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
