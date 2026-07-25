import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdminData } from "@/lib/local/adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DOCUMENT_TEMPLATES, getStoredDocumentTemplate, setStoredDocumentTemplate } from "@/lib/document-template";
import { Download, FileText } from "lucide-react";
import { downloadReceipt } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/admin/documents")({ component: Page });

type Customer = { id: string; name: string; phone?: string | null };
type DocumentRecord = { id: string; type: string; code: string; created_at: string; customer_name?: string | null };

function Page() {
  const qc = useQueryClient();
  const [template, setTemplate] = useState(getStoredDocumentTemplate());
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [documentType, setDocumentType] = useState<"Facture" | "Reçu">("Facture");
  const [customerId, setCustomerId] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("0");

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["documents-customers"], queryFn: async () => (await listAdminData<Customer>("customers")).filter((customer) => !customer.is_archived).sort((a, b) => a.name.localeCompare(b.name)) });
  const { data: documents = [] } = useQuery<DocumentRecord[]>({ queryKey: ["documents-records"], queryFn: async () => (await listAdminData<any>("sales")).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map((sale) => ({ id: sale.id, type: sale.type ?? "Facture", code: sale.code, created_at: sale.created_at, customer_name: sale.customer_name ?? sale.customer?.name ?? "Client" })) });
  const docs = records.length ? records : documents;

  const createDocument = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Un client est requis");
      const docCode = code || `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return { code: docCode };
    },
    onSuccess: async ({ code: docCode }) => {
      toast.success("Document créé");
      qc.invalidateQueries({ queryKey: ["documents-records"] });
      setCode(docCode);
      const customer = customers.find((item) => item.id === customerId);
      setRecords((prev) => [{ id: crypto.randomUUID(), type: documentType, code: docCode, created_at: new Date().toISOString(), customer_name: customer?.name ?? "Client" }, ...prev]);
      downloadReceipt({
        shopName: "CONETEC",
        address: "",
        phone: "",
        code: docCode,
        customer: customer?.name ?? "Client",
        items: [],
        subtotal: Number(amount || 0),
        discount: 0,
        total: Number(amount || 0),
        paid: Number(amount || 0),
        credit: 0,
        currency: "USD",
        rate: 2800,
        documentType: documentType,
        template,
      });
      setDocumentType("Facture");
      setCustomerId("");
      setAmount("0");
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedTemplate = useMemo(() => DOCUMENT_TEMPLATES.find((item) => item.id === template) ?? DOCUMENT_TEMPLATES[0], [template]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">Gérez les modèles de documents et créez une facture ou un reçu manuellement.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Modèles de document</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Style de modèle</Label>
              <Select value={template} onValueChange={(value) => { setTemplate(value as typeof template); setStoredDocumentTemplate(value as typeof template); }}>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3 text-sm">Facture / reçu : utilisation du modèle choisi automatiquement.</div>
              <div className="rounded-md border p-3 text-sm">Les documents créés depuis POS ou depuis cette page utilisent désormais le même format.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Créer un document</CardTitle></CardHeader>
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
              <Label>Note</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails du document" />
            </div>
            <Button className="w-full" onClick={() => createDocument.mutate()} disabled={createDocument.isPending}>Créer le document</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Documents récemment créés</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-mono text-xs">{doc.code}</TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{doc.customer_name ?? "—"}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => toast.info("Document déjà enregistré dans l’historique")}>Voir</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
