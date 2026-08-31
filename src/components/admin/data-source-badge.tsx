import { Cloud, HardDrive, RefreshCw } from "lucide-react";

/**
 * Indicateur clair de provenance des données affichées :
 * base locale (démarrage instantané) ou serveur (données fraîches).
 */
export function DataSourceBadge({
  source,
  refreshing,
  className = "",
}: {
  source: "local" | "server" | "none";
  refreshing?: boolean;
  className?: string;
}) {
  const local = source !== "server";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        local
          ? "border-warning/40 bg-warning/15 text-warning-foreground"
          : "border-success/40 bg-success/10 text-success"
      } ${className}`}
      title={
        local
          ? "Affichage immédiat depuis la base de données locale de cet ordinateur."
          : "Données à jour reçues du serveur."
      }
    >
      {local ? <HardDrive className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
      {local ? "Données locales" : "Données serveur"}
      {refreshing && <RefreshCw className="h-3 w-3 animate-spin opacity-70" />}
    </span>
  );
}
