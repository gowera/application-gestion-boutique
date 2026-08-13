import { Check, Clock, Package, Truck, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipping: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

const STEPS = [
  { key: "pending", label: "Reçue", icon: Clock },
  { key: "confirmed", label: "Confirmée", icon: Check },
  { key: "preparing", label: "Préparation", icon: Package },
  { key: "shipping", label: "En route", icon: Truck },
  { key: "delivered", label: "Livrée", icon: Home },
] as const;

export function OrderTimeline({ status, mode, className }: { status: string; mode?: string | null; className?: string }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm", className)}>
        <XCircle className="h-4 w-4 text-destructive" />
        <span>{ORDER_STATUS_LABEL[status]} — cette commande n'est plus en cours de traitement.</span>
      </div>
    );
  }
  const steps = STEPS.map((s) =>
    s.key === "shipping" && mode === "pickup" ? { ...s, label: "Prête au retrait" } : s,
  );
  const idx = Math.max(0, steps.findIndex((s) => s.key === status));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-start">
        {steps.map((s, i) => {
          const done = i <= idx;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-border")} />
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className={cn("h-0.5 flex-1", i === steps.length - 1 ? "bg-transparent" : i < idx ? "bg-primary" : "bg-border")} />
              </div>
              <span className={cn("mt-1.5 text-center text-[10px] leading-tight sm:text-xs", done ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
