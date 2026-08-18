import { useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSync } from "@/hooks/use-sync";
import { syncNow } from "@/lib/offline/sync";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";

export function SyncStatus() {
  const { online, syncing, pending, lastSyncAt } = useSync();
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function run() {
    setBusy(true);
    try {
      const { sent, failed } = await syncNow();
      if (sent > 0) {
        toast.success(`${sent} opération(s) synchronisée(s)`);
        qc.invalidateQueries();
      } else if (failed > 0) {
        toast.error(`${failed} opération(s) n'ont pas pu être envoyées`);
      } else if (!online) {
        toast.warning("Hors ligne : la synchronisation reprendra automatiquement.");
      } else {
        toast.info("Tout est déjà synchronisé.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={run}
          disabled={busy || syncing}
          className={`gap-1.5 px-2 ${online ? "text-success" : "text-warning-foreground"}`}
        >
          {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          <span className="hidden sm:inline text-xs font-medium">{online ? "En ligne" : "Hors ligne"}</span>
          {pending > 0 && (
            <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning-foreground">
              {pending}
            </span>
          )}
          {(busy || syncing) && <RefreshCw className="h-3 w-3 animate-spin" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>{online ? "Connecté au serveur" : "Mode local : les données sont enregistrées sur cet ordinateur"}</div>
          <div>{pending} opération(s) en attente</div>
          {lastSyncAt && <div>Dernière synchro : {new Date(lastSyncAt).toLocaleTimeString("fr-FR")}</div>}
          <div className="mt-1 opacity-70">Cliquer pour synchroniser maintenant</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
