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
import { setOfflineUnlocked } from "@/lib/offline/auth";
import { setLocalUser } from "@/lib/offline/store";

async function landingFor(userId: string): Promise<"/admin" | "/mon-compte"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const list = (data ?? []).map((r) => r.role as string);
  return list.some((r) => (STAFF_ROLES as string[]).includes(r)) ? "/admin" : "/mon-compte";
}


export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined" && window.conetecDesktop && !navigator.onLine) return;
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
  const desktopOffline = typeof window !== "undefined" && Boolean(window.conetecDesktop) && !navigator.onLine;

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return;
      void landingFor(session.user.id).then((to) => navigate({ to, replace: true }));
    });
    return () => sub.data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Connexion réussie");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/mon-compte`,
          data: { full_name: fullName },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Compte créé — bienvenue dans votre espace client.");
    }
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
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-primary-foreground">
          <img src={logoUrl} alt="Logo CONETEC" className="h-12 w-12 rounded-md bg-background/90 object-contain p-1" />
          <span className="text-display text-xl font-bold">CONETEC</span>
        </Link>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-display text-2xl font-bold">
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Accédez à votre espace client ou d'administration." : "Ouvrez votre compte client CONETEC."}
            </p>
            {desktopOffline ? (
              <div className="mt-6 space-y-4">
                <div><Label>PIN de cet appareil</Label><Input type="password" inputMode="numeric" value={offlinePin} onChange={(event) => setOfflinePin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
                <Button type="button" className="w-full" size="lg" disabled={loading || offlinePin.length < 4} onClick={unlockOffline}>{loading ? "Vérification…" : "Déverrouiller hors ligne"}</Button>
                <p className="text-center text-xs text-muted-foreground">Connexion Internet absente. Le PIN ouvre uniquement les données déjà téléchargées sur cet ordinateur.</p>
              </div>
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
            {!desktopOffline && <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "Pas encore de compte ? Créer un compte" : "J'ai déjà un compte — Se connecter"}
            </button>}
            <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
              ← Retour au site public
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
