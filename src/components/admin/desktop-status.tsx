import { useCallback, useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type DesktopUpdate = {
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  updateAvailable: boolean;
};

type PrinterInfo = {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
};

export function DesktopStatus() {
  const [version, setVersion] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[] | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [update, setUpdate] = useState<DesktopUpdate | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const refreshPrinters = useCallback(async () => {
    const desktop = typeof window === "undefined" ? undefined : window.conetecDesktop;
    if (!desktop) return;
    try {
      setPrinters(await desktop.listPrinters());
      setPrinterError(null);
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const checkUpdate = useCallback(async () => {
    const desktop = typeof window === "undefined" ? undefined : window.conetecDesktop;
    if (!desktop) return;
    if (!navigator.onLine) {
      setUpdateError("Internet indisponible; la version sera vérifiée à la reconnexion.");
      return;
    }
    try {
      const [currentVersion, latest] = await Promise.all([
        desktop.getAppVersion(),
        desktop.checkForUpdates(),
      ]);
      setVersion(currentVersion);
      setUpdate(latest);
      setUpdateError(null);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    const desktop = window.conetecDesktop;
    if (!desktop) return;
    void desktop.getAppVersion().then(setVersion).catch((error: unknown) => {
      setUpdateError(error instanceof Error ? error.message : String(error));
    });
    void refreshPrinters();
    void checkUpdate();
    const refresh = () => {
      void refreshPrinters();
      void checkUpdate();
    };
    const timer = window.setInterval(refreshPrinters, 15_000);
    const updateTimer = window.setInterval(checkUpdate, 5 * 60_000);
    window.addEventListener("online", checkUpdate);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(updateTimer);
      window.removeEventListener("online", checkUpdate);
      window.removeEventListener("focus", refresh);
    };
  }, [checkUpdate, refreshPrinters]);

  if (typeof window === "undefined" || !window.conetecDesktop) return null;
  const printer = printers?.find((item) => item.isDefault) ?? printers?.[0];
  const printerLabel = printerError
    ? "Erreur imprimante"
    : printer?.displayName ?? (printers?.length === 0 ? "Aucune imprimante" : "Imprimantes…");

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <span className="inline-flex max-w-48 items-center gap-1 truncate text-muted-foreground" title={printerError ?? printer?.displayName ?? "Aucune imprimante Windows détectée"}>
        <Printer className="h-3.5 w-3.5 shrink-0" />
        {printerLabel}
      </span>
      {version && <span className="hidden text-muted-foreground sm:inline">v{version}</span>}
      {update?.updateAvailable && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 px-2"
          title={`Version ${update.latestVersion} disponible`}
          onClick={async () => {
            try {
              await window.conetecDesktop?.openRelease(update.downloadUrl);
              setUpdateError(null);
            } catch (error) {
              setUpdateError(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Mise à jour {update.latestVersion}</span>
        </Button>
      )}
      {updateError && <span className="hidden max-w-36 truncate text-[10px] text-muted-foreground md:inline" role="status" title={updateError}>Version non vérifiée</span>}
    </div>
  );
}
