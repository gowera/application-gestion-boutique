import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import { usePrintLog, formatPrintDate } from "@/lib/print-log";

/**
 * Suivi local des documents imprimés : date, heure et utilisateur.
 * Fonctionne hors ligne (journal enregistré sur cet ordinateur).
 */
export function PrintJournalCard({ limit, compact = false }: { limit?: number; compact?: boolean }) {
  const entries = usePrintLog();
  const rows = limit ? entries.slice(0, limit) : entries;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="h-4 w-4" />Documents imprimés
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Factures et reçus générés depuis cet ordinateur, avec date, heure et utilisateur.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document imprimé pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date et heure</TableHead>
                <TableHead>Document</TableHead>
                {!compact && <TableHead>Client</TableHead>}
                <TableHead>Utilisateur</TableHead>
                {!compact && <TableHead className="text-right">Montant</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatPrintDate(entry.at)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{entry.code}</div>
                    <div className="text-xs text-muted-foreground">{entry.documentType} · {entry.origin}</div>
                  </TableCell>
                  {!compact && <TableCell className="text-sm">{entry.customer}</TableCell>}
                  <TableCell className="text-sm">{entry.user}</TableCell>
                  {!compact && <TableCell className="text-right text-sm">${Number(entry.totalUsd || 0).toFixed(2)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
