import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/salaire/confirmer/$token")({ component: Page });

function Page() {
  const { token } = Route.useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["salary-confirmation", token],
    queryFn: async () => {
      const { data, error } = await supabase.from("salary_payments").select("id, status, confirmation_token, confirmed_at").eq("confirmation_token", token).maybeSingle();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  useEffect(() => {
    if (!data || data.status === "confirmed") return;
    const confirm = async () => {
      const { error } = await supabase.from("salary_payments").update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmation_token: null }).eq("id", data.id);
      if (error) {
        toast.error("La confirmation a échoué");
        return;
      }
      toast.success("Salaire confirmé");
      void refetch();
    };
    void confirm();
  }, [data, refetch]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">Confirmation du salaire</h1>
          {isLoading ? <p className="mt-4 text-muted-foreground">Vérification en cours…</p> : null}
          {!isLoading && data?.status === "confirmed" ? <p className="mt-4 text-muted-foreground">Votre paiement a bien été confirmé.</p> : null}
          {!isLoading && !data ? <p className="mt-4 text-muted-foreground">Lien invalide ou déjà utilisé.</p> : null}
          <Button className="mt-6" onClick={() => window.location.assign("/admin/salaries")}>Retour à l’admin</Button>
        </CardContent>
      </Card>
    </div>
  );
}
