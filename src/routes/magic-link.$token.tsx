import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/magic-link/$token")({ component: Page });

function Page() {
  const { token } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["magic-link", token],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("token, expires_at, role").eq("token", token).maybeSingle();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <h1 className="text-2xl font-bold">Invitation</h1>
          {isLoading ? <p className="mt-4 text-muted-foreground">Vérification de l’invitation…</p> : null}
          {!isLoading && data ? <p className="mt-4 text-muted-foreground">L’invitation est valide pour le rôle {data.role}. La suite de connexion peut être branchée à Supabase Auth.</p> : null}
          {!isLoading && !data ? <p className="mt-4 text-muted-foreground">Lien d’invitation invalide ou expiré.</p> : null}
          <Button className="mt-6" onClick={() => window.location.assign("/auth")}>Aller à la connexion</Button>
        </CardContent>
      </Card>
    </div>
  );
}
