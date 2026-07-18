import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
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

type EmployeeRow = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  monthly_salary_usd?: number;
  active?: boolean;
  is_terminated?: boolean;
  termination_reason?: string | null;
  terminated_at?: string | null;
};

type EmployeeFilter = "all" | "active" | "terminated";

export const Route = createFileRoute("/_authenticated/admin/employees")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<EmployeeFilter>("all");
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().slice(0, 10));
  const [f, setF] = useState({ full_name: "", phone: "", email: "", position: "", monthly_salary_usd: 0 });
  const { data: employees = [] } = useQuery<EmployeeRow[]>({ queryKey: ["employees"], queryFn: async () => (await supabase.from("employees").select("*").order("full_name")).data as EmployeeRow[] ?? [] });

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      if (filter === "active") return !employee.is_terminated && employee.active !== false;
      if (filter === "terminated") return !!employee.is_terminated;
      return true;
    });
  }, [employees, filter]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employees").insert({ ...f, active: true, is_terminated: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employé ajouté");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      setF({ full_name: "", phone: "", email: "", position: "", monthly_salary_usd: 0 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const terminate = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) throw new Error("Employé requis");
      const { error } = await supabase.from("employees").update({ is_terminated: true, termination_reason: terminationReason || null, terminated_at: terminationDate || null, active: false }).eq("id", selectedEmployeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employé licencié");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setTerminateOpen(false);
      setSelectedEmployeeId(null);
      setTerminationReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl font-bold">Employés</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as EmployeeFilter)}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Filtrer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="terminated">Licenciés</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouveau</Button>
        </div>
      </div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Fonction</TableHead><TableHead>Téléphone</TableHead><TableHead>Salaire</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {!filteredEmployees.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun employé.</TableCell></TableRow>}
            {filteredEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.full_name}</TableCell>
                <TableCell>{employee.position ?? "—"}</TableCell>
                <TableCell>{employee.phone ?? "—"}</TableCell>
                <TableCell>${Number(employee.monthly_salary_usd ?? 0).toFixed(2)}</TableCell>
                <TableCell>
                  {employee.is_terminated ? <Badge variant="secondary">Licencié</Badge> : employee.active === false ? <Badge variant="secondary">Inactif</Badge> : <Badge>Actif</Badge>}
                </TableCell>
                <TableCell>
                  {!employee.is_terminated && <Button size="sm" variant="outline" onClick={() => { setSelectedEmployeeId(employee.id); setTerminateOpen(true); }}>Licencier</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom complet *</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Ex : Jean Mukeba" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+243 99 000 0000" /></div><div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="contact@entreprise.com" /></div></div>
          <div><Label>Fonction</Label><Input value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} placeholder="Responsable logistique" /></div>
          <div><Label>Salaire mensuel (USD)</Label><Input type="number" step="0.01" value={f.monthly_salary_usd} onChange={(e) => setF({ ...f, monthly_salary_usd: +e.target.value })} placeholder="0.00" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => save.mutate()}>Enregistrer</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}><DialogContent><DialogHeader><DialogTitle>Licencier l’employé</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Motif</Label><Input value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)} placeholder="Raison du licenciement" /></div>
          <div><Label>Date</Label><Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setTerminateOpen(false)}>Annuler</Button><Button onClick={() => terminate.mutate()} disabled={terminate.isPending}>Confirmer</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
