import { CloudOff, HardDrive, RefreshCw } from "lucide-react";
import { useSync } from "@/hooks/use-sync";
import { Button } from "@/components/ui/button";
import { syncNow } from "@/lib/offline/sync";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

/**
 * Bandeau affiché en haut des écrans qui écrivent des données
 * (caisse, dettes, factures, stock) pour indiquer l'état hors ligne
 * et le nombre d'écritures en attente de synchronisation.
 */
export function OfflineBanner({ scope }: { scope?: string }) {
  const { online, pending, syncing, lastSyncAt } = useSync();
  const qc = useQueryClient();
  const desktop = typeof window !== "undefined" && Boolean(window.conetecDesktop);

  if (!desktop && online && pending === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-xs ${
        online ? "border-primary/30 bg-primary/5" : "border-warning/40 bg-warning/10"
      }`}
    >
      {desktop ? <HardDrive className="h-4 w-4 shrink-0" /> : online ? <RefreshCw className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {desktop ? "Mode local — aucune synchronisation" : online ? "Écritures en attente de synchronisation" : "Mode hors ligne — enregistrement local"}
        </div>
        <div className="text-muted-foreground">
          {desktop
            ? `Les données${scope ? ` (${scope})` : ""} restent uniquement sur cet ordinateur.`
            : pending > 0
            ? `${pending} opération(s) en attente${scope ? ` (${scope} inclus)` : ""}.`
            : "Vos saisies sont conservées sur cet ordinateur et envoyées dès le retour de la connexion."}
          {!desktop && lastSyncAt && ` Dernière synchro : ${new Date(lastSyncAt).toLocaleTimeString("fr-FR")}.`}
        </div>
      </div>
      {!desktop && <Button size="sm" variant="ghost" asChild>
        <Link to="/admin/sync">Détails</Link>
      </Button>}
      {!desktop && <Button
        size="sm"
        variant="outline"
        disabled={syncing || !online}
        onClick={async () => {
          await syncNow();
          qc.invalidateQueries();
        }}
      >
        {syncing ? "Synchronisation…" : "Synchroniser"}
      </Button>}
    </div>
  );
}
