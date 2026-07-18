import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { downloadSalaryPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/admin/salaries")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const defaultMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [f, setF] = useState({ employee_id: "", amount_usd: 0, advance: false, note: "", payment_method: "cash" as "cash" | "mobile_money" | "bank_transfer" });
  const { data: emps = [] } = useQuery<Array<{ id: string; full_name: string }>>({ queryKey: ["employees"], queryFn: async () => (await supabase.from("employees").select("id, full_name").order("full_name")).data as Array<{ id: string; full_name: string }> ?? [] });
  const { data: salaryRows = [] } = useQuery<Array<{ id: string; amount_usd: number; period_start: string; period_end: string; paid_at: string; advance: boolean; status?: string | null; payment_method?: string | null; employees?: { full_name?: string | null } | null }>>({ queryKey: ["salaries"], queryFn: async () => (await supabase.from("salary_payments").select("*, employees(full_name)").order("paid_at", { ascending: false })).data as Array<{ id: string; amount_usd: number; period_start: string; period_end: string; paid_at: string; advance: boolean; status?: string | null; payment_method?: string | null; employees?: { full_name?: string | null } | null }> ?? [] });

  const save = useMutation({
    mutationFn: async () => {
      if (!f.employee_id) throw new Error("Employé requis");
      const [year, monthNumber] = month.split("-");
      const periodStart = `${year}-${monthNumber}-01`;
      const lastDay = new Date(Number(year), Number(monthNumber), 0).getDate();
      const periodEnd = `${year}-${monthNumber}-${String(lastDay).padStart(2, "0")}`;
      const confirmationToken = crypto.randomUUID();
      const { data: employee, error: employeeError } = await supabase.from("employees").select("id, full_name, phone, email").eq("id", f.employee_id).single();
      if (employeeError || !employee) throw employeeError ?? new Error("Employé introuvable");
      const { data, error } = await supabase.from("salary_payments").insert({
        employee_id: f.employee_id,
        amount_usd: f.amount_usd,
        advance: f.advance,
        note: f.note || null,
        period_month: month,
        period_start: periodStart,
        period_end: periodEnd,
        paid_at: new Date().toISOString(),
        payment_method: f.payment_method,
        confirmation_token: confirmationToken,
        status: "pending",
      }).select("id").single();
      if (error || !data) throw error ?? new Error("Enregistrement impossible");
      return { paymentId: data.id, employee, confirmationToken };
    },
    onSuccess: ({ employee, confirmationToken }) => {
      toast.success("Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["salaries"] });
      setOpen(false);
      const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const confirmationUrl = `${window.location.origin}/salaire/confirmer/${confirmationToken}`;
      const message = `Bonjour ${employee.full_name}, votre salaire de ${monthLabel} est prêt. Confirmez ici : ${confirmationUrl}`;
      void supabase.from("notifications").insert({ title: "Salaire à confirmer", message, type: "info", entity_type: "salary_payment" });
      if (employee.phone) window.open(`https://wa.me/${employee.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      if (employee.email) window.location.href = `mailto:${employee.email}?subject=${encodeURIComponent("Confirmation de salaire")}&body=${encodeURIComponent(message)}`;
      downloadSalaryPdf({ employeeName: employee.full_name, month: monthLabel, amount: f.amount_usd, paymentMethod: f.payment_method, confirmationUrl, note: f.note || undefined });
      setF({ employee_id: "", amount_usd: 0, advance: false, note: "", payment_method: "cash" });
      setMonth(defaultMonth);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paymentMethodLabel: Record<string, string> = { cash: "Espèces", mobile_money: "Mobile Money", bank_transfer: "Virement" };

  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="text-display text-2xl font-bold">Salaires</h1><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau paiement</Button></div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Employé</TableHead><TableHead>Période</TableHead><TableHead>Montant</TableHead><TableHead>Type</TableHead><TableHead>Mode</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {!salaryRows.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun paiement.</TableCell></TableRow>}
            {salaryRows.map((s) => <TableRow key={s.id}><TableCell>{s.employees?.full_name ?? "—"}</TableCell><TableCell>{formatDate(s.period_start)} → {formatDate(s.period_end)}</TableCell><TableCell>${Number(s.amount_usd).toFixed(2)}</TableCell><TableCell>{s.advance ? "Avance" : "Salaire"}</TableCell><TableCell>{paymentMethodLabel[s.payment_method ?? "cash"]}</TableCell><TableCell>{s.status === "confirmed" ? <Badge>Confirmé</Badge> : <Badge variant="secondary">En attente</Badge>}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouveau paiement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Employé *</Label>
            <Select value={f.employee_id} onValueChange={(value) => setF({ ...f, employee_id: value })}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>{emps?.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Mois *</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
          <div><Label>Montant (USD)</Label><Input type="number" step="0.01" value={f.amount_usd} onChange={(e) => setF({ ...f, amount_usd: +e.target.value })} placeholder="0.00" /></div>
          <div><Label>Mode de paiement</Label>
            <Select value={f.payment_method} onValueChange={(value) => setF({ ...f, payment_method: value as "cash" | "mobile_money" | "bank_transfer" })}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={f.advance} onChange={(e) => setF({ ...f, advance: e.target.checked })} /> <Label>Avance sur salaire</Label></div>
          <div><Label>Note</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Mention ou note interne" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
