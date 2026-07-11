# Plan CONETEC v1.1 — améliorations complètes

Le périmètre demandé est très large. Je propose de le livrer en **5 lots successifs**, chacun testable indépendamment. Chaque lot inclut migration DB + UI + intégration.

---

## Lot 1 — Pilotage & Ventes directes (POS)

**Tableau de bord**
- Graphiques Recharts : CA jour/semaine/mois, top produits, ventes par canal, dépenses vs recettes.
- Carte **« À recouvrer »** : total dettes clients + top débiteurs (lien vers Crédits).
- Bouton **« Caisse »** ouvrant sous-page : ouvrir/fermer session, fond de caisse, écart, historique sessions (`cash_sessions` existe déjà).

**POS / Vente directe**
- Toggle **« Vente à crédit »** avec `due_date` (échéance) et note de prise de dette.
- Bouton **« + Nouveau client »** dans le formulaire (modal inline).
- Décrément stock déjà en place (`create_pos_sale`) — vérifier + afficher indicateur stock temps réel.

**DB** : ajouter `sales.due_date`, `cash_sessions` déjà en place.

---

## Lot 2 — Commercial (Clients, Crédits, Devis/Messages)

**Clients & crédits** (2 onglets)
- Onglet **Clients** : répertoire CRUD complet (édition, archivage, historique achats).
- Onglet **Crédits & dettes** : liste des dettes ouvertes, formulaire d'octroi manuel, encaissement partiel avec calcul auto du reste, historique paiements par client.

**Devis & messages**
- Réponse directe depuis l'admin (email via Resend/Lovable AI, ou WhatsApp deep-link `wa.me`).
- Envoi de messages sortants aux clients existants (WhatsApp + mailto).
- Historique des échanges par demande.

**DB** : `message_threads`, `message_replies`.

---

## Lot 3 — Stock, Catégories, Fournisseurs, Achats

**Produits**
- **Upload images** (Storage bucket `product-images`) + saisie par URL.
- **Slug auto-généré** depuis le nom.
- Ajout catégorie inline depuis le formulaire produit.
- Case **« Afficher le stock sur la boutique en ligne »** (`show_stock_public`).
- **Notifications rupture** : cloche dans le header + centre notifications.
- Bouton **« Ravitailler »** → crée un bon d'achat pré-rempli avec le fournisseur associé.

**Catégories**
- Colonne `product_count` calculée.
- Suppression → modal de choix de catégorie de migration si produits associés.

**Fournisseurs**
- Boutons contact direct (tel, mail, WhatsApp).
- Association produits ↔ fournisseurs (table `product_suppliers`).

**Achats**
- Formulaire complet : sélection fournisseur, lignes produits (existants ou nouveaux), coûts, dates livraison prévue/réelle, statut, PDF bon d'achat.

**DB** : `product_suppliers`, `products.show_stock_public`, `products.slug`, bucket Storage, table `notifications`.

---

## Lot 4 — Finances & RH

**Dépenses (agrégation auto)**
- Vue unifiée intégrant : dépenses manuelles + loyers (`rent_payments`) + salaires (`salary_payments`) + achats fournisseurs (`purchases`).
- Filtres par période/catégorie, total dépenses vs CA.

**Employés**
- Bouton **Licencier** avec motif + date → `is_terminated`, `termination_reason`, `terminated_at` (données conservées).
- Filtre actifs / licenciés.

**Salaires**
- Formulaire : sélecteur **mois (période début/fin auto)** au lieu de dates libres → « Salaire de juin 2026 ».
- **Mode de paiement** (cash, mobile money, virement).
- **Reçu PDF** avec **lien unique de confirmation** (`confirmation_token`).
- Notification employé (WhatsApp/email) avec le lien.
- Après confirmation, token invalidé, statut → `confirmed`.

**DB** : `employees.is_terminated/termination_reason/terminated_at`, `salary_payments.period_month/payment_method/confirmation_token/confirmed_at`, route publique `/salaire/confirmer/$token`.

---

## Lot 5 — Configuration, Corbeille, Historique

**Paramètres** (onglets)
- **Documents** : éditeur canvas (couleur, logo, signature, mentions légales) pour factures/reçus/bons.
- **Site en ligne** : nom boutique, adresse, contacts, upload images galerie services.
- **Paiements** : configuration agrégateurs mobile money (clés, activation).
- **Infos entreprise** : coordonnées + Google Maps (lat/lng), utilisées sur documents + site public.
- **Nettoyage BDD** : export complet CSV/JSON puis purge sélective (employés licenciés, corbeille vidée, logs anciens).

**Rôles utilisateurs**
- Invitation par WhatsApp/email/SMS (lien magique Supabase + deep-link `wa.me`).
- Table `invitations` avec token, rôle pré-assigné, expiration.

**Corbeille**
- Colonne `deleted_at` (soft-delete) sur produits, clients, employés, fournisseurs, catégories.
- Page **Corbeille** : restaurer / supprimer définitivement.
- Paramètre : délai auto-purge (jours), job scheduled.

**Historique**
- Page dédiée listant `activity_log` (déjà en place) avec filtres user/action/entité/date.

**DB** : `documents_settings`, `payment_gateways`, `invitations`, colonnes `deleted_at` + `terminated_*`, `settings.trash_retention_days` + `map_lat/lng` + `services_gallery`.

---

## Détails techniques

- **Storage** : bucket `product-images` (public) + `service-gallery` (public) + `signatures` (privé).
- **PDFs** : extension de `src/lib/pdf.ts` avec templates paramétrables.
- **Notifications** : table `notifications` + composant cloche header + realtime.
- **Confirmations salaire** : route publique `/salaire/confirmer/$token`.
- **Nettoyage BDD** : server function admin exportant en ZIP puis exécutant les DELETE.

---

## Ordre d'exécution proposé

Je livre **Lot 1 en premier**, puis j'attends votre retour avant d'enchaîner. Chaque lot ≈ 1 tour de conversation.

**Souhaitez-vous approuver ce plan et démarrer par le Lot 1 ?** Ou préférez-vous réorganiser les priorités (par exemple commencer par Corbeille + Historique, ou par Configuration) ?
