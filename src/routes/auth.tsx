import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLogoUrl } from "@/lib/logo";
import { STAFF_ROLES } from "@/lib/permissions";
import { setOfflineUnlocked, type OfflineProfile } from "@/lib/offline/auth";
import { setLocalUser } from "@/lib/offline/store";

async function landingFor(userId: string): Promise<"/admin"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const list = (data ?? []).map((r) => r.role as string);
  return list.some((r) => (STAFF_ROLES as string[]).includes(r)) ? "/admin" : "/admin";
}


export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Connexion — Gestion Stock" },
    { name: "description", content: "Connectez-vous à votre boutique ou déverrouillez vos données locales avec votre PIN." },
    { property: "og:title", content: "Connexion — Gestion Stock" },
    { property: "og:description", content: "Accédez à votre espace de gestion de stock et de vente directe." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined" && window.conetecDesktop) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: await landingFor(data.user.id) });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const logoUrl = useLogoUrl();
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [offlinePin, setOfflinePin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [desktop, setDesktop] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [setupProfile, setSetupProfile] = useState<OfflineProfile | null>(null);

  useEffect(() => {
    const bridge = window.conetecDesktop;
    if (!bridge) return;
    setDesktop(true);
    void bridge.isLocalOnly().then(setLocalOnly);
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return toast.error(error.message);
      }
      if (desktop) {
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        setLoading(false);
        if (rolesError) return toast.error(rolesError.message);
        const roles = (userRoles ?? []).map((row) => row.role as string);
        if (!roles.some((role) => (STAFF_ROLES as string[]).includes(role))) {
          return toast.error("Ce compte n’a pas accès à la gestion de boutique.");
        }
        setSetupProfile({ userId: data.user.id, email: data.user.email ?? email, roles });
        return;
      }
      setLoading(false);
      toast.success("Connexion réussie");
      navigate({ to: await landingFor(data.user.id), replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: { full_name: fullName },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Compte créé — bienvenue.");
      if (data.user && data.session) navigate({ to: await landingFor(data.user.id), replace: true });
    }
  }

  async function activateLocalMode() {
    if (!setupProfile || !window.conetecDesktop) return;
    if (!/^\d{4,8}$/.test(offlinePin)) return toast.error("Le PIN doit contenir 4 à 8 chiffres.");
    if (offlinePin !== confirmPin) return toast.error("Les deux PIN ne correspondent pas.");
    setLoading(true);
    const result = await window.conetecDesktop.configureOfflinePin(offlinePin, setupProfile);
    setLoading(false);
    if (!result.ok) return toast.error(result.error ?? "Impossible d’activer le mode local.");
    setOfflineUnlocked(setupProfile);
    setLocalUser(setupProfile.userId);
    toast.success("Mode local activé. Aucune synchronisation ne sera effectuée.");
    navigate({ to: "/admin", replace: true });
  }

  async function unlockOffline() {
    if (!window.conetecDesktop) return;
    setLoading(true);
    const result = await window.conetecDesktop.unlockOffline(offlinePin);
    setLoading(false);
    if (!result.ok || !result.profile) return toast.error(result.error ?? "Déverrouillage impossible");
    setOfflineUnlocked(result.profile);
    setLocalUser(result.profile.userId);
    toast.success("Données locales déverrouillées");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-foreground">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-md bg-background/90 object-contain p-1" />}
          <span className="text-display text-xl font-bold">Gestion de stock</span>
        </Link>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-display text-2xl font-bold">
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {setupProfile
                ? "Définissez un PIN pour protéger les données stockées uniquement sur cet ordinateur."
                : mode === "login" ? "Accédez à votre espace de gestion." : "Créez votre compte de gestion."}
            </p>
            {desktop && localOnly ? (
              <div className="mt-6 space-y-4">
                <div><Label>PIN de cet appareil</Label><Input type="password" inputMode="numeric" value={offlinePin} onChange={(event) => setOfflinePin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
                <Button type="button" className="w-full" size="lg" disabled={loading || offlinePin.length < 4} onClick={unlockOffline}>{loading ? "Vérification…" : "Déverrouiller hors ligne"}</Button>
                <p className="text-center text-xs text-muted-foreground">Toutes les données de ce compte restent sur cet ordinateur. Aucune synchronisation n’est active.</p>
              </div>
            ) : setupProfile ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">Compte vérifié : {setupProfile.email}. La base locale démarre vide.</p>
                <div><Label>PIN (4 à 8 chiffres)</Label><Input type="password" inputMode="numeric" value={offlinePin} onChange={(event) => setOfflinePin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
                <div><Label>Confirmer le PIN</Label><Input type="password" inputMode="numeric" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
                <Button type="button" className="w-full" size="lg" disabled={loading || offlinePin.length < 4 || confirmPin.length < 4} onClick={activateLocalMode}>{loading ? "Activation…" : "Activer le mode local"}</Button>
              </div>
            ) : desktop && !navigator.onLine ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">Une connexion Internet est nécessaire une seule fois pour vérifier le compte et activer cet appareil.</p>
            ) : <form className="mt-6 space-y-4" onSubmit={submit}>
              {mode === "signup" && (
                <div>
                  <Label>Nom complet</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <Label>Mot de passe</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Patientez..." : mode === "login" ? "Se connecter" : "Créer le compte"}
              </Button>
            </form>}
            {!desktop && <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "Pas encore de compte ? Créer un compte" : "J'ai déjà un compte — Se connecter"}
            </button>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
