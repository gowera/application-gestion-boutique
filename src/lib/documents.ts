import { supabase } from "@/integrations/supabase/client";

export type DocumentType = "facture" | "recu";

export interface IssueDocumentResult {
  id: string;
  code: string;
  number: number;
  doc_type: DocumentType;
  year: number;
}

/**
 * Reserve a unique, sequential document number for a Facture or Reçu.
 * The DB enforces uniqueness per (type, number) — never generates duplicates.
 */
export async function issueDocumentNumber(input: {
  docType: DocumentType;
  saleId?: string | null;
  customerName?: string | null;
  totalUsd?: number;
}): Promise<IssueDocumentResult> {
  const { data, error } = await supabase.rpc("issue_document_number", {
    _doc_type: input.docType,
    _sale_id: input.saleId ?? undefined,
    _customer_name: input.customerName ?? undefined,
    _total_usd: input.totalUsd ?? 0,
  });
  if (error) throw error;
  return data as unknown as IssueDocumentResult;
}

export function docTypeLabel(t: DocumentType): "Facture" | "Reçu" {
  return t === "facture" ? "Facture" : "Reçu";
}

export function labelToDocType(label: "Facture" | "Facture mensuelle" | "Facture Proforma" | "Reçu"): DocumentType {
  return label === "Reçu" ? "recu" : "facture";
}
