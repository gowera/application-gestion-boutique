import { useEffect, useState, useSyncExternalStore } from "react";
import { Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBootstrapProgress, subscribeBootstrap, provisionOfflinePin, restoreBootstrapMeta } from "@/lib/offline/bootstrap";
import { syncNow } from "@/lib/offline/sync";
import { useCurrentUser, useMyRoles } from "@/hooks/use-auth";
import { toast } from "sonner";
import { setLocalUser } from "@/lib/offline/store";

const serverProgress = { running: false, completed: 0, total: 29, current: null, ready: false, lastBootstrapAt: null, error: null };

export function OfflineSetup() {
  const { user } = useCurrentUser();
  const userId = user?.id;
  const { data: roles = [] } = useMyRoles();
  const state = useSyncExternalStore(subscribeBootstrap, getBootstrapProgress, () => serverProgress);
  const [needsPin, setNeedsPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (window.conetecDesktop) {
      setLocalUser(userId);
      void window.conetecDesktop.hasOfflinePin().then((hasPin) => setNeedsPin(!hasPin));
      return;
    }
    // À chaque ouverture : on relit l'état local puis on rapatrie les données du
    // serveur vers la base locale (JSON) dès qu'une connexion est disponible.
    void restoreBootstrapMeta(userId).then(() => syncNow(true))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Impossible de lire la base locale."));
    if (window.conetecDesktop) void window.conetecDesktop.hasOfflinePin().then((hasPin) => setNeedsPin(!hasPin));
  }, [userId]);

  async function savePin() {
    if (!user) return;
    if (!/^\d{4,8}$/.test(pin)) return toast.error("Le PIN doit contenir 4 à 8 chiffres.");
    if (pin !== confirmPin) return toast.error("Les deux PIN ne correspondent pas.");
    setSaving(true);
    const result = await provisionOfflinePin(pin, { userId: user.id, email: user.email ?? "", roles });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Impossible d’activer l’accès hors ligne.");
    setNeedsPin(false);
    setPin(""); setConfirmPin("");
    toast.success("Accès hors ligne sécurisé activé sur cet appareil.");
  }

  return (
    <>
      {state.running && (
        <div className="border-b bg-primary/5 px-4 py-2 text-xs">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Database className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3"><span>Téléchargement des données locales : {state.current}</span><span>{state.completed}/{state.total}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round((state.completed / state.total) * 100)}%` }} /></div>
            </div>
          </div>
        </div>
      )}
      {!state.running && state.error && (
        <div role="alert" className="border-b bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">Enregistrement local incomplet : {state.error}.</div>
      )}
      <Dialog open={needsPin} onOpenChange={() => {}}>
        <DialogContent onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Activer l’accès hors ligne</DialogTitle>
            <DialogDescription>Créez un PIN propre à cet ordinateur. Il déverrouillera uniquement les données locales ; votre mot de passe Gestion Stock n’est jamais enregistré.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>PIN (4 à 8 chiffres)</Label><Input type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
            <div><Label>Confirmer le PIN</Label><Input type="password" inputMode="numeric" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
            <Button className="w-full" onClick={savePin} disabled={saving || state.running || !state.ready || roles.length === 0}>{saving ? "Sécurisation…" : state.running ? "Préparation des données…" : !state.ready ? "Données locales incomplètes" : "Activer sur cet appareil"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}