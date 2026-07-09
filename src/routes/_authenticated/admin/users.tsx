import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasRole } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ROLES: AppRole[] = ["admin", "manager", "caissier", "vendeur", "comptable"];

export const Route = createFileRoute("/_authenticated/admin/users")({ component: Page });

function Page() {
  const isAdmin = useHasRole("admin");
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, AppRole>>({});

  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rôle ajouté"); qc.invalidateQueries({ queryKey: ["users-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rôle retiré"); qc.invalidateQueries({ queryKey: ["users-list"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">Réservé aux administrateurs. Créez le premier compte via <a className="underline" href="/auth">/auth</a>, puis assignez le rôle admin via la base de données.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Employés & rôles</h1>
      <p className="text-sm text-muted-foreground">Les employés créent leur compte depuis la page de connexion, puis vous leur attribuez un rôle ici.</p>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Téléphone</TableHead><TableHead>Rôles</TableHead><TableHead>Attribuer</TableHead></TableRow></TableHeader>
        <TableBody>
          {users?.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</TableCell>
              <TableCell>{u.phone ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {u.roles.length === 0 && <span className="text-xs text-muted-foreground">Aucun</span>}
                  {u.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeRole.mutate({ user_id: u.id, role: r })}>
                      {r} ×
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Select value={selected[u.id] ?? ""} onValueChange={(v) => setSelected({ ...selected, [u.id]: v as AppRole })}>
                    <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Rôle…" /></SelectTrigger>
                    <SelectContent>{ROLES.filter((r) => !u.roles.includes(r)).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" disabled={!selected[u.id]} onClick={() => selected[u.id] && addRole.mutate({ user_id: u.id, role: selected[u.id] })}>+</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  );
}
