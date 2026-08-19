import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, useSettings, convertToUsd, type Currency } from "@/lib/currency";
import { Search, Plus, Minus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { downloadReceipt } from "@/lib/pdf";
import { useLogoDataUrl } from "@/lib/logo";
import { getStoredDocumentTemplate } from "@/lib/document-template";
import { issueDocumentNumber, labelToDocType } from "@/lib/documents";
import { CustomerQuickAdd } from "@/components/customer-quick-add";
import { Checkbox } from "@/components/ui/checkbox";
import { SalePreviewDialog } from "@/components/pos/sale-preview-dialog";
import type { ReceiptData } from "@/lib/pdf";
import { isOffline, queueOperation } from "@/lib/offline/sync";

export const Route = createFileRoute("/_authenticated/admin/pos")({
  component: PosPage,
});

type Product = { id: string; name: string; sku: string | null; sale_price: number; stock: number; status: string };
type CartLine = { product_id: string; name: string; qty: number; unit_price_usd: number; discount_usd: number; stock: number };
type PaymentLine = { method: "cash" | "mobile_money" | "card" | "bank_transfer" | "credit"; amount: number; currency: Currency; reference?: string };

function PosPage() {
  const { data: settings } = useSettings();
  const logoDataUrl = useLogoDataUrl();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<PaymentLine[]>([{ method: "cash", amount: 0, currency }]);
  const [note, setNote] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [documentType, setDocumentType] = useState<"Facture" | "Reçu" | "Aucun">("Reçu");
  const qc = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["pos-products", q],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,sku,sale_price,stock,status").eq("status", "active").order("name").limit(30);
      if (q) query = query.ilike("name", `%${q}%`);
      return ((await query).data ?? []) as Product[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["pos-customers"],
    queryFn: async () => (await supabase.from("customers").select("id,name,phone").eq("is_archived", false).order("name")).data ?? [],
  });

  const subtotal = cart.reduce((a, l) => a + l.qty * l.unit_price_usd - l.discount_usd, 0);
  const total = Math.max(subtotal - discount, 0);
  const paidUsd = payments.reduce((a, p) => a + convertToUsd(p.amount, p.currency, rate), 0);
  const remaining = total - paidUsd;

  function addToCart(p: Product) {
    setCart((c) => {
      const found = c.find((l) => l.product_id === p.id);
      if (found) {
        if (found.qty >= p.stock) { toast.warning("Stock insuffisant"); return c; }
        return c.map((l) => l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l);
      }
      if (p.stock <= 0) { toast.warning("Rupture de stock"); return c; }
      return [...c, { product_id: p.id, name: p.name, qty: 1, unit_price_usd: Number(p.sale_price), discount_usd: 0, stock: p.stock }];
    });
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Panier vide");
      if ((isCredit || remaining > 0.01) && !customerId) throw new Error("Un client est requis pour un paiement à crédit.");
      const rpcArgs = {
        _customer_id: (customerId ?? null) as unknown as string,
        _items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price_usd: l.unit_price_usd, discount_usd: l.discount_usd })),
        _payments: payments.filter((p) => p.amount > 0).map((p) => ({ method: p.method, amount: p.amount, currency: p.currency, reference: p.reference })),
        _discount_usd: discount,
        _note: note || undefined,
      };
      if (isOffline()) {
        await queueOperation("pos_sale", `Vente ${formatMoney(total, currency, rate)}`, {
          customer_id: rpcArgs._customer_id,
          items: rpcArgs._items,
          payments: rpcArgs._payments,
          discount_usd: discount,
          note: note || null,
          due_date: isCredit && dueDate ? dueDate : null,
        });
        return null;
      }
      const { data, error } = await supabase.rpc("create_pos_sale", {
        _customer_id: (customerId ?? null) as unknown as string,
        _items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price_usd: l.unit_price_usd, discount_usd: l.discount_usd })),
        _payments: payments.filter((p) => p.amount > 0).map((p) => ({ method: p.method, amount: p.amount, currency: p.currency, reference: p.reference })),
        _discount_usd: discount,
        _note: note || undefined,
      });
      if (error) throw error;
      const saleId = data as string;
      if (isCredit && dueDate) {
        await supabase.from("sales").update({ due_date: dueDate }).eq("id", saleId);
      }
      return saleId;
    },
    onSuccess: async (saleId) => {
      await createNotification({
        title: "Nouvelle vente",
        message: `Une vente a été enregistrée pour ${cart.length} article${cart.length > 1 ? "s" : ""}.`,
        type: "success",
        entity_type: "sale"
      });
      toast.success("Vente enregistrée");
      const [{ data: sale }, { data: items }] = await Promise.all([
        supabase.from("sales").select("*, customers(name)").eq("id", saleId).maybeSingle(),
        supabase.from("sale_items").select("*").eq("sale_id", saleId),
      ]);
      if (sale) {
        const customerName = (sale as { customers?: { name?: string } }).customers?.name ?? "Client anonyme";
        if (documentType !== "Aucun") {
          const docLabel = documentType;
          let docCode = sale.code;
          try {
            const issued = await issueDocumentNumber({
              docType: labelToDocType(docLabel),
              saleId,
              customerName,
              totalUsd: Number(sale.total_usd),
            });
            docCode = issued.code;
          } catch (err) {
            console.warn("Numérotation document indisponible", err);
          }
          downloadReceipt({
            logoDataUrl,
            shopName: settings?.shop_name ?? "CONETEC",
            address: settings?.address ?? "",
            phone: settings?.phone ?? "",
            code: docCode, customer: customerName,
            items: (items ?? []).map((i) => ({ name: i.product_name, qty: i.qty, unit: Number(i.unit_price_usd), total: Number(i.line_total_usd) })),
            subtotal: Number(sale.subtotal_usd), discount: Number(sale.discount_usd), total: Number(sale.total_usd),
            paid: Number(sale.paid_usd), credit: Number(sale.credit_usd), currency, rate,
            documentType: docLabel, template: getStoredDocumentTemplate(),
          });
        }
      }
      setCart([]); setDiscount(0); setNote(""); setPayments([{ method: "cash", amount: 0, currency }]); setCustomerId(null); setIsCredit(false); setDueDate(""); setDocumentType("Reçu");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message.replace("insufficient_stock:", "Stock insuffisant: ")),
  });

  const filtered = useMemo(() => products ?? [], [products]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* Products */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" className="pl-9 h-11" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => addToCart(p)} className="text-left group">
              <Card className="transition-all group-hover:border-primary group-hover:shadow-md">
                <CardContent className="p-4">
                  <div className="font-medium line-clamp-2">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku ?? "—"}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-display font-bold text-primary">{formatMoney(Number(p.sale_price), currency, rate)}</span>
                    <span className={`text-xs ${p.stock <= 0 ? "text-destructive" : "text-muted-foreground"}`}>Stock: {p.stock}</span>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-8 text-center">Aucun produit.</p>}
        </div>
      </div>

      {/* Cart */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-display font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Panier ({cart.length})</h2>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Client</Label>
              <CustomerQuickAdd onCreated={(id) => setCustomerId(id)} triggerLabel="+ Nouveau client" />
            </div>
            <Select value={customerId ?? "none"} onValueChange={(v) => setCustomerId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Client anonyme" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Client anonyme</SelectItem>
                {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-2 bg-muted/30">
            <Checkbox id="credit-toggle" checked={isCredit} onCheckedChange={(v) => setIsCredit(!!v)} />
            <label htmlFor="credit-toggle" className="text-sm font-medium cursor-pointer">Accorder un crédit</label>
            {isCredit && (
              <Input type="date" className="h-8 ml-auto w-40" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Échéance" />
            )}
          </div>
          <div className="max-h-64 overflow-auto space-y-2">
            {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Ajoutez des produits…</p>}
            {cart.map((l) => (
              <div key={l.product_id} className="flex items-center gap-2 border rounded-md p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{formatMoney(l.unit_price_usd, currency, rate)} × {l.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setCart((c) => c.map((x) => x.product_id === l.product_id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm">{l.qty}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setCart((c) => c.map((x) => x.product_id === l.product_id ? { ...x, qty: Math.min(x.stock, x.qty + 1) } : x))}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCart((c) => c.filter((x) => x.product_id !== l.product_id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm"><span>Sous-total</span><span>{formatMoney(subtotal, currency, rate)}</span></div>
            <div className="flex items-center justify-between text-sm">
              <span>Accorder un crédit</span>
              <Input type="number" step="0.01" className="w-24 h-8" value={discount} onChange={(e) => setDiscount(+e.target.value)} />
            </div>
            <div className="flex justify-between text-lg font-bold text-display"><span>Total</span><span>{formatMoney(total, currency, rate)}</span></div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <Label>Paiements</Label>
            {payments.map((p, i) => (
              <div key={i} className="flex gap-1">
                <Select value={p.method} onValueChange={(v) => setPayments((ps) => ps.map((x, j) => j === i ? { ...x, method: v as PaymentLine["method"] } : x))}>
                  <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="bank_transfer">Virement</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" placeholder="Montant" className="h-9" value={p.amount || ""} onChange={(e) => setPayments((ps) => ps.map((x, j) => j === i ? { ...x, amount: +e.target.value } : x))} />
                <Select value={p.currency} onValueChange={(v) => setPayments((ps) => ps.map((x, j) => j === i ? { ...x, currency: v as Currency } : x))}>
                  <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CDF">CDF</SelectItem></SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setPayments((ps) => [...ps, { method: "cash", amount: 0, currency }])}>+ Ajouter un paiement</Button>
            <div className="flex justify-between text-sm mt-2">
              <span>Payé</span><span>{formatMoney(paidUsd, currency, rate)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${remaining > 0.01 ? "text-warning-foreground" : "text-success"}`}>
              <span>Reste (crédit)</span><span>{formatMoney(Math.max(remaining, 0), currency, rate)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Document à générer</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as "Facture" | "Reçu" | "Aucun")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Reçu">Reçu (par défaut)</SelectItem>
                <SelectItem value="Facture">Facture (à la demande du client)</SelectItem>
                <SelectItem value="Aucun">Aucun document</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {documentType === "Aucun" ? "Aucun document ne sera généré." : `Un ${documentType.toLowerCase()} numéroté sera généré automatiquement.`}
            </p>
          </div>
          <Input placeholder="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
          <SalePreviewDialog
            disabled={cart.length === 0 || documentType === "Aucun"}
            buildData={(): ReceiptData | null => {
              if (cart.length === 0) return null;
              const customerName = customers?.find((c) => c.id === customerId)?.name ?? "Client anonyme";
              const docLabel: "Facture" | "Reçu" = documentType === "Facture" ? "Facture" : "Reçu";
              return {
                shopName: settings?.shop_name ?? "CONETEC",
                address: settings?.address ?? "",
                phone: settings?.phone ?? "",
                code: "APERÇU",
                customer: customerName,
                items: cart.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit_price_usd, total: l.qty * l.unit_price_usd - l.discount_usd })),
                subtotal, discount, total,
                paid: paidUsd, credit: Math.max(remaining, 0),
                currency, rate,
                documentType: docLabel,
                template: "custom",
              };
            }}
          />
          <Button className="w-full" size="lg" disabled={submit.isPending || cart.length === 0} onClick={() => submit.mutate()}>
            {submit.isPending ? "Enregistrement…" : "Valider la vente"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
