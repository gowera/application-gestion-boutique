import { useState } from "react";
import { AlertCircle, CheckCircle2, Monitor, Download, WifiOff, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useSettings } from "@/lib/currency";
import { useSync } from "@/hooks/use-sync";
import windowsAppAsset from "@/assets/gestionstock-setup-1.4.11.exe.asset.json";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "inconnue";
  const units = ["o", "Ko", "Mo", "Go"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

type DownloadFailure = {
  message: string;
  url: string;
  status: string;
  received: number;
  expected: number;
};

export function WindowsAppCard() {
  const { data: settings } = useSettings();
  const { pending, online } = useSync();
  const assetUrl = windowsAppAsset.url.startsWith("/")
    ? `https://project--${windowsAppAsset.project_id}-dev.lovable.app${windowsAppAsset.url}`
    : windowsAppAsset.url;
  const url = assetUrl;
  const version = windowsAppAsset.app_version;
  const size = formatBytes(windowsAppAsset.size);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [received, setReceived] = useState(0);
  const [expected, setExpected] = useState(0);
  const [failure, setFailure] = useState<DownloadFailure | null>(null);
  const [complete, setComplete] = useState(false);

  async function downloadWindowsApp() {
    if (!url || downloading) return;
    setDownloading(true);
    setProgress(0);
    setReceived(0);
    setExpected(0);
    setFailure(null);
    setComplete(false);
    let status = "Aucune réponse";
    let loaded = 0;
    let total = 0;

    try {
      if (url.includes("github.com/gowera/application-gestion-boutique/releases/download/")) {
        if (window.conetecDesktop) {
          await window.conetecDesktop.openRelease(url);
          setComplete(true);
          return;
        }
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setComplete(true);
        return;
      }

      const response = await fetch(url);
      status = `${response.status} ${response.statusText || ""}`.trim();
      total = Number(response.headers.get("content-length") ?? 0);
      setExpected(total);
      if (!response.ok) throw new Error("Le serveur a refusé le téléchargement.");
      if (!response.body) throw new Error("Le serveur n’a envoyé aucun contenu téléchargeable.");

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        chunks.push(result.value);
        loaded += result.value.byteLength;
        setReceived(loaded);
        if (total > 0) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
      }
      if (total > 0 && loaded !== total) throw new Error("Le fichier reçu est incomplet.");

      const blobParts = chunks.map((chunk) => chunk.slice().buffer);
      const contentType = response.headers.get("content-type") || windowsAppAsset.content_type;
      const blobUrl = URL.createObjectURL(new Blob(blobParts, { type: contentType }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `GestionStock-Setup-${version}.exe`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      setProgress(100);
      setComplete(true);
    } catch (error) {
      setFailure({
        message: error instanceof Error ? error.message : "Échec inattendu du téléchargement.",
        url,
        status,
        received: loaded,
        expected: total,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
      <CardContent className="p-5 flex flex-wrap items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Monitor className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Application Windows</div>
          <div className="text-display text-xl font-bold">Gestion Stock pour PC</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Installeur Windows : lancez le fichier téléchargé. Un raccourci Gestion Stock sera créé sur le Bureau et dans le menu
            Démarrer. L’application fonctionne sans internet : les ventes, dépenses et
            clients saisis hors ligne restent uniquement sur cet ordinateur et ne sont pas synchronisés.
            {url ? ` Version ${version}. (${size})` : ` Mise à jour ${version} en préparation.`}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              {online ? <RefreshCw className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Téléchargement disponible" : "Mode local actif"}
            </span>
            <span className="text-muted-foreground">{pending} opération(s) en attente</span>
          </div>
        </div>
        {url ? (
          <Button size="lg" className="gap-2" disabled={downloading} onClick={downloadWindowsApp}>
            {downloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "Téléchargement…" : "Télécharger pour Windows"}
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled className="gap-2">
            <Download className="h-4 w-4" />
            Mise à jour en préparation
          </Button>
        )}
        {(downloading || received > 0) && !failure && (
          <div className="basis-full space-y-2" aria-live="polite">
            <Progress value={progress} aria-label="Progression du téléchargement" />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>{progress}% téléchargé</span>
              <span>{formatBytes(received)}{expected > 0 ? ` / ${formatBytes(expected)}` : " reçus"}</span>
            </div>
          </div>
        )}
        {complete && !failure && (
          <Alert className="basis-full border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Téléchargement terminé</AlertTitle>
            <AlertDescription>Le téléchargement de Gestion Stock {version} a été lancé.</AlertDescription>
          </Alert>
        )}
        {failure && (
          <Alert variant="destructive" className="basis-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Échec du téléchargement</AlertTitle>
            <AlertDescription className="space-y-1 break-all">
              <p>{failure.message}</p>
              <p><strong>URL :</strong> {failure.url}</p>
              <p><strong>Statut HTTP :</strong> {failure.status}</p>
              <p><strong>Taille :</strong> {formatBytes(failure.received)} reçus{failure.expected > 0 ? ` sur ${formatBytes(failure.expected)}` : " (taille totale inconnue)"}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
