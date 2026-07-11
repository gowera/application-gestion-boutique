import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSettings, formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { Banknote, PlayCircle, StopCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/caisse")({ component: CaissePage });

type Session = {
  id: string; opened_at: string; closed_at: string | null;
  opening_amount: number; closing_amount: number | null;
  expected_amount: number | null;
  user_id: string; notes: string | null;
};

function CaissePage() {
  const { user } = useCurrentUser();
  const { data: settings } = useSettings();
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const qc = useQueryClient();

  const { data: active } = useQuery({
    queryKey: ["cash-session-active", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("cash_sessions").select("*")
        .eq("user_id", user!.id).is("closed_at", null)
        .order("opened_at", { ascending: false }).limit(1).maybeSingle();
      return data as Session | null;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["cash-session-history"],
    queryFn: async () => (await supabase.from("cash_sessions").select("*")
      .order("opened_at", { ascending: false }).limit(30)).data as Session[] | null,
  });

  const [openFloat, setOpenFloat] = useState(0);
  const [openDlg, setOpenDlg] = useState(false);
  const [closeDlg, setCloseDlg] = useState(false);
  const [closeAmount, setCloseAmount] = useState(0);
  const [closeNote, setCloseNote] = useState("");

  const openSess = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cash_sessions").insert({
        user_id: user!.id, opening_amount: openFloat,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session ouverte"); qc.invalidateQueries({ queryKey: ["cash-session-active"] }); qc.invalidateQueries({ queryKey: ["cash-session-history"] }); setOpenDlg(false); setOpenFloat(0); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Expected amount = opening float + cash payments during session
  const { data: expected } = useQuery({
    queryKey: ["cash-session-expected", active?.id],
    enabled: !!active?.id,
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("id, payments(method, amount_usd)")
        .eq("session_id", active!.id).eq("status", "completed");
      const cash = (data ?? []).flatMap((s: { payments?: { method: string; amount_usd: number }[] }) => s.payments ?? [])
        .filter((p) => p.method === "cash").reduce((a, p) => a + Number(p.amount_usd || 0), 0);
      return Number(active!.opening_amount) + cash;
    },
  });

  const closeSess = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error("Aucune session");
      const exp = expected ?? Number(active.opening_amount);
      const { error } = await supabase.from("cash_sessions").update({
        closed_at: new Date().toISOString(),
        closing_amount: closeAmount,
        expected_amount: exp,
        notes: closeNote || null,
      }).eq("id", active.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session fermée"); qc.invalidateQueries(); setCloseDlg(false); setCloseAmount(0); setCloseNote(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" />Tableau de bord</Link></Button>
        </div>
      </div>
      <div>
        <h1 className="text-display text-2xl md:text-3xl font-bold flex items-center gap-2"><Banknote className="h-6 w-6" />Caisse</h1>
        <p className="text-sm text-muted-foreground">Ouvrez une session de caisse pour suivre les encaissements de la journée.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-display">Session en cours</CardTitle></CardHeader>
        <CardContent>
          {active ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Ouverte le" value={formatDate(active.opened_at, true)} />
              <Stat label="Fond de caisse" value={formatMoney(Number(active.opening_amount), currency, rate)} />
              <Stat label="Encaisse attendue" value={formatMoney(expected ?? Number(active.opening_amount), currency, rate)} />

              <div className="flex items-end">
                <Button className="w-full" variant="destructive" onClick={() => setCloseDlg(true)}><StopCircle className="mr-2 h-4 w-4" />Fermer la caisse</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Aucune session ouverte.</p>
              <Button onClick={() => setOpenDlg(true)}><PlayCircle className="mr-2 h-4 w-4" />Ouvrir une session</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-display">Historique des sessions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ouverture</TableHead><TableHead>Fermeture</TableHead>
              <TableHead className="text-right">Fond</TableHead><TableHead className="text-right">Attendu</TableHead>
              <TableHead className="text-right">Compté</TableHead><TableHead className="text-right">Écart</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(history ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDate(s.opened_at, true)}</TableCell>
                  <TableCell>{s.closed_at ? formatDate(s.closed_at, true) : "—"}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(s.opening_float_usd), currency, rate)}</TableCell>
                  <TableCell className="text-right">{s.expected_amount_usd != null ? formatMoney(Number(s.expected_amount_usd), currency, rate) : "—"}</TableCell>
                  <TableCell className="text-right">{s.closing_amount_usd != null ? formatMoney(Number(s.closing_amount_usd), currency, rate) : "—"}</TableCell>
                  <TableCell className={`text-right ${s.variance_usd != null && Number(s.variance_usd) < 0 ? "text-destructive font-semibold" : ""}`}>
                    {s.variance_usd != null ? formatMoney(Number(s.variance_usd), currency, rate) : "—"}
                  </TableCell>
                  <TableCell><Badge variant={s.closed_at ? "secondary" : "default"}>{s.closed_at ? "Fermée" : "Ouverte"}</Badge></TableCell>
                </TableRow>
              ))}
              {(history ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune session.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openDlg} onOpenChange={setOpenDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ouvrir une session</DialogTitle></DialogHeader>
          <div><Label>Fond de caisse initial (USD)</Label><Input type="number" step="0.01" value={openFloat} onChange={(e) => setOpenFloat(+e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenDlg(false)}>Annuler</Button><Button onClick={() => openSess.mutate()}>Ouvrir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDlg} onOpenChange={setCloseDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fermer la caisse</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Attendu : <span className="font-semibold text-foreground">{formatMoney(expected ?? 0, currency, rate)}</span></p>
            <div><Label>Montant compté (USD)</Label><Input type="number" step="0.01" value={closeAmount} onChange={(e) => setCloseAmount(+e.target.value)} /></div>
            <div><Label>Note (optionnel)</Label><Input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} /></div>
            {closeAmount > 0 && (
              <p className={`text-sm font-semibold ${closeAmount - (expected ?? 0) < 0 ? "text-destructive" : "text-success"}`}>
                Écart : {formatMoney(closeAmount - (expected ?? 0), currency, rate)}
              </p>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCloseDlg(false)}>Annuler</Button><Button onClick={() => closeSess.mutate()}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-display font-bold">{value}</div>
    </div>
  );
}
