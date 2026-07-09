import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/admin" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/admin", replace: true });
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
          emailRedirectTo: `${window.location.origin}/admin`,
          data: { full_name: fullName },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Compte créé. Un administrateur doit vous attribuer un rôle.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-primary-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-energy text-energy-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-display text-xl font-bold">CONETEC</span>
        </Link>
        <Card>
          <CardContent className="p-6">
            <h1 className="text-display text-2xl font-bold">
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Accédez à votre espace d'administration." : "Ouvrez un compte employé."}
            </p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
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
            </form>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "Pas encore de compte ? Créer un compte" : "J'ai déjà un compte — Se connecter"}
            </button>
            <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
              ← Retour au site public
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
