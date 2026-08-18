# Application Windows hors ligne pour /admin

Objectif : permettre d'utiliser le tableau de bord comme un logiciel Windows installable, utilisable sans internet, avec synchronisation automatique dès que la connexion revient — plus un bouton de téléchargement sur le tableau de bord.

## 1. Mode hors ligne dans l'admin

- Cache local des données de travail (produits, clients, ventes, dépenses) dans une base locale du navigateur (IndexedDB), rafraîchi à chaque chargement en ligne.
- Les écrans de l'admin lisent d'abord le cache local quand il n'y a pas de réseau : le tableau de bord, le POS, les produits et les clients restent consultables.
- Toute écriture (vente, client, dépense, mouvement de stock) faite hors ligne est enregistrée dans une file d'attente locale avec un identifiant unique et un horodatage.

## 2. Synchronisation

- Un service de synchronisation se déclenche au retour du réseau, au démarrage, et toutes les 60 secondes.
- Il rejoue la file d'attente dans l'ordre, marque chaque opération comme envoyée, et conserve les échecs pour un nouvel essai.
- Protection anti-doublon : chaque opération porte une clé d'idempotence, la base refuse un second envoi de la même opération.
- Indicateur permanent dans l'en-tête de l'admin : « En ligne / Hors ligne » + nombre d'opérations en attente + bouton « Synchroniser maintenant ».

## 3. Application Windows

- Enveloppe Electron autour de l'application (fenêtre unique ouvrant directement l'admin, icône et nom CONETEC).
- Fonctionne sans internet grâce au cache local ci-dessus ; se synchronise dès que la machine est connectée.
- Génération d'un paquet Windows (.zip contenant CONETEC.exe et ses fichiers) depuis l'atelier de build.
- Le paquet est stocké dans le stockage du backend (bucket public `app-releases`), pas dans le code du site.

## 4. Bouton de téléchargement

- Nouveau bloc sur le tableau de bord : « Application Windows » avec version, taille et bouton « Télécharger pour Windows ».
- Le lien pointe vers le fichier publié dans le bucket ; si aucune version n'est publiée, le bouton indique « Bientôt disponible ».
- Les paramètres admin reçoivent un champ pour renseigner l'URL et la version de la release courante.

## Détails techniques

- Stockage local : IndexedDB via `idb-keyval`, tables `cache:<entité>` et `outbox`.
- File d'attente : `{ id, table, op, payload, createdAt, tries, error }`, rejouée via le client Supabase existant.
- Idempotence : colonne `client_op_id uuid unique` ajoutée aux tables recevant des écritures hors ligne (ventes, éléments de vente, dépenses, clients).
- Electron : `electron/main.cjs` (CommonJS), `base: './'` dans Vite, packaging via `@electron/packager --platform=win32 --arch=x64`.
- L'exécutable Electron charge le site publié quand il est joignable et bascule sur le bundle local sinon.

## Limites

- La première utilisation du logiciel doit se faire en ligne (connexion et premier chargement des données).
- Les opérations nécessitant le serveur (paiements Mobile Money, envoi d'emails) restent indisponibles hors ligne et sont mises en attente.
