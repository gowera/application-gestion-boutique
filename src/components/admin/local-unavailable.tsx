import { HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LocalUnavailable({ feature }: { feature: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-display text-2xl font-bold">{feature}</h1>
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Fonction indisponible dans la version locale</p>
            <p className="text-sm text-muted-foreground">
              Cette fonction dépend d’un service en ligne. Vos données de boutique restent uniquement sur cet ordinateur.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
