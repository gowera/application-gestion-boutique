import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSettings, formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { Plus, Wallet, Pencil, Archive, History, MessageCircle, Mail, Phone, Eye } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { isOffline, queueOperation } from "@/lib/offline/sync";
import { OfflineBanner } from "@/components/admin/offline-banner";
import { CreditProductPicker, creditLinesTotal, applyCreditStock, type CreditLine } from "@/components/credit-products";
import { offlineQueryFn } from "@/lib/offline/query";
import { cacheGet } from "@/lib/offline/store";
import { isOffline as offlineNow } from "@/lib/offline/sync";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: Page });

type Customer = {
  id: string; name: string; phone: string | null; email: string | null;
  address: string | null; credit_limit: number; balance: number; notes: string | null;
  is_archived: boolean; created_at: string;
};

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl font-bold">Clients & crédits</h1>
        <p className="text-sm text-muted-foreground">Répertoire, historique achats et gestion des dettes.</p>
      </div>
      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Clients</TabsTrigger>
          <TabsTrigger value="credits">Crédits & dettes</TabsTrigger>
        </TabsList>
        <TabsContent value="customers" className="mt-4"><CustomersTab /></TabsContent>
        <TabsContent value="credits" className="mt-4"><CreditsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Clients ---------------- */

function CustomersTab() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [edit, setEdit] = useState<Partial<Customer> | null>(null);
  const [history, setHistory] = useState<Customer | null>(null);
  const qc = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: offlineQueryFn("query:customers", async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Customer[];
    }, "table:customers"),
  });

  const filtered = useMemo(() => {
    const available = (customers ?? []).filter((customer) => showArchived || !customer.is_archived);
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, query, showArchived]);

  const save = useMutation({
    mutationFn: async (c: Partial<Customer>) => {
      if (!c.name?.trim()) throw new Error("Nom requis");
      const payload = {
        name: c.name, phone: c.phone || null, email: c.email || null,
        address: c.address || null, credit_limit: Number(c.credit_limit ?? 0), notes: c.notes || null,
      };
      const { error } = c.id
        ? await supabase.from("customers").update(payload).eq("id", c.id)
        : await supabase.from("customers").insert(payload);
      if (error) throw error;
      return c;
    },
    onSuccess: async (c) => {
      if (c.id) {
        await createNotification({ title: "Client mis à jour", message: `${c.name} a été mis à jour.`, type: "info", entity_type: "customer" });
      } else {
        await createNotification({ title: "Nouveau client", message: `${c.name} a été ajouté au carnet.`, type: "info", entity_type: "customer" });
      }
      toast.success("Enregistré"); qc.invalidateQueries({ queryKey: ["customers"] }); setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleArchive = useMutation({
    mutationFn: async (c: Customer) => {
      const { error } = await supabase.from("customers").update({ is_archived: !c.is_archived }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center flex-1 min-w-[200px]">
          <Input placeholder="Rechercher nom, téléphone, email…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Masquer archivés" : "Voir archivés"}
          </Button>
        </div>
        <Button onClick={() => setEdit({})}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Nom</TableHead><TableHead>Contacts</TableHead>
          <TableHead className="text-right">Limite crédit</TableHead>
          <TableHead className="text-right">Solde dû</TableHead>
          <TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id} className={c.is_archived ? "opacity-50" : ""}>
              <TableCell>
                <div className="font-medium">{c.name}{c.is_archived && <Badge variant="secondary" className="ml-2">Archivé</Badge>}</div>
                <div className="text-xs text-muted-foreground">{c.address ?? ""}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5 text-xs">
                  {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="h-3 w-3" />{c.phone}</a>}
                  {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{c.email}</a>}
                  {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline"><MessageCircle className="h-3 w-3" />WhatsApp</a>}
                </div>
              </TableCell>
              <TableCell className="text-right text-sm">{formatMoney(Number(c.credit_limit), currency, rate)}</TableCell>
              <TableCell className={`text-right font-medium ${Number(c.balance) > 0 ? "text-destructive" : ""}`}>{formatMoney(Number(c.balance), currency, rate)}</TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => setHistory(c)} title="Historique"><History className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEdit(c)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleArchive.mutate(c)} title={c.is_archived ? "Restaurer" : "Archiver"}><Archive className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun client</TableCell></TableRow>}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier client" : "Nouveau client"}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
            <div><Label>Limite de crédit (USD)</Label><Input type="number" value={edit.credit_limit ?? 0} onChange={(e) => setEdit({ ...edit, credit_limit: +e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button onClick={() => edit && save.mutate(edit)}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerHistoryDialog customer={history} onClose={() => setHistory(null)} />
    </div>
  );
}

function CustomerHistoryDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const { data: sales } = useQuery({
    queryKey: ["customer-sales", customer?.id],
    enabled: !!customer,
    queryFn: async () => offlineNow()
      ? ((await cacheGet<Array<{ id: string; customer_id: string; code: string; total_usd: number; paid_usd: number; credit_usd: number; status: string; created_at: string; due_date: string | null }>>("table:sales")) ?? []).filter((row) => row.customer_id === customer?.id).slice(0, 50)
      : (await supabase.from("sales").select("id,code,total_usd,paid_usd,credit_usd,status,created_at,due_date").eq("customer_id", customer?.id ?? "").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: ledger } = useQuery({
    queryKey: ["customer-ledger", customer?.id],
    enabled: !!customer,
    queryFn: async () => offlineNow()
      ? ((await cacheGet<LedgerRow[]>("table:customer_ledger")) ?? []).filter((row) => row.customer_id === customer?.id).slice(0, 50)
      : (await supabase.from("customer_ledger").select("*").eq("customer_id", customer?.id ?? "").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Historique — {customer?.name}</DialogTitle></DialogHeader>
        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">Ventes ({sales?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="ledger">Mouvements de compte ({ledger?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Code</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Payé</TableHead><TableHead className="text-right">Échéance</TableHead></TableRow></TableHeader>
              <TableBody>
                {sales?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{formatDate(s.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(s.total_usd), currency, rate)}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(s.paid_usd), currency, rate)}</TableCell>
                    <TableCell className={`text-right ${Number(s.credit_usd) > 0 ? "text-destructive" : ""}`}>{s.due_date ? formatDate(s.due_date) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="ledger" className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Motif</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>
                {ledger?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{formatDate(l.created_at, true)}</TableCell>
                    <TableCell>{l.reason}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(l.delta) > 0 ? "text-destructive" : "text-emerald-600"}`}>{Number(l.delta) > 0 ? "+" : ""}{formatMoney(Number(l.delta), currency, rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Crédits ---------------- */

type LedgerRow = {
  id: string; customer_id: string; delta: number; reason: string;
  created_at: string; due_date: string | null; method: string | null;
};

const METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte" },
  { value: "bank_transfer", label: "Virement bancaire" },
];
const methodLabel = (m: string | null) => METHODS.find((x) => x.value === m)?.label ?? "—";

function debtStatus(balance: number, due: string | null): { label: string; className: string } {
  if (balance <= 0) return { label: "Payé", className: "bg-emerald-600 text-white" };
  if (due && new Date(due) < new Date(new Date().toDateString())) return { label: "En retard", className: "bg-destructive text-destructive-foreground" };
  return { label: "En cours", className: "bg-amber-500 text-white" };
}

function CreditsTab() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const [pay, setPay] = useState<Customer | null>(null);
  const [grant, setGrant] = useState<Customer | null>(null);
  const [details, setDetails] = useState<Customer | null>(null);
  const [newDebt, setNewDebt] = useState(false);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [grantLines, setGrantLines] = useState<CreditLine[]>([]);
  const qc = useQueryClient();

  const { data: dueDates } = useQuery({
    queryKey: ["ledger-due-dates"],
    queryFn: async () => {
      const data = offlineNow()
        ? ((await cacheGet<Array<{ customer_id: string; due_date: string | null; delta: number }>>("table:customer_ledger")) ?? []).filter((row) => row.delta > 0 && row.due_date)
        : (await supabase
        .from("customer_ledger")
        .select("customer_id,due_date")
        .gt("delta", 0)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })).data;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { customer_id: string; due_date: string }[]) {
        if (!map[row.customer_id]) map[row.customer_id] = row.due_date;
      }
      return map;
    },
  });

  const { data: debtors } = useQuery({
    queryKey: ["debtors"],
    queryFn: offlineQueryFn("query:debtors", async () => ((await supabase.from("customers").select("*").gt("balance", 0).order("balance", { ascending: false })).data ?? []) as Customer[], "table:customers"),
  });

  const visibleDebtors = (debtors ?? []).filter((customer) => Number(customer.balance) > 0).sort((a, b) => Number(b.balance) - Number(a.balance));
  const totalDebt = visibleDebtors.reduce((s, c) => s + Number(c.balance), 0);

  const payMut = useMutation({
    mutationFn: async () => {
      if (!pay || amount <= 0) throw new Error("Montant invalide");
      const { error } = await supabase.rpc("record_customer_payment", {
        _customer_id: pay.id, _amount: amount, _note: note || "remboursement",
        _method: method as "cash",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["debt-details"] });
      setPay(null); setAmount(0); setNote(""); setMethod("cash");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantMut = useMutation({
    mutationFn: async () => {
      if (!grant) throw new Error("Client requis");
      const productsTotal = creditLinesTotal(grantLines);
      const finalAmount = Number((productsTotal > 0 ? productsTotal + amount : amount).toFixed(2));
      if (finalAmount <= 0) throw new Error("Montant invalide");
      const reason = note || (grantLines.length > 0
        ? `Crédit: ${grantLines.map((l) => `${l.name} ×${l.qty}`).join(", ")}`
        : "octroi_credit");
      if (isOffline()) {
        for (const l of grantLines) {
          await queueOperation("stock_adjust", `Stock ${l.name} ×${l.qty}`, {
            product_id: l.product_id, delta: -l.qty, reason: "manual_out", note: `Crédit — ${grant.name}`,
          });
        }
        await queueOperation("customer_ledger", `Crédit ${grant.name}`, {
          customer_id: grant.id, delta: finalAmount, reason, due_date: dueDate || null,
        });
        return { queued: true };
      }
      if (grantLines.length > 0) {
        await applyCreditStock(grantLines, grant.name);
      }
      const { error: le } = await supabase.from("customer_ledger").insert({ customer_id: grant.id, delta: finalAmount, reason, due_date: dueDate || null });
      if (le) throw le;
      const { error: ue } = await supabase.from("customers").update({ balance: Number(grant.balance) + finalAmount }).eq("id", grant.id);
      if (ue) throw ue;
      return { queued: false };
    },
    onSuccess: (res) => {
      toast.success(res?.queued
        ? typeof window !== "undefined" && window.conetecDesktop
          ? "Crédit enregistré localement — aucune synchronisation."
          : "Crédit enregistré localement — synchronisation au retour du réseau"
        : "Crédit octroyé");
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["ledger-due-dates"] });
      qc.invalidateQueries({ queryKey: ["debt-details"] });
      qc.invalidateQueries({ queryKey: ["credit-products"] });
      setGrant(null); setAmount(0); setNote(""); setDueDate(""); setGrantLines([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const { data: allCustomers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => ((await supabase.from("customers").select("*").eq("is_archived", false).order("name")).data ?? []) as Customer[],
  });

  return (
    <div className="space-y-4">
      <OfflineBanner scope="dettes" />
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total à recouvrer</div>
          <div className="text-2xl font-bold text-destructive mt-1">{formatMoney(totalDebt, currency, rate)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Débiteurs actifs</div>
          <div className="text-2xl font-bold mt-1">{visibleDebtors.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex flex-col justify-between h-full gap-2">
          <div className="text-xs uppercase text-muted-foreground">Octroyer une dette</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setNewDebt(true)}><Plus className="mr-1 h-3.5 w-3.5" />Nouvelle dette</Button>
            <select className="text-sm border rounded p-1 bg-background flex-1 min-w-[140px]" onChange={(e) => { const c = allCustomers?.find(x => x.id === e.target.value); if (c) setGrant(c); e.target.value = ""; }} value="">
              <option value="">Client existant…</option>
              {allCustomers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Client</TableHead><TableHead>Contact</TableHead>
          <TableHead className="text-right">Limite</TableHead>
          <TableHead className="text-right">Dette</TableHead>
          <TableHead className="text-right">Échéance</TableHead>
          <TableHead>Statut</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {visibleDebtors.map((c) => {
            const st = debtStatus(Number(c.balance), dueDates?.[c.id] ?? null);
            return (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-xs">
                {c.phone && <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>}
                {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${c.name}, nous vous rappelons votre dette de ${formatMoney(Number(c.balance), currency, rate)} chez Gestion Stock.`)}`} target="_blank" rel="noreferrer" className="ml-2 text-emerald-600 hover:underline">WhatsApp</a>}
              </TableCell>
              <TableCell className="text-right text-sm">{formatMoney(Number(c.credit_limit), currency, rate)}</TableCell>
              <TableCell className="text-right font-semibold text-destructive">{formatMoney(Number(c.balance), currency, rate)}</TableCell>
              <TableCell className="text-right text-sm">{dueDates?.[c.id] ? formatDate(dueDates[c.id]) : "—"}</TableCell>
              <TableCell><Badge className={st.className}>{st.label}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button size="sm" onClick={() => setPay(c)}><Wallet className="mr-1 h-3 w-3" />Encaisser</Button>
                  <Button size="sm" variant="outline" onClick={() => setDetails(c)}><Eye className="mr-1 h-3 w-3" />Plus</Button>
                </div>
              </TableCell>
            </TableRow>
          );})}
          {visibleDebtors.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune dette ouverte 🎉</TableCell></TableRow>}
        </TableBody>
      </Table></CardContent></Card>

      {/* Encaisser */}
      <Dialog open={!!pay} onOpenChange={(v) => !v && setPay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Encaisser — {pay?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Solde: <span className="font-semibold text-destructive">{pay && formatMoney(Number(pay.balance), currency, rate)}</span></p>
            <div><Label>Montant reçu (USD)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => pay && setAmount(Number(pay.balance))}>Solde intégral</Button>
              <Button size="sm" variant="outline" onClick={() => pay && setAmount(Number(pay.balance) / 2)}>Moitié</Button>
            </div>
            <div>
              <Label>Moyen de paiement</Label>
              <select className="w-full border rounded-md h-9 px-2 bg-background text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. cash reçu au comptoir" /></div>
            {pay && amount > 0 && amount < Number(pay.balance) && (
              <p className="text-xs text-muted-foreground">Reste après paiement: <span className="font-medium text-foreground">{formatMoney(Number(pay.balance) - amount, currency, rate)}</span></p>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPay(null)}>Annuler</Button><Button onClick={() => payMut.mutate()} disabled={payMut.isPending}>Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Octroi */}
      <Dialog open={!!grant} onOpenChange={(v) => !v && setGrant(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Octroyer un crédit — {grant?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Solde actuel: <span className="font-semibold">{grant && formatMoney(Number(grant.balance), currency, rate)}</span></p>
            <CreditProductPicker lines={grantLines} onChange={setGrantLines} />
            <div><Label>{grantLines.length > 0 ? "Montant supplémentaire (USD)" : "Montant (USD)"}</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
            {grantLines.length > 0 && (
              <p className="text-sm font-semibold">Dette totale: {formatMoney(creditLinesTotal(grantLines) + amount, currency, rate)}</p>
            )}
            <div><Label>Date d'échéance</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div><Label>Motif</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. avance sur matériel" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGrant(null)}>Annuler</Button><Button onClick={() => grantMut.mutate()} disabled={grantMut.isPending}>Enregistrer</Button></DialogFooter>

        </DialogContent>
      </Dialog>

      <NewDebtDialog open={newDebt} onClose={() => setNewDebt(false)} />
      <DebtDetailsDialog customer={details} onClose={() => setDetails(null)} onPay={(c) => { setDetails(null); setPay(c); }} />
    </div>
  );
}

/* ---------------- Nouvelle dette (personne hors base) ---------------- */

function NewDebtDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", phone: "", amount: 0, dueDate: "", note: "" });
  const [lines, setLines] = useState<CreditLine[]>([]);
  const productsTotal = creditLinesTotal(lines);
  const totalDebt = Number((productsTotal + f.amount).toFixed(2));

  const m = useMutation({
    mutationFn: async () => {
      if (!f.name.trim()) throw new Error("Nom requis");
      if (totalDebt <= 0) throw new Error("Montant invalide");
      const reason = f.note || (lines.length > 0
        ? `Crédit: ${lines.map((l) => `${l.name} ×${l.qty}`).join(", ")}`
        : "octroi_credit");
      if (isOffline()) {
        for (const l of lines) {
          await queueOperation("stock_adjust", `Stock ${l.name} ×${l.qty}`, {
            product_id: l.product_id, delta: -l.qty, reason: "manual_out", note: `Crédit — ${f.name.trim()}`,
          });
        }
        await queueOperation("customer_ledger", `Dette ${f.name.trim()}`, {
          customer_name: f.name.trim(), customer_phone: f.phone || null,
          delta: totalDebt, reason, due_date: f.dueDate || null,
        });
        return { queued: true };
      }
      if (lines.length > 0) await applyCreditStock(lines, f.name.trim());
      const { data: created, error: ce } = await supabase.from("customers")
        .insert({ name: f.name.trim(), phone: f.phone || null, balance: totalDebt })
        .select("id").single();
      if (ce) throw ce;
      const { error: le } = await supabase.from("customer_ledger").insert({
        customer_id: created.id, delta: totalDebt, reason, due_date: f.dueDate || null,
      });
      if (le) throw le;
      return { queued: false };
    },
    onSuccess: (res) => {
      toast.success(res?.queued
        ? typeof window !== "undefined" && window.conetecDesktop
          ? "Dette enregistrée localement — aucune synchronisation."
          : "Dette enregistrée localement — synchronisation au retour du réseau"
        : "Dette enregistrée");
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-all"] });
      qc.invalidateQueries({ queryKey: ["ledger-due-dates"] });
      qc.invalidateQueries({ queryKey: ["credit-products"] });
      setF({ name: "", phone: "", amount: 0, dueDate: "", note: "" });
      setLines([]);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle dette — personne hors base</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">La personne sera automatiquement ajoutée au carnet clients.</p>
          <div><Label>Nom *</Label><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <CreditProductPicker lines={lines} onChange={setLines} />
          <div><Label>{lines.length > 0 ? "Montant supplémentaire (USD)" : "Montant de la dette (USD) *"}</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></div>
          {lines.length > 0 && <p className="text-sm font-semibold">Dette totale: {totalDebt.toFixed(2)} $</p>}
          <div><Label>Date d'échéance</Label><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
          <div><Label>Motif</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="ex. matériel emporté" /></div>
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={() => m.mutate()} disabled={m.isPending}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Détails de la dette ---------------- */

function DebtDetailsDialog({ customer, onClose, onPay }: { customer: Customer | null; onClose: () => void; onPay: (c: Customer) => void }) {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;

  const { data: rows } = useQuery({
    queryKey: ["debt-details", customer?.id],
    enabled: !!customer,
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_ledger").select("*")
        .eq("customer_id", customer!.id).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LedgerRow[];
    },
  });

  const timeline = useMemo(() => {
    let running = 0;
    return (rows ?? []).map((r) => {
      running += Number(r.delta);
      return { ...r, running };
    }).reverse();
  }, [rows]);

  const credits = (rows ?? []).filter((r) => Number(r.delta) > 0);
  const payments = (rows ?? []).filter((r) => Number(r.delta) < 0);
  const totalPaid = payments.reduce((s, r) => s + Math.abs(Number(r.delta)), 0);
  const totalCredit = credits.reduce((s, r) => s + Number(r.delta), 0);
  const firstDue = credits.find((r) => r.due_date)?.due_date ?? null;
  const balance = Number(customer?.balance ?? 0);
  const st = debtStatus(balance, firstDue);

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Dette — {customer?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Total octroyé</div>
              <div className="font-semibold">{formatMoney(totalCredit, currency, rate)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Total payé</div>
              <div className="font-semibold text-emerald-600">{formatMoney(totalPaid, currency, rate)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Restant</div>
              <div className="font-semibold text-destructive">{formatMoney(balance, currency, rate)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[11px] uppercase text-muted-foreground">Échéance</div>
              <div className="font-semibold">{firstDue ? formatDate(firstDue) : "—"}</div>
              <Badge className={`${st.className} mt-1`}>{st.label}</Badge>
            </div>
          </div>

          <div className="max-h-[380px] overflow-auto overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date & heure</TableHead>
                <TableHead>Opération</TableHead>
                <TableHead>Moyen</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Restant</TableHead>
                <TableHead className="text-right">Échéance</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {timeline.map((r) => {
                  const isPayment = Number(r.delta) < 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(r.created_at, true)}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant={isPayment ? "secondary" : "outline"} className="mr-2">{isPayment ? "Paiement" : "Dette octroyée"}</Badge>
                        <span className="text-muted-foreground">{r.reason}</span>
                      </TableCell>
                      <TableCell className="text-sm">{isPayment ? methodLabel(r.method) : "—"}</TableCell>
                      <TableCell className={`text-right font-medium ${isPayment ? "text-emerald-600" : "text-destructive"}`}>
                        {isPayment ? "-" : "+"}{formatMoney(Math.abs(Number(r.delta)), currency, rate)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(r.running, currency, rate)}</TableCell>
                      <TableCell className="text-right text-sm">{r.due_date ? formatDate(r.due_date) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {timeline.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun mouvement</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {customer && balance > 0 && <Button onClick={() => onPay(customer)}><Wallet className="mr-1 h-4 w-4" />Encaisser</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

