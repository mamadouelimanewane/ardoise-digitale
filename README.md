# L'Ardoise Digitale

Gestion de stock et de crédit client (« l'ardoise ») pour les boutiquiers de quartier au Sénégal.
Voir le cahier des charges d'origine : `Cahier_des_Charges.docx` (PROCESSINGENIERIE, doc 3).

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Positionnement (Phase 1 du cahier des charges)

Contrairement à Tontine Digitale (multi-appareils, backend Supabase), l'Ardoise Digitale cible
d'abord un usage **mono-boutique, hors-ligne** : un seul boutiquier, un seul appareil, aucune
connexion réseau requise. Toutes les données (produits, clients, ventes, crédits) sont stockées
directement sur l'appareil via `localStorage` (`src/app/context/ArdoiseContext.tsx`) — c'est
l'équivalent web du SQLite embarqué prévu dans le cahier des charges pour la version Capacitor.
Les données survivent à la fermeture de l'app mais restent locales à cet appareil.

La Phase 2 (synchronisation multi-appareils, recherche de partenariat distribution) et la Phase 4
(score de fiabilité revendable aux IMF) ne sont pas implémentées ici — voir le cahier des charges
pour la feuille de route complète.

## Fonctionnalités couvertes (MVP Phase 1)

- **Stock** : catalogue produit, alerte de rupture sur les produits prioritaires, entrées/sorties.
- **Crédit client** : fiche client avec solde dû, historique achats à crédit + remboursements.
- **Ventes** : enregistrement rapide cash ou à crédit, décrément automatique du stock.
- **Rapports** : ventes du jour / 7 derniers jours, marge estimée, produit le plus vendu,
  trésorerie réelle (cash encaissé vs ardoise en cours).

## Structure

- `src/app/data.ts` — types (Product, Client, Transaction) + données de démonstration.
- `src/app/context/ArdoiseContext.tsx` — état de l'app, persistance `localStorage`.
- `src/app/components/SaleModal.tsx` — flux de vente partagé (accueil).
- `src/app/{stock,credits,rapports}` — les trois sections principales.

## Prochaines étapes suggérées

1. Remplacer `localStorage` par le plugin Capacitor SQLite pour un vrai stockage natif offline.
2. Ajouter la synchronisation Supabase à la reconnexion (Phase 2), sur le même modèle que
   `../Tontine` (voir `src/lib/tontineApi.ts` de ce projet pour le pattern mock ↔ backend).
3. Rechercher un partenariat distributeur (brasserie, distributeur télécom) pour l'acquisition,
   comme recommandé dans le cahier des charges.
