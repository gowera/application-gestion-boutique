# Documents avec impact stock et application Windows réellement hors ligne

## Objectif

Ajouter au générateur de facture le choix explicite de retirer ou non les produits du stock, puis rendre l’administration installée exploitable après une première connexion en ligne, avec données locales persistantes et synchronisation bidirectionnelle.

## 1. Génération de document et stock

- Conserver l’identifiant du produit dans chaque ligne issue du catalogue, en distinguant les lignes libres qui ne correspondent à aucun produit stocké.
- Au clic sur « Générer le PDF », ouvrir une confirmation avec trois actions claires :
  - « Oui, retirer du stock » ;
  - « Non, PDF uniquement » ;
  - « Annuler ».
- Si l’utilisateur choisit « Oui », contrôler les quantités disponibles puis enregistrer chaque sortie avec le motif de vente et une référence au document.
- En ligne, exécuter la numérotation et les mouvements de stock de façon atomique côté serveur afin d’éviter un PDF enregistré avec un stock partiellement modifié.
- Hors ligne, générer immédiatement le PDF avec un numéro local, diminuer le stock dans la base locale et mettre une opération idempotente en attente. La synchronisation ne doit jamais retirer deux fois le même stock.
- Après réussite, rafraîchir les produits, la traçabilité du stock et l’historique des documents.

## 2. Première connexion et copie locale

- La première utilisation sur un appareil reste obligatoirement en ligne.
- Après authentification, télécharger les données autorisées par le rôle de l’utilisateur : paramètres, permissions, produits, catégories, clients, ventes, commandes, documents, stock et mouvements, dépenses, caisse, fournisseurs, achats et autres modules administratifs accessibles.
- Enregistrer un instantané versionné dans IndexedDB, avec date de dernière synchronisation et progression visible (« téléchargement des données »).
- Faire lire les écrans administratifs depuis cette base locale ; lorsqu’Internet est disponible, rafraîchir le cache en arrière-plan au lieu de bloquer l’interface.
- Conserver localement les données synchronisées et les écritures hors ligne après leur envoi au serveur, avec leur état « synchronisé » et leur date, plutôt que de les supprimer sans historique local.

## 3. Connexion hors ligne sécurisée par PIN

- Ne jamais télécharger ni stocker le mot de passe du compte, ni une copie de son hash : le mot de passe reste validé uniquement par le service d’authentification en ligne.
- À la première connexion réussie dans l’application Windows, demander la création d’un PIN local.
- Dériver une clé du PIN, protéger les données sensibles locales et conserver le secret appareil via le stockage sécurisé de Windows/Electron.
- Aux ouvertures suivantes sans Internet, proposer « Déverrouiller hors ligne » avec le PIN et les dernières permissions validées pour cet appareil.
- Limiter les essais, verrouiller temporairement après plusieurs erreurs et exiger périodiquement une reconnexion en ligne pour actualiser les droits.
- Toute écriture synchronisée reste revalidée côté serveur selon le rôle actuel ; le mode hors ligne ne contourne jamais les permissions.

## 4. Synchronisation complète

- Étendre l’outbox à toutes les écritures nécessaires dans l’admin, avec identifiant idempotent, ordre, nombre d’essais, erreur détaillée et état local.
- Au retour de la connexion ou à l’ouverture en ligne : envoyer les écritures en attente, résoudre les réponses, puis télécharger les changements du serveur depuis le dernier curseur de synchronisation.
- Appliquer les changements au cache local sans effacer les opérations locales encore en attente.
- Distinguer les erreurs réseau temporaires des refus métier définitifs et afficher les opérations à corriger.
- Afficher en permanence : mode en ligne/hors ligne, données locales prêtes ou non, progression d’amorçage, nombre d’écritures en attente, dernière synchronisation et erreurs.

## 5. Application Windows et validation

- Ajouter un pont Electron minimal et isolé pour le stockage sécurisé Windows ; garder `contextIsolation` actif et `nodeIntegration` désactivé.
- Vérifier que le bundle local contient tous les styles, scripts, polices, images et routes nécessaires sans appel obligatoire au site public.
- Reconstruire l’installeur natif Windows avec l’icône CONETEC, les raccourcis Bureau/Menu Démarrer et la base locale persistante dans le profil utilisateur.
- Tester le parcours complet : première connexion en ligne, téléchargement initial, fermeture, coupure réseau, déverrouillage PIN, consultation des modules, création d’un client/facture avec produits et impact stock, redémarrage hors ligne, reconnexion et synchronisation sans doublon.

## Détails techniques

- IndexedDB devient le dépôt local de lecture et d’écriture, pas seulement un cache de secours ; les requêtes React Query passent par un adaptateur local-first commun.
- Les mutations de document avec stock utilisent une opération serveur atomique dédiée et la table d’idempotence existante.
- Les données locales sont séparées par utilisateur et appareil pour éviter qu’un autre compte lise le cache précédent.
- Le mot de passe n’est jamais conservé. Le PIN déverrouille uniquement la copie locale de cet appareil et ne permet pas de se connecter au serveur.
