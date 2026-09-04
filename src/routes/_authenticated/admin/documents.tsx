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
import { FileText, History, Mail, Printer } from "lucide-react";
import { buildReceiptDoc, type DocumentLabel } from "@/lib/pdf";
import { useDocumentMarks, fileToDataUrl } from "@/lib/document-marks";
import { recordPrint, usePrintLog, formatPrintDate } from "@/lib/print-log";
import { sendDocumentEmail } from "@/lib/email.functions";
import { useCurrentUser } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLogoDataUrl } from "@/lib/logo";
import { EditorCanvas } from "@/components/documents/editor-canvas";
import { useSettings } from "@/lib/currency";
import { labelToDocType } from "@/lib/documents";
import { CustomerQuickAdd } from "@/components/customer-quick-add";
import { runOrQueue } from "@/lib/offline/ops";
import { OfflineBanner } from "@/components/admin/offline-banner";
import { offlineQueryFn } from "@/lib/offline/query";
import { cacheUpdate } from "@/lib/offline/store";
import { markLocalChange } from "@/lib/offline/conflict";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/documents")({ component: Page });

type Customer = { id: string; name: string; phone?: string | null; is_archived?: boolean };
type LineItem = { productId?: string; name: string; qty: number; unit: number };
type Product = { id: string; name: string; sale_price: number; stock: number };

function Page() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const logoDataUrl = useLogoDataUrl();
  const [template, setTemplate] = useState<DocumentTemplateId>(getStoredDocumentTemplate());
  const [designerKind, setDesignerKind] = useState<DocumentKind>("recu");
  const [documentType, setDocumentType] = useState<DocumentLabel>("Facture");
  const [customerId, setCustomerId] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({ name: "", phone: "", address: "" });
  const [saveManual, setSaveManual] = useState(false);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ name: "", qty: 1, unit: 0 }]);
  const [confirmStock, setConfirmStock] = useState(false);
  const marks = useDocumentMarks();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const [lastDoc, setLastDoc] = useState<{ code: string; filename: string; base64: string; customer: string; type: DocumentLabel } | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);



  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["documents-customers"],
    queryFn: offlineQueryFn("query:documents-customers", async () => ((await supabase.from("customers").select("id,name,phone,is_archived").eq("is_archived", false).order("name")).data ?? []) as Customer[], "table:customers"),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["documents-products"],
    queryFn: offlineQueryFn("query:documents-products", async () =>
      ((await supabase.from("products").select("id,name,sale_price,stock").eq("status", "active").is("deleted_at", null).order("name").limit(500)).data ?? []) as Product[], "table:products"),
  });

  const isProforma = documentType === "Facture Proforma";
  const subtotal = lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.unit || 0), 0);
  const stockSummary = useMemo(() => {
    const grouped = new Map<string, { productId: string; name: string; qty: number; stock: number }>();
    for (const line of lines) {
      if (!line.productId || !line.name.trim()) continue;
      const product = products.find((candidate) => candidate.id === line.productId);
      const current = grouped.get(line.productId);
      grouped.set(line.productId, {
        productId: line.productId,
        name: product?.name ?? line.name,
        qty: (current?.qty ?? 0) + Number(line.qty || 0),
        stock: Number(product?.stock ?? 0),
      });
    }
    return Array.from(grouped.values());
  }, [lines, products]);

  /**
   * Génère le PDF, le télécharge, l'inscrit au journal d'impression local
   * (date, heure, utilisateur) et le garde prêt pour un envoi par email.
   */
  const emitDocument = async (args: {
    code: string; customerName: string;
    items: { name: string; qty: number; unit: number; total: number }[];
    total: number; paid: number; credit: number;
  }) => {
    const doc = buildReceiptDoc({
      logoDataUrl,
      shopName: settings?.shop_name ?? "CONETEC",
      address: settings?.address ?? "", phone: settings?.phone ?? "",
      code: args.code, customer: args.customerName,
      items: args.items, subtotal: args.total, discount: 0, total: args.total,
      paid: args.paid, credit: args.credit,
      currency: settings?.primary_currency ?? "USD", rate: settings?.usd_to_cdf_rate ?? 2800,
      documentType, template, note: note || undefined,
      signatureDataUrl: marks.signature, stampDataUrl: marks.stamp,
    });
    const prefix = documentType === "Reçu" ? "recu" : isProforma ? "facture-proforma" : "facture";
    const filename = `${prefix}-${args.code}.pdf`;
    doc.save(filename);
    const base64 = doc.output("datauristring").split(",")[1] ?? "";
    setLastDoc({ code: args.code, filename, base64, customer: args.customerName, type: documentType });
    await recordPrint({
      code: args.code, documentType, customer: args.customerName,
      totalUsd: args.total, user: user?.email ?? "Utilisateur", origin: "création",
    });
  };


  const createDocument = useMutation({
    mutationFn: async (decrementStock: boolean) => {
      if (!lines.some((l) => l.name.trim())) throw new Error("Ajoutez au moins une ligne");
      let customerName: string;
      if (manualMode) {
        if (!manualCustomer.name.trim()) throw new Error("Le nom du client est requis");
        customerName = manualCustomer.name.trim();
        if (saveManual) {
          const payload = {
            name: customerName,
            phone: manualCustomer.phone || null,
            address: manualCustomer.address || null,
          };
          await runOrQueue("customer", `Client ${customerName}`, payload, async () => {
            const { error } = await supabase.from("customers").insert(payload);
            if (error) throw error;
          });
          qc.invalidateQueries({ queryKey: ["documents-customers"] });
        }
      } else {
        if (!customerId) throw new Error("Un client est requis");
        customerName = customers.find((c) => c.id === customerId)?.name ?? "Client";
      }
      const items = lines.filter((l) => l.name.trim()).map((l) => ({ name: l.name, qty: Number(l.qty || 0), unit: Number(l.unit || 0), total: Number(l.qty || 0) * Number(l.unit || 0) }));
      const total = items.reduce((a, i) => a + i.total, 0);
      const groupedStock = new Map<string, number>();
      if (decrementStock && !isProforma) {
        for (const line of lines.filter((candidate) => candidate.productId && candidate.name.trim())) {
          const productId = line.productId;
          if (!productId) continue;
          groupedStock.set(productId, (groupedStock.get(productId) ?? 0) + Number(line.qty || 0));
        }
      }
      const stockItems = Array.from(groupedStock, ([product_id, qty]) => ({ product_id, qty }));
      for (const item of stockItems) {
        const product = products.find((candidate) => candidate.id === item.product_id);
        if (!product || item.qty <= 0) throw new Error("Quantité de produit invalide");
        if (item.qty > product.stock) throw new Error(`Stock insuffisant : ${product.name} (${product.stock} disponible(s))`);
      }
      let docCode = "";
      let queued = false;
      if (isProforma) {
        // Proforma : document d'offre, sans numérotation officielle ni impact stock.
        docCode = `PRO-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await emitDocument({ code: docCode, customerName, items, total, paid: 0, credit: total });
        return { code: docCode, queued: false };
      }
      const docType = labelToDocType(documentType as "Facture" | "Reçu");
      const operationId = crypto.randomUUID();
      const payload = { doc_type: docType, customer_name: customerName, total_usd: total, stock_items: stockItems };
      const res = await runOrQueue<{ code?: string; result?: { code?: string } }>(
          "document",
          `${documentType} — ${customerName}`,
          payload,
          async () => {
            const { data, error } = await supabase.rpc("sync_apply_operation", {
              _client_op_id: operationId, _kind: "document", _payload: payload,
            });
            if (error) throw error;
            return data as { result?: { code?: string } };
          },
          operationId,
      );
      queued = res.queued;
      docCode = res.data?.result?.code ?? res.data?.code ?? `LOC-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
       if (queued && stockItems.length > 0) {
          await cacheUpdate<Product[]>("query:documents-products", (current) => (current ?? products).map((product) => {
            const qty = stockItems.filter((item) => item.product_id === product.id).reduce((sum, item) => sum + item.qty, 0);
            return qty > 0 ? { ...product, stock: Math.max(0, product.stock - qty) } : product;
          }));
          await cacheUpdate<Array<Product & Record<string, unknown>>>("table:products", (current) => (current ?? []).map((product) => {
            const qty = stockItems.filter((item) => item.product_id === product.id).reduce((sum, item) => sum + item.qty, 0);
            return qty > 0 ? { ...product, stock: Math.max(0, Number(product.stock) - qty) } : product;
          }));
          for (const item of stockItems) {
            const product = products.find((candidate) => candidate.id === item.product_id);
            if (product) await markLocalChange("products", product.id, { stock: Math.max(0, product.stock - item.qty) });
          }

          const createdAt = new Date().toISOString();
          await cacheUpdate<Array<Record<string, unknown>>>("table:stock_movements", (current) => [
            ...stockItems.map((item) => {
              const product = products.find((candidate) => candidate.id === item.product_id);
              return {
                id: `${operationId}:${item.product_id}`,
                product_id: item.product_id,
                delta: -item.qty,
                reason: "sale",
                ref_type: "document",
                ref_id: operationId,
                note: `Sortie locale liée au document ${docCode}`,
                user_id: null,
                created_at: createdAt,
                products: product ? { id: product.id, name: product.name, sku: null, stock: Math.max(0, product.stock - item.qty) } : null,
                pending_sync: true,
              };
            }),
            ...(current ?? []),
          ]);
      }
      await emitDocument({ code: docCode, customerName, items, total, paid: total, credit: 0 });
      return { code: docCode, queued, stockApplied: stockItems.length > 0 };
    },
    onSuccess: (res) => {
      if (res.queued) toast.warning(`Document ${res.code} créé hors ligne — numéro définitif attribué à la synchronisation.`);
      else toast.success(res.stockApplied ? "Document généré et stock mis à jour" : "Document généré sans modifier le stock");
      qc.invalidateQueries({ queryKey: ["document-history"] });
      qc.invalidateQueries({ queryKey: ["documents-products"] });
      qc.invalidateQueries({ queryKey: ["stock-products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      // Les mêmes données doivent apparaître partout dans le tableau de bord.
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-all"] });
      qc.invalidateQueries({ queryKey: ["documents-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setLines([{ name: "", qty: 1, unit: 0 }]); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openPreview = () => {
    const items = lines.filter((l) => l.name.trim()).map((l) => ({ name: l.name, qty: Number(l.qty || 0), unit: Number(l.unit || 0), total: Number(l.qty || 0) * Number(l.unit || 0) }));
    if (items.length === 0) { toast.error("Ajoutez au moins une ligne"); return; }
    const customerName = manualMode
      ? (manualCustomer.name.trim() || "Client")
      : (customers.find((c) => c.id === customerId)?.name ?? "Client");
    const total = items.reduce((a, i) => a + i.total, 0);
    const doc = buildReceiptDoc({
      logoDataUrl,
      shopName: settings?.shop_name ?? "CONETEC",
      address: settings?.address ?? "", phone: settings?.phone ?? "",
      code: "APERÇU", customer: customerName,
      items, subtotal: total, discount: 0, total,
      paid: isProforma ? 0 : total, credit: isProforma ? total : 0,
      currency: settings?.primary_currency ?? "USD", rate: settings?.usd_to_cdf_rate ?? 2800,
      documentType, template, note: note || undefined,
      signatureDataUrl: marks.signature, stampDataUrl: marks.stamp,
    });
    setPreviewUrl(doc.output("datauristring"));
  };

  const selectedTemplate = useMemo(() => DOCUMENT_TEMPLATES.find((item) => item.id === template) ?? DOCUMENT_TEMPLATES[0], [template]);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <OfflineBanner scope="factures" />
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
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Label className="text-sm">Type :</Label>
                  <Select value={designerKind} onValueChange={(v) => setDesignerKind(v as DocumentKind)}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
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
            <CardHeader>
              <CardTitle>Signature & sceau</CardTitle>
              <p className="text-sm text-muted-foreground">Ajoutés en bas des factures et reçus générés. Conservés sur cet appareil (disponibles hors ligne).</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {([["signature", "Signature"], ["stamp", "Sceau"]] as const).map(([kind, label]) => (
                <div key={kind} className="space-y-2 rounded-md border p-3">
                  <Label>{label}</Label>
                  <div className="flex h-24 items-center justify-center rounded-md border bg-muted/30">
                    {marks[kind] ? <img src={marks[kind]} alt={label} className="max-h-20 max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Aucune image</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/png,image/jpeg" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try { marks.save(kind, await fileToDataUrl(file)); toast.success(`${label} enregistrée`); }
                      catch { toast.error("Image illisible"); }
                    }} />
                    <Button type="button" variant="outline" size="sm" disabled={!marks[kind]} onClick={() => { marks.save(kind, null); toast.success(`${label} supprimée`); }}>Retirer</Button>
                  </div>
                </div>
              ))}
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
                  <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentLabel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facture">Facture</SelectItem>
                      <SelectItem value="Facture Proforma">Facture Proforma</SelectItem>
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
                  <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[1.2fr_2fr_80px_120px_auto]">
                    <Select
                      value=""
                      onValueChange={(pid) => {
                        const p = products.find((x) => x.id === pid);
                        if (p) setLines(lines.map((l, ix) => ix === i ? { ...l, productId: p.id, name: p.name, unit: Number(p.sale_price) } : l));
                      }}
                    >
                      <SelectTrigger className="col-span-2 md:col-span-1"><SelectValue placeholder="Produit boutique…" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} — ${Number(p.sale_price).toFixed(2)} · Stock {p.stock}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="col-span-2 md:col-span-1" placeholder="Désignation" value={line.name} onChange={(e) => setLines(lines.map((l, ix) => ix === i ? { ...l, productId: undefined, name: e.target.value } : l))} />
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
              <Button className="w-full" variant="outline" onClick={openPreview}>Prévisualiser le document</Button>
              <Button className="w-full" onClick={() => (isProforma ? createDocument.mutate(false) : setConfirmStock(true))} disabled={createDocument.isPending}>Générer le PDF ({documentType})</Button>
              <p className="text-xs text-muted-foreground">Le document est numéroté automatiquement (séquentiel, sans doublon) et utilise le modèle actif.</p>
              {lastDoc && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                  <span>Dernier document : <strong>{lastDoc.code}</strong> — {lastDoc.customer}</span>
                  <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}><Mail className="mr-2 h-4 w-4" />Envoyer par email</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prints" className="mt-4">
          <PrintJournalCard />
        </TabsContent>
      </Tabs>
      <Dialog open={previewUrl !== null} onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Aperçu — {documentType}</DialogTitle></DialogHeader>
          {previewUrl && <iframe title="Aperçu du document" src={previewUrl} className="h-[65vh] w-full rounded-md border" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewUrl(null)}>Fermer</Button>
            <Button onClick={() => { setPreviewUrl(null); if (isProforma) createDocument.mutate(false); else setConfirmStock(true); }} disabled={createDocument.isPending}>Générer le PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmStock} onOpenChange={setConfirmStock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer les produits du stock ?</AlertDialogTitle>
            <AlertDialogDescription>
              Choisissez si les produits liés à cette facture doivent être retranchés du stock. Les lignes saisies manuellement ne modifient jamais le stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {stockSummary.length > 0 ? (
              <div className="divide-y">
                {stockSummary.map((item) => (
                  <div key={item.productId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-3 py-2 text-sm">
                    <div className="min-w-0"><div className="truncate font-medium">{item.name}</div><div className="text-xs text-muted-foreground">Stock actuel : {item.stock} · Après retrait : {item.stock - item.qty}</div></div>
                    <div className="font-semibold text-destructive">−{item.qty}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-3 text-sm text-muted-foreground">Aucune ligne liée à un produit du catalogue.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => createDocument.mutate(false)}>Non, PDF uniquement</AlertDialogCancel>
            <AlertDialogAction disabled={stockSummary.length === 0 || stockSummary.some((item) => item.qty <= 0 || item.qty > item.stock)} onClick={() => createDocument.mutate(true)}>Oui, retirer du stock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
