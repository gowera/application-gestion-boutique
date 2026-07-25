## Objectifs

Neuf ajustements couvrant devis, achats, RH, rapports, documents et POS.

## Détails

### 1. Devis publics — pièce jointe
- Créer un bucket Storage `quote-attachments` (public).
- `src/routes/devis.tsx` : ajouter champ fichier (optionnel, ≤10 Mo). Upload puis stocker l'URL dans `quote_requests.message` (ou nouvelle colonne `attachment_url` via migration).
- `admin/messages.tsx` : afficher lien pièce jointe si présent.

### 2. Fusion "Achats & Fournisseurs"
- Nouvelle page `admin/purchasing.tsx` avec deux onglets : **Achats** et **Fournisseurs** (reprise du contenu existant).
- Sidebar : remplacer les 2 entrées par une seule "Achats & fournisseurs". Anciennes routes conservées comme redirections.

### 3. Fusion "Employés & Salaires"
- Nouvelle page `admin/hr.tsx` avec onglets **Employés** et **Salaires**.
- Sidebar : une seule entrée "RH — Employés & salaires".

### 4. Ajout export PDF partout où il n'y a que Excel
- Pages ciblées : `reports.tsx`, `stock.tsx`, `sales.tsx`, `orders.tsx`, `expenses.tsx`, `salaries.tsx`, `purchases.tsx`, `interventions.tsx`, `customers.tsx`.
- Utilitaire `src/lib/pdf-table.ts` : `downloadTablePdf(title, columns, rows)` basé sur jsPDF + autoTable (déjà dispo via jspdf-autotable ou fallback simple).

### 5. Fusion "Rapports" + "Caisse" → **Rapport de caisse**
- Nouvelle page `admin/reports.tsx` refondue avec onglets **Vue d'ensemble**, **Sessions de caisse**, **Crédits à recouvrer**, **Crédits à payer**.
- Sidebar : supprimer "Caisse", garder "Rapport de caisse".
- Renommer "Crédit" → "Crédit à recouvrer".
- Ajouter KPI **Total estimé** = crédit à recouvrer + solde.
- Nouveau tableau **Crédits à payer** (dettes fournisseurs : `suppliers.balance_usd > 0` + salaires en attente + loyers impayés).

### 6. Documents — restructuration
- `admin/documents.tsx` déjà avec onglets ; renommer explicitement :
  - **Modèles de document** (éditeur canvas, sélection modèle actif).
  - **Créer un document** (formulaire manuel facture/reçu → PDF).
- Ajouter 3e onglet **Historique** (contenu de `documents/history.tsx`).
- Le modèle actif (`getStoredDocumentTemplate`) reste utilisé partout (POS, caisse, ventes) — déjà en place.

### 7. POS — génération document au choix
- `admin/pos.tsx` : après validation vente, sélecteur "Type de document" (Facture / Reçu / Aucun) présent dans la modale de paiement + case "à la demande du client".
- Génère le PDF avec `downloadReceipt({ documentType })` et `issueDocumentNumber`.

## Notes techniques
- Bucket Storage via `supabase--storage_create_bucket`.
- Migration mineure : `quote_requests.attachment_url text`.
- `jspdf-autotable` déjà présent ? Sinon ajout via bun.
- Aucune suppression de données ; pages fusionnées gardent leurs routes originales comme redirections vers les onglets.

## Livraison
Une seule passe d'implémentation, puis vérification build.
