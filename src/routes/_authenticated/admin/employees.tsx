import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmployeesSection } from "@/components/admin-sections/employees-section";
import { SalariesSection } from "@/components/admin-sections/salaries-section";

export const Route = createFileRoute("/_authenticated/admin/employees")({ component: Page });

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl font-bold">Ressources humaines</h1>
        <p className="text-sm text-muted-foreground">Employés et paiements de salaires réunis au même endroit.</p>
      </div>
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employés</TabsTrigger>
          <TabsTrigger value="salaries">Salaires</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4"><EmployeesSection /></TabsContent>
        <TabsContent value="salaries" className="mt-4"><SalariesSection /></TabsContent>
      </Tabs>
    </div>
  );
}
