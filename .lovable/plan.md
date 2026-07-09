
# CONETEC — Plan v1 (ERP Admin d'abord)

Livraison ciblée : un ERP fonctionnel utilisable en boutique dès la v1, plus une landing publique minimale. Les autres modules (boutique en ligne complète, interventions, RH/salaires, loyer, rapports avancés, achats fournisseurs) suivront dans des itérations v2, v3, etc.

## Stack

- React + TypeScript + Vite + Tailwind (via TanStack Start — équivalent SPA React côté utilisateur).
- Supabase (Lovable Cloud) : PostgreSQL, Auth email/password, Storage (images produits, reçus), RLS.
- Rôles via table `user_roles` séparée + fonction `has_role` (sécurité contre l'escalade).
- Génération PDF (reçus, factures) via `jspdf`. Export Excel via `xlsx`.

## Design

Corporate tech, bleu profond (#0B1E3F base, accent énergie vert-lime #A8E635), typographie Inter/Space Grotesk, cartes nettes, dashboards denses lisibles. Design tokens définis dans `src/styles.css`, jamais de couleurs hardcodées.

## Périmètre v1

### 1. Auth & rôles
- Login / logout (email + mot de passe, pas de signup public — création par admin).
- Rôles : `admin`, `manager`, `caissier`, `vendeur`, `comptable`.
- Table `user_roles`, fonction `has_role`, gate `_authenticated` déjà géré par l'intégration.
- Redirection selon rôle après login.

### 2. Paramètres (Settings)
- Nom boutique, logo, coordonnées.
- Devise principale (USD ou CDF), taux de change USD↔CDF éditable.
- Numérotation reçus/factures.
- Seuil alerte stock global.

### 3. Produits & Stock
- CRUD produits : nom, SKU, catégorie, marque, description, prix achat, prix vente (USD), stock, seuil alerte, images multiples (Storage), statut actif/rupture.
- Catégories & sous-catégories.
- Recherche, filtres, tri.
- Mouvements de stock (table `stock_movements`) : entrée manuelle, sortie, correction avec motif. Chaque vente/retour génère automatiquement un mouvement.
- Alerte visuelle produits en rupture / sous seuil.
- Import CSV (v1.1 si temps).

### 4. Vente directe / Caisse (POS)
- Interface POS plein écran : recherche produit rapide, ajout au panier, quantités, remise ligne/global.
- Sélection client (ou vente anonyme).
- Moyens de paiement : espèces, Mobile Money, carte, crédit client, mixte.
- Devise d'encaissement au choix (USD ou CDF) avec conversion auto via taux configuré.
- Validation transactionnelle côté DB : décrément stock atomique, refus si insuffisant, création vente + lignes + mouvement stock + entrée caisse.
- Reçu PDF téléchargeable/imprimable.
- Ouverture / fermeture de caisse par session avec rapport de journée.

### 5. Ventes (liste)
- Liste unifiée (en ligne v2 + directes v1), filtres par date/client/vendeur/statut, détail, réimpression reçu, annulation avec autorisation (réinjecte le stock).

### 6. Clients & Crédits
- CRUD client : nom, téléphone, email, adresse, notes.
- Historique achats, solde crédit / dette, limite de crédit.
- Enregistrement remboursement.
- Export relevé PDF.

### 7. Dépenses
- CRUD dépense : catégorie (transport, carburant, internet, électricité, fournitures, autre), montant, devise, moyen paiement, employé responsable, preuve (photo Storage), date.
- Filtres par période et catégorie, export.

### 8. Tableau de bord
- CA jour / semaine / mois (USD converti).
- Ventes directes du jour, commandes en attente (placeholder v1).
- Produits en rupture / sous seuil.
- Crédits clients en cours.
- Dépenses récentes.
- Solde caisse ouverte.
- Graphiques : ventes 30 jours, top produits, dépenses par catégorie (Recharts).

### 9. Journal d'activité
- Log automatique des actions sensibles (ventes annulées, corrections de stock, remboursements crédit, changement de rôles).

### 10. Landing publique minimale
- Une page unique `/` : hero CONETEC, liste des 11 services, section "Demander un devis" (formulaire → table `quote_requests`, visible dans un module Messages basique en admin), contact (tel, WhatsApp, email), footer.
- SEO propre (title, description, OG).
- Le catalogue e-commerce complet vient en v2.

## Schéma DB (résumé)

```
profiles(id, full_name, phone, avatar_url)
user_roles(user_id, role)                       -- enum: admin, manager, caissier, vendeur, comptable
settings(id=1, shop_name, currency, usd_to_cdf_rate, ...)
categories(id, name, parent_id)
products(id, sku, name, category_id, brand, description, cost_price, sale_price, stock, low_stock_threshold, status, images[])
stock_movements(id, product_id, delta, reason, ref_type, ref_id, user_id, created_at)
customers(id, name, phone, email, address, credit_limit, notes)
customer_ledger(id, customer_id, delta, reason, ref_id, created_at)   -- +debt / -payment
cash_sessions(id, user_id, opened_at, closed_at, opening_amount, closing_amount, notes)
sales(id, code, customer_id, user_id, session_id, subtotal, discount, total_usd, paid_usd, status, channel, created_at)
sale_items(id, sale_id, product_id, qty, unit_price, discount, line_total)
payments(id, sale_id, method, amount, currency, amount_usd, reference)
expense_categories(id, name)
expenses(id, category_id, amount, currency, amount_usd, method, user_id, note, proof_url, spent_at)
quote_requests(id, name, phone, email, service, message, status, created_at)
activity_log(id, user_id, action, entity, entity_id, metadata, created_at)
```

RLS activée partout. Toutes les tables publiques ont des `GRANT` explicites. Le POS passe par une fonction SQL `create_sale(...)` `SECURITY DEFINER` pour garantir : vérification stock + décrément + insertions ventes/lignes/paiements/mouvements dans une transaction.

## Livrables v1

- App déployable, auth fonctionnelle, POS opérationnel, stock cohérent, dashboard vivant, landing publique + formulaire devis.
- Reçus PDF, export Excel des ventes/dépenses.
- Documentation courte dans le README.

## Hors v1 (itérations suivantes)

v2 — Boutique en ligne complète (catalogue public, panier, checkout, commandes, suivi client).
v3 — Interventions / devis / SAV / techniciens.
v4 — Achats fournisseurs, bons de commande, réception.
v5 — Employés & salaires, loyer, rapports avancés multi-format.
v6 — Notifications WhatsApp/email, PWA, multi-boutique.

---

Confirmez pour que je démarre par : activation Lovable Cloud → schéma DB + RLS → auth + rôles → design system → modules dans l'ordre ci-dessus.
