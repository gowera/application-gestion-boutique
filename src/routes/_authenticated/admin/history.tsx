import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/history")({ component: Page });

type ActivityLogRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function Page() {
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const { data: rows = [] } = useQuery<ActivityLogRow[]>({
    queryKey: ["activity-log"],
    queryFn: async () => (await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(200)).data as ActivityLogRow[] ?? [],
  });

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesUser = userFilter === "all" || row.user_id === userFilter;
    const matchesAction = actionFilter === "all" || row.action === actionFilter;
    const matchesEntity = entityFilter === "all" || row.entity === entityFilter;
    const matchesDate = !dateFilter || row.created_at.startsWith(dateFilter);
    return matchesUser && matchesAction && matchesEntity && matchesDate;
  }), [rows, userFilter, actionFilter, entityFilter, dateFilter]);

  const actionOptions = Array.from(new Set(rows.map((row) => row.action)));
  const entityOptions = Array.from(new Set(rows.map((row) => row.entity).filter(Boolean) as string[]));
  const userOptions = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean) as string[]));

  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">Historique</h1>
      <Card><CardContent className="p-4 grid gap-3 md:grid-cols-4">
        <div><Label>Utilisateur</Label><Select value={userFilter} onValueChange={setUserFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{userOptions.map((userId) => <SelectItem key={userId} value={userId}>{userId}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Action</Label><Select value={actionFilter} onValueChange={setActionFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem>{actionOptions.map((action) => <SelectItem key={action} value={action}>{action}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Entité</Label><Select value={entityFilter} onValueChange={setEntityFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem>{entityOptions.map((entity) => <SelectItem key={entity} value={entity}>{entity}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Date</Label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Entité</TableHead><TableHead>Détails</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row) => <TableRow key={row.id}><TableCell>{formatDate(row.created_at, true)}</TableCell><TableCell>{row.action}</TableCell><TableCell>{row.entity ?? "—"}</TableCell><TableCell className="text-sm text-muted-foreground">{row.metadata ? JSON.stringify(row.metadata) : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  );
}
