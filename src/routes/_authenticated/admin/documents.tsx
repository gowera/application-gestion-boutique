import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DOCUMENT_TEMPLATES, getStoredDocumentTemplate, setStoredDocumentTemplate, type DocumentTemplateId, type DocumentKind } from "@/lib/document-template";
import { FileText } from "lucide-react";
import { downloadReceipt } from "@/lib/pdf";
import { EditorCanvas } from "@/components/documents/editor-canvas";
import { useSettings } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/admin/documents")({ component: Page });

type Customer = { id: string; name: string; phone?: string | null; is_archived?: boolean };

function Page() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [template, setTemplate] = useState<DocumentTemplateId>(getStoredDocumentTemplate());
  const [designerKind, setDesignerKind] = useState<DocumentKind>("recu");
  const [documentType, setDocumentType] = useState<"Facture" | "Reçu">("Facture");
  const [customerId, setCustomerId] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("0");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["documents-customers"],
    queryFn: async () => ((await supabase.from("customers").select("id,name,phone,is_archived").eq("is_archived", false).order("name")).data ?? []) as Customer[],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents-recent-sales"],
    queryFn: async () => ((await supabase.from("sales").select("id,code,created_at,customers(name)").order("created_at", { ascending: false }).limit(20)).data ?? []),
  });

  const createDocument = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Un client est requis");
      const docCode = code || `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const customer = customers.find((item) => item.id === customerId);
      downloadReceipt({
        shopName: settings?.shop_name ?? "CONETEC",
        address: settings?.address ?? "",
        phone: settings?.phone ?? "",
        code: docCode,
        customer: customer?.name ?? "Client",
        items: [{ name: note || "Prestation", qty: 1, unit: Number(amount || 0), total: Number(amount || 0) }],
        subtotal: Number(amount || 0),
        discount: 0,
        total: Number(amount || 0),
        paid: Number(amount || 0),
        credit: 0,
        currency: settings?.primary_currency ?? "USD",
        rate: settings?.usd_to_cdf_rate ?? 2800,
        documentType,
        template,
      });
      return { code: docCode };
    },
    onSuccess: () => {
      toast.success("Document généré");
      qc.invalidateQueries({ queryKey: ["documents-recent-sales"] });
      setCode(""); setAmount("0"); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedTemplate = useMemo(() => DOCUMENT_TEMPLATES.find((item) => item.id === template) ?? DOCUMENT_TEMPLATES[0], [template]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">Concevez vos factures et reçus avec un éditeur canvas. Le modèle sélectionné est utilisé partout (POS, caisse, ventes, documents).</p>
      </div>

      <Tabs defaultValue="designer">
        <TabsList>
          <TabsTrigger value="designer">Éditeur canvas</TabsTrigger>
          <TabsTrigger value="settings">Modèle actif & génération</TabsTrigger>
        </TabsList>

        <TabsContent value="designer" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Éditeur de document</CardTitle>
                  <p className="text-sm text-muted-foreground">Glissez-déposez les éléments, ajustez couleurs, tailles et positions. Enregistrez pour l'utiliser sur toute la plateforme.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Type :</Label>
                  <Select value={designerKind} onValueChange={(v) => setDesignerKind(v as DocumentKind)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facture">Facture</SelectItem>
                      <SelectItem value="recu">Reçu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EditorCanvas kind={designerKind} onSaved={() => setTemplate("custom")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader><CardTitle>Modèle actif</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Style utilisé pour les documents générés</Label>
                  <Select value={template} onValueChange={(value) => { const v = value as DocumentTemplateId; setTemplate(v); setStoredDocumentTemplate(v); toast.success("Modèle actif mis à jour"); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TEMPLATES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" />{selectedTemplate.label}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
                <p className="text-xs text-muted-foreground">Ce modèle est appliqué automatiquement à toutes les impressions de reçus et factures — POS, caisse, ventes, page Documents.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Générer un document</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Type</Label>
                  <Select value={documentType} onValueChange={(value) => setDocumentType(value as "Facture" | "Reçu")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facture">Facture</SelectItem>
                      <SelectItem value="Reçu">Reçu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Code</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex. INV-001" />
                </div>
                <div>
                  <Label>Montant (USD)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails du document" />
                </div>
                <Button className="w-full" onClick={() => createDocument.mutate()} disabled={createDocument.isPending}>Générer le document PDF</Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle>Ventes récentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">{doc.code}</TableCell>
                      <TableCell>{(doc as { customers?: { name?: string } }).customers?.name ?? "—"}</TableCell>
                      <TableCell>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
