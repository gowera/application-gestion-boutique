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
import { Plus, Wallet, Pencil, Archive, History, MessageCircle, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";

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
    queryKey: ["customers", showArchived],
    queryFn: async () => {
      const q = supabase.from("customers").select("*").order("name");
      const { data, error } = showArchived ? await q : await q.eq("is_archived", false);
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return customers ?? [];
    const q = query.toLowerCase();
    return (customers ?? []).filter((c) =>
      c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

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
    queryFn: async () => (await supabase.from("sales").select("id,code,total_usd,paid_usd,credit_usd,status,created_at,due_date").eq("customer_id", customer!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const { data: ledger } = useQuery({
    queryKey: ["customer-ledger", customer?.id],
    enabled: !!customer,
    queryFn: async () => (await supabase.from("customer_ledger").select("*").eq("customer_id", customer!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
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

function CreditsTab() {
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const [pay, setPay] = useState<Customer | null>(null);
  const [grant, setGrant] = useState<Customer | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const { data: debtors } = useQuery({
    queryKey: ["debtors"],
    queryFn: async () => ((await supabase.from("customers").select("*").gt("balance", 0).order("balance", { ascending: false })).data ?? []) as Customer[],
  });

  const totalDebt = (debtors ?? []).reduce((s, c) => s + Number(c.balance), 0);

  const payMut = useMutation({
    mutationFn: async () => {
      if (!pay || amount <= 0) throw new Error("Montant invalide");
      const { error } = await supabase.rpc("record_customer_payment", { _customer_id: pay.id, _amount: amount, _note: note || "remboursement" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setPay(null); setAmount(0); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantMut = useMutation({
    mutationFn: async () => {
      if (!grant || amount <= 0) throw new Error("Montant invalide");
      // Direct ledger entry + balance update
      const { error: le } = await supabase.from("customer_ledger").insert({ customer_id: grant.id, delta: amount, reason: note || "octroi_credit" });
      if (le) throw le;
      const { error: ue } = await supabase.from("customers").update({ balance: Number(grant.balance) + amount }).eq("id", grant.id);
      if (ue) throw ue;
    },
    onSuccess: () => {
      toast.success("Crédit octroyé");
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setGrant(null); setAmount(0); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: allCustomers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => ((await supabase.from("customers").select("*").eq("is_archived", false).order("name")).data ?? []) as Customer[],
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total à recouvrer</div>
          <div className="text-2xl font-bold text-destructive mt-1">{formatMoney(totalDebt, currency, rate)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Débiteurs actifs</div>
          <div className="text-2xl font-bold mt-1">{debtors?.length ?? 0}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex flex-col justify-between h-full gap-2">
          <div className="text-xs uppercase text-muted-foreground">Octroi manuel</div>
          <select className="text-sm border rounded p-1 bg-background" onChange={(e) => { const c = allCustomers?.find(x => x.id === e.target.value); if (c) setGrant(c); e.target.value = ""; }} value="">
            <option value="">Choisir un client…</option>
            {allCustomers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Client</TableHead><TableHead>Contact</TableHead>
          <TableHead className="text-right">Limite</TableHead>
          <TableHead className="text-right">Dette</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {debtors?.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-xs">
                {c.phone && <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>}
                {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${c.name}, nous vous rappelons votre dette de ${formatMoney(Number(c.balance), currency, rate)} chez CONETEC.`)}`} target="_blank" rel="noreferrer" className="ml-2 text-emerald-600 hover:underline">WhatsApp</a>}
              </TableCell>
              <TableCell className="text-right text-sm">{formatMoney(Number(c.credit_limit), currency, rate)}</TableCell>
              <TableCell className="text-right font-semibold text-destructive">{formatMoney(Number(c.balance), currency, rate)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => setPay(c)}><Wallet className="mr-1 h-3 w-3" />Encaisser</Button>
              </TableCell>
            </TableRow>
          ))}
          {debtors?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune dette ouverte 🎉</TableCell></TableRow>}
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
        <DialogContent>
          <DialogHeader><DialogTitle>Octroyer un crédit — {grant?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Solde actuel: <span className="font-semibold">{grant && formatMoney(Number(grant.balance), currency, rate)}</span></p>
            <div><Label>Montant (USD)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
            <div><Label>Motif</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. avance sur matériel" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGrant(null)}>Annuler</Button><Button onClick={() => grantMut.mutate()} disabled={grantMut.isPending}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
