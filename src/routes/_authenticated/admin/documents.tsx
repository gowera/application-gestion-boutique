import { createFileRoute, Link } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { DOCUMENT_TEMPLATES, getStoredDocumentTemplate, setStoredDocumentTemplate, type DocumentTemplateId, type DocumentKind } from "@/lib/document-template";
import { FileText, History } from "lucide-react";
import { downloadReceipt } from "@/lib/pdf";
import { useLogoDataUrl } from "@/lib/logo";
import { EditorCanvas } from "@/components/documents/editor-canvas";
import { useSettings } from "@/lib/currency";
import { issueDocumentNumber, labelToDocType } from "@/lib/documents";

export const Route = createFileRoute("/_authenticated/admin/documents")({ component: Page });

type Customer = { id: string; name: string; phone?: string | null; is_archived?: boolean };
type LineItem = { name: string; qty: number; unit: number };

function Page() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const logoDataUrl = useLogoDataUrl();
  const [template, setTemplate] = useState<DocumentTemplateId>(getStoredDocumentTemplate());
  const [designerKind, setDesignerKind] = useState<DocumentKind>("recu");
  const [documentType, setDocumentType] = useState<"Facture" | "Reçu">("Facture");
  const [customerId, setCustomerId] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({ name: "", phone: "", address: "" });
  const [saveManual, setSaveManual] = useState(false);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ name: "", qty: 1, unit: 0 }]);


  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["documents-customers"],
    queryFn: async () => ((await supabase.from("customers").select("id,name,phone,is_archived").eq("is_archived", false).order("name")).data ?? []) as Customer[],
  });

  const subtotal = lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.unit || 0), 0);

  const createDocument = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Un client est requis");
      if (!lines.some((l) => l.name.trim())) throw new Error("Ajoutez au moins une ligne");
      const customer = customers.find((c) => c.id === customerId);
      const items = lines.filter((l) => l.name.trim()).map((l) => ({ name: l.name, qty: Number(l.qty || 0), unit: Number(l.unit || 0), total: Number(l.qty || 0) * Number(l.unit || 0) }));
      const total = items.reduce((a, i) => a + i.total, 0);
      let docCode = "";
      try {
        const issued = await issueDocumentNumber({ docType: labelToDocType(documentType), customerName: customer?.name ?? null, totalUsd: total });
        docCode = issued.code;
      } catch {
        docCode = `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      }
      downloadReceipt({
        logoDataUrl,
        shopName: settings?.shop_name ?? "CONETEC",
        address: settings?.address ?? "", phone: settings?.phone ?? "",
        code: docCode, customer: customer?.name ?? "Client",
        items, subtotal: total, discount: 0, total, paid: total, credit: 0,
        currency: settings?.primary_currency ?? "USD", rate: settings?.usd_to_cdf_rate ?? 2800,
        documentType, template, note: note || undefined,
      });
      return { code: docCode };
    },
    onSuccess: () => {
      toast.success("Document généré");
      qc.invalidateQueries({ queryKey: ["document-history"] });
      setLines([{ name: "", qty: 1, unit: 0 }]); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedTemplate = useMemo(() => DOCUMENT_TEMPLATES.find((item) => item.id === template) ?? DOCUMENT_TEMPLATES[0], [template]);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">Créez vos modèles (design & format) et générez factures ou reçus.</p>
        </div>
        <Button asChild variant="outline"><Link to="/admin/documents/history"><History className="mr-2 h-4 w-4" />Historique</Link></Button>
      </div>

      <Tabs defaultValue="models">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="models">Modèles de document</TabsTrigger>
          <TabsTrigger value="create">Créer un document</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Éditeur de modèle</CardTitle>
                  <p className="text-sm text-muted-foreground">Glissez-déposez les éléments, ajustez couleurs, tailles, positions et format. Le modèle enregistré est utilisé partout (POS, caisse, ventes, création manuelle).</p>
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
            <CardContent className="min-w-0 overflow-x-auto p-3 sm:p-6">
              <EditorCanvas kind={designerKind} onSaved={() => { setTemplate("custom"); setStoredDocumentTemplate("custom"); toast.success("Modèle enregistré et appliqué partout"); }} />
            </CardContent>
          </Card>

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
              <p className="text-xs text-muted-foreground">Appliqué automatiquement partout : POS, caisse, ventes, création manuelle.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Créer un document manuellement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Type</Label>
                  <Select value={documentType} onValueChange={(v) => setDocumentType(v as "Facture" | "Reçu")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facture">Facture</SelectItem>
                      <SelectItem value="Reçu">Reçu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Client</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setManualMode((v) => !v); setCustomerId(""); }}>
                        {manualMode ? "Choisir dans la liste" : "Saisir manuellement"}
                      </Button>
                      {!manualMode && <CustomerQuickAdd onCreated={(id) => { qc.invalidateQueries({ queryKey: ["documents-customers"] }); setCustomerId(id); }} />}
                    </div>
                  </div>
                  {manualMode ? (
                    <div className="space-y-2">
                      <Input placeholder="Nom du client *" value={manualCustomer.name} onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Téléphone" value={manualCustomer.phone} onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })} />
                        <Input placeholder="Adresse" value={manualCustomer.address} onChange={(e) => setManualCustomer({ ...manualCustomer, address: e.target.value })} />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={saveManual} onChange={(e) => setSaveManual(e.target.checked)} />
                        Enregistrer ce client dans la base
                      </label>
                    </div>
                  ) : (
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

              </div>

              <div className="space-y-2">
                <Label>Lignes</Label>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[2fr_80px_120px_auto]">
                    <Input className="col-span-2 md:col-span-1" placeholder="Désignation" value={line.name} onChange={(e) => setLines(lines.map((l, ix) => ix === i ? { ...l, name: e.target.value } : l))} />
                    <Input type="number" min="1" value={line.qty} onChange={(e) => setLines(lines.map((l, ix) => ix === i ? { ...l, qty: +e.target.value } : l))} />
                    <Input type="number" step="0.01" placeholder="P.U. USD" value={line.unit} onChange={(e) => setLines(lines.map((l, ix) => ix === i ? { ...l, unit: +e.target.value } : l))} />
                    <Button variant="outline" className="col-span-2 md:col-span-1" onClick={() => setLines(lines.filter((_, ix) => ix !== i))} disabled={lines.length === 1}>Retirer</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setLines([...lines, { name: "", qty: 1, unit: 0 }])}>+ Ajouter une ligne</Button>
                <div className="text-right text-sm font-semibold pt-1">Total : ${subtotal.toFixed(2)}</div>
              </div>

              <div>
                <Label>Note</Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails ou conditions" />
              </div>
              <Button className="w-full" onClick={() => createDocument.mutate()} disabled={createDocument.isPending}>Générer le PDF ({documentType})</Button>
              <p className="text-xs text-muted-foreground">Le document est numéroté automatiquement (séquentiel, sans doublon) et utilise le modèle actif.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
