# 🏪 L'Ardoise Digitale

> **Application de gestion de stock et de crédit client (« l'ardoise ») pour les boutiquiers de quartier au Sénégal.**  
> Conçue sur mesure d'après le cahier des charges PROCESSINGENIERIE (Dakar, Sénégal).

---

## 🚀 Démarrer en local

```bash
# Lancement rapide sur Windows
start-ardoise.bat
```

Ou en ligne de commande :
```bash
npm install
npm run dev -- -p 3001
```

Ouvrez [http://localhost:3001](http://localhost:3001).

*(Port 3001 utilisé pour coexister avec Koom-Koom Voice sur le port 3000).*

---

## 🎯 Fonctionnalités Clés (MVP Phase 1 Complet)

### 1. ⚡ Caisse Express & Comptoir Tactile (`/`)
- Grille de produits tactile adaptée aux téléphones et comptoirs d'épicerie.
- **Ajout au panier en 1 clic** avec badge de quantité et alerte de stock.
- **Panier flottant** avec récapitulatif total FCFA et modal d'encaissement.
- Mode de règlement immédiat : **💵 Espèces (Kees)** ou **📒 Sur l'Ardoise (Bor)**.
- Si vente à crédit : sélection du client, vérification instantanée du **plafond d'ardoise** et alerte en cas de dépassement.
- Création rapide de nouveau client intégrée à la caisse.
- **Génération de reçu / quittance de vente** avec bouton direct de partage WhatsApp.

### 2. 📒 Carnet d'Ardoise & Recouvrement (`/credits` et `/credits/detail`)
- Liste des ménages et habitués avec solde dû en temps réel.
- **Jauges de plafond de crédit** (indicateur visuel vert/orange/rouge).
- **Fiche client complète** avec historique détaillé de chaque article pris à crédit (zéro contestation).
- **Score de solvabilité** (⭐ Client modèle / ✓ Bon payeur / ⚡ Surveillance).
- **Relance WhatsApp automatique** avec formules de politesse adaptées au Sénégal et lien direct de règlement Wave.
- Enregistrement des remboursements (Espèces, Wave, Orange Money) avec option « Tout régler ».

### 3. 📦 Gestion des Stocks & Alertes Rupture (`/stock`)
- 16 produits typiques d'une boutique dakaroise (Riz parfumé, Huile, Sucre, Pain, Café Touba, Lait en poudre, Tomate pâte, Cubes bouillon, Savon, Oignons...).
- Double affichage **Français & Wolof** (ex: *Mburu bu neex*, *Ceb bu neex*, *Kaafe Tuubaa*).
- Alertes de rupture pour produits prioritaires.
- Modal d'ajustement rapide (+1, +5, réassort grossiste Sandaga, perte/avarie) et calcul des marges bénéficiaires.

### 4. 📊 Rapports Financiers & Trésorerie (`/rapports`)
- Filtre par période : Aujourd'hui, 7 derniers jours, Ce mois, Global.
- Chiffre d'Affaires total, marge brute estimée, et taux de recouvrement des crédits.
- **Vue de la trésorerie réelle** (Cash physique disponible en caisse vs Ardoise en cours).
- Classement des produits les plus vendus et des plus gros encours clients.
- Valorisation totale du stock marchant en boutique.

### 5. ⚙️ Ma Boutique — Paramètres & Sauvegarde (`/reglages`)
- Profil de la boutique (Nom, Quartier/Adresse, Gérant, Téléphone Wave).
- **Bascule bilingue** : Français 🇫🇷 / Wolof 🇸🇳.
- **Export & Import de sauvegarde JSON** (sécurité des données sans dépendre d'Internet).
- Données de démonstration préchargées et réinitialisables.

---

## 🛠️ Architecture & Technologies

- **Framework** : Next.js 16 (App Router) + React 19 + TypeScript
- **Icons** : Lucide React
- **Architecture de stockage** : Offline-first (`localStorage`) avec migration de schéma v1 → v2
- **Responsive** : Conteneur centré type PWA mobile pour smartphone, tablette et PC comptoir

---

## 📦 Dépôt GitHub

- URL officielle : [https://github.com/mamadouelimanewane/ardoise-digitale](https://github.com/mamadouelimanewane/ardoise-digitale)
