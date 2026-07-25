import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PurchasesSection } from "@/components/admin-sections/purchases-section";
import { SuppliersSection } from "@/components/admin-sections/suppliers-section";

export const Route = createFileRoute("/_authenticated/admin/purchases")({ component: Page });

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl font-bold">Achats & fournisseurs</h1>
        <p className="text-sm text-muted-foreground">Gérez vos bons d'achat et vos fournisseurs depuis une seule page.</p>
      </div>
      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Achats</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-4"><PurchasesSection /></TabsContent>
        <TabsContent value="suppliers" className="mt-4"><SuppliersSection /></TabsContent>
      </Tabs>
    </div>
  );
}
