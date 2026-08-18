import { Monitor, Download, WifiOff, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/currency";
import { useSync } from "@/hooks/use-sync";

function extra(settings: unknown, key: string): string {
  const extras = (settings as { extras?: Record<string, unknown> } | null)?.extras;
  const value = extras && typeof extras === "object" ? extras[key] : undefined;
  return typeof value === "string" ? value : "";
}

export function WindowsAppCard() {
  const { data: settings } = useSettings();
  const { pending, online } = useSync();
  const url = extra(settings, "win_app_url");
  const version = extra(settings, "win_app_version");
  const size = extra(settings, "win_app_size");

  return (
    <Card className="overflow-hidden rounded-2xl border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
      <CardContent className="p-5 flex flex-wrap items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Monitor className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Application Windows</div>
          <div className="text-display text-xl font-bold">CONETEC Admin pour PC</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Fonctionne sans internet : les ventes, dépenses et clients saisis hors ligne sont envoyés au serveur dès que la
            connexion revient.
            {version && ` Version ${version}.`}
            {size && ` (${size})`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              {online ? <RefreshCw className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Synchronisation active" : "Mode local actif"}
            </span>
            <span className="text-muted-foreground">{pending} opération(s) en attente</span>
          </div>
        </div>
        {url ? (
          <Button asChild size="lg" className="gap-2">
            <a href={url} download>
              <Download className="h-4 w-4" />
              Télécharger pour Windows
            </a>
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled className="gap-2">
            <Download className="h-4 w-4" />
            Bientôt disponible
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
