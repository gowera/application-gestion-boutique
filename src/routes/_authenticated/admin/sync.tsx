import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Cloud, CloudOff, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSync } from "@/hooks/use-sync";
import { discardOperation, retryOperation, syncNow } from "@/lib/offline/sync";
import { outboxList, syncedList, type OutboxOp, type SyncedOp } from "@/lib/offline/store";
import { bootstrapOfflineData, getBootstrapProgress, subscribeBootstrap } from "@/lib/offline/bootstrap";
import { cacheGet } from "@/lib/offline/store";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  POLICY_LABELS, clearConflicts, getConflictPolicy, listConflicts, setConflictPolicy,
  type ConflictEntry, type ConflictPolicy,
} from "@/lib/offline/conflict";

export const Route = createFileRoute("/_authenticated/admin/sync")({
  head: () => ({
    meta: [
      { title: "Synchronisation & mode hors ligne — Gestion Stock" },
      { name: "description", content: "Suivi de la file d'attente hors ligne, des envois réussis ou en échec et de la stratégie de résolution des conflits." },
      { property: "og:title", content: "Synchronisation & mode hors ligne — Gestion Stock" },
      { property: "og:description", content: "File d'attente, envois réussis/échoués et résolution des conflits de données." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const KIND_LABELS: Record<string, string> = {
  pos_sale: "Vente (caisse)",
  expense: "Dépense",
  customer: "Client",
  stock_adjust: "Mouvement de stock",
  customer_ledger: "Dette / paiement",
  document: "Document",
};

function when(value: string) {
  return new Date(value).toLocaleString("fr-FR");
}

const serverProgress = { running: false, completed: 0, total: 29, current: null, ready: false, lastBootstrapAt: null, error: null };

function Page() {
  const { user } = useCurrentUser();
  const boot = useSyncExternalStore(subscribeBootstrap, getBootstrapProgress, () => serverProgress);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { online, syncing, pending, lastSyncAt, lastError } = useSync();
  const qc = useQueryClient();
  const [queue, setQueue] = useState<OutboxOp[]>([]);
  const [history, setHistory] = useState<SyncedOp[]>([]);
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [policy, setPolicy] = useState<ConflictPolicy>("merge");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setQueue(await outboxList());
    setHistory((await syncedList()).slice().reverse().slice(0, 50));
    setConflicts((await listConflicts()).slice().reverse().slice(0, 50));
    const meta = await cacheGet<{ counts?: Record<string, number> }>("bootstrap:meta");
    setCounts(meta?.counts ?? {});
  }, []);

  useEffect(() => { setPolicy(getConflictPolicy()); }, []);
  useEffect(() => { void refresh(); }, [refresh, pending, syncing, lastSyncAt, boot.lastBootstrapAt]);

  const failed = queue.filter((op) => op.error);

  async function runSync() {
    setBusy(true);
    try {
      const { sent, failed: ko } = await syncNow();
      if (sent > 0) { toast.success(`${sent} opération(s) envoyée(s)`); qc.invalidateQueries(); }
      else if (ko > 0) toast.error(`${ko} opération(s) en échec`);
      else if (!online) toast.warning("Hors ligne : la synchronisation reprendra automatiquement.");
      else toast.info("Tout est déjà synchronisé.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-xl font-semibold">Synchronisation & mode hors ligne</h1>
        <p className="text-sm text-muted-foreground">
          Suivi des écritures enregistrées localement, de leur envoi au serveur et des conflits de données.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            {online ? <Cloud className="h-5 w-5 text-success" /> : <CloudOff className="h-5 w-5 text-warning-foreground" />}
            <div>
              <div className="text-sm font-medium">{online ? "En ligne" : "Hors ligne"}</div>
              <div className="text-xs text-muted-foreground">
                {lastSyncAt ? `Dernière synchro : ${when(lastSyncAt)}` : "Aucune synchronisation encore"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-semibold">{pending}</div><div className="text-xs text-muted-foreground">En file d'attente</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-semibold text-destructive">{failed.length}</div><div className="text-xs text-muted-foreground">En échec</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-semibold text-success">{history.length}</div><div className="text-xs text-muted-foreground">Envois réussis (récents)</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runSync} disabled={busy || syncing || !online} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${busy || syncing ? "animate-spin" : ""}`} />
          Synchroniser maintenant
        </Button>
        {lastError && <span className="text-xs text-destructive">{lastError}</span>}
        <span className="text-xs text-muted-foreground">
          La synchronisation démarre aussi automatiquement en arrière-plan dès le retour de la connexion.
        </span>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Base de données locale (JSON)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!online || boot.running || !user}
              onClick={async () => { if (user) { await bootstrapOfflineData(user.id, true); await refresh(); toast.success("Données du serveur enregistrées localement."); } }}
            >
              <RefreshCw className={`h-4 w-4 ${boot.running ? "animate-spin" : ""}`} />
              Télécharger les données du serveur
            </Button>
            <span className="text-xs text-muted-foreground">
              {boot.running
                ? `Téléchargement en cours : ${boot.current ?? ""} (${boot.completed}/${boot.total})`
                : boot.lastBootstrapAt
                  ? `Dernier téléchargement : ${when(boot.lastBootstrapAt)} · ${Object.values(counts).reduce((a, b) => a + b, 0)} enregistrement(s) locaux`
                  : "Aucune donnée locale : connectez-vous à Internet pour lancer le téléchargement."}
            </span>
          </div>
          {boot.error && <div className="text-xs text-warning-foreground">{boot.error}</div>}
          {Object.keys(counts).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(counts).filter(([, n]) => n > 0).map(([table, n]) => (
                <Badge key={table} variant="secondary" className="text-[10px]">{table} · {n}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Résolution des conflits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={policy}
              onValueChange={(value) => {
                const next = value as ConflictPolicy;
                setPolicy(next);
                setConflictPolicy(next);
                toast.success("Stratégie enregistrée");
              }}
            >
              <SelectTrigger className="w-[340px] max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(POLICY_LABELS) as ConflictPolicy[]).map((key) => (
                  <SelectItem key={key} value={key}>{POLICY_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {conflicts.length > 0 && (
              <Button variant="outline" size="sm" onClick={async () => { await clearConflicts(); await refresh(); }}>
                Effacer le journal
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Appliquée au téléchargement des données serveur : elle décide, champ par champ, si la valeur saisie hors ligne
            ou celle du serveur est conservée.
          </p>
          {conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun conflit détecté.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donnée</TableHead><TableHead>Champ</TableHead>
                  <TableHead>Local</TableHead><TableHead>Serveur</TableHead>
                  <TableHead>Retenu</TableHead><TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.table}</TableCell>
                    <TableCell className="text-xs">{c.field}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{JSON.stringify(c.localValue)}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{JSON.stringify(c.serverValue)}</TableCell>
                    <TableCell><Badge variant={c.winner === "local" ? "secondary" : "outline"}>{c.winner === "local" ? "Local" : "Serveur"}</Badge></TableCell>
                    <TableCell className="text-xs">{when(c.at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">File d'attente ({queue.length})</CardTitle></CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune écriture en attente : tout est envoyé au serveur.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opération</TableHead><TableHead>Type</TableHead><TableHead>Créée le</TableHead>
                  <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="text-sm">{op.label}</TableCell>
                    <TableCell className="text-xs">{KIND_LABELS[op.kind] ?? op.kind}</TableCell>
                    <TableCell className="text-xs">{when(op.createdAt)}</TableCell>
                    <TableCell>
                      {op.error ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <TriangleAlert className="h-3.5 w-3.5" />{op.error} ({op.tries} essai(s))
                        </span>
                      ) : (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!online || syncing}
                        onClick={async () => {
                          const ok = await retryOperation(op.id);
                          toast[ok ? "success" : "error"](ok ? "Opération envoyée" : "Envoi impossible");
                          qc.invalidateQueries();
                          await refresh();
                        }}
                      >
                        Réessayer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => { await discardOperation(op.id); toast.success("Opération abandonnée"); await refresh(); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Envois réussis</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun envoi enregistré pour l'instant.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Opération</TableHead><TableHead>Type</TableHead><TableHead>Envoyée le</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {history.map((op) => (
                  <TableRow key={`${op.id}-${op.syncedAt}`}>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />{op.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{KIND_LABELS[op.kind] ?? op.kind}</TableCell>
                    <TableCell className="text-xs">{when(op.syncedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
