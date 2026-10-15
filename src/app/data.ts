export interface Product {
    id: string;
    name: string;
    wolofName?: string;
    emoji: string;
    category: 'base' | 'dejeuner' | 'condiment' | 'hygiene' | 'divers';
    unit: string; // ex: sac, kg, sachet, boîte, morceau, unité
    price: number; // prix de vente unitaire (FCFA)
    cost: number; // prix d'achat unitaire (FCFA), pour la marge
    stock: number;
    lowStockThreshold: number;
    priority: boolean; // produit surveillé en priorité pour l'alerte de rupture
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    address?: string;
    avatar: string;
    joinDate: string;
    creditLimit: number; // plafond d'ardoise en FCFA (ex: 20000)
    rating?: 'excellent' | 'bon' | 'vigilance';
    notes?: string;
}

export type TransactionType = 'sale_cash' | 'sale_credit' | 'repayment' | 'stock_in' | 'stock_loss';
export type PaymentMethod = 'cash' | 'wave' | 'om' | 'credit';

export interface CartItem {
    productId: string;
    productName: string;
    emoji: string;
    unitPrice: number;
    cost: number;
    quantity: number;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    date: string; // ISO datetime
    amount: number; // montant total FCFA
    paymentMethod?: PaymentMethod;
    items?: CartItem[];
    // Propriétés de rétrocompatibilité pour ventes simples ou historiques
    productId?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    clientId?: string;
    clientName?: string;
    note?: string;
    receiptNumber?: string;
}

export interface ShopProfile {
    name: string;
    ownerName: string;
    neighborhood: string;
    phone: string;
    wavePhone: string;
    currency: string;
    language: 'fr' | 'wo';
}

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
};

export const todayISO = () => new Date().toISOString();
export const dateOnly = (iso: string) => iso.split('T')[0];
export const isToday = (iso: string) => dateOnly(iso) === dateOnly(todayISO());

export const isThisWeek = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays < 7;
};

export const isThisMonth = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// ---------------------------------------------------------------------------
// Profil de la boutique par défaut
// ---------------------------------------------------------------------------
export const DEFAULT_SHOP_PROFILE: ShopProfile = {
    name: 'Boutique Al-Amine',
    ownerName: 'Cheikh Tidiane Wade',
    neighborhood: 'Médina Rue 11 x Blaise Diagne, Dakar',
    phone: '77 450 28 19',
    wavePhone: '77 450 28 19',
    currency: 'FCFA',
    language: 'fr',
};

// ---------------------------------------------------------------------------
// Dictionnaire Wolof pour immersion locale
// ---------------------------------------------------------------------------
export const DICTIONARY = {
    fr: {
        appName: "L'Ardoise Digitale",
        subtitle: "Gestion de stock & carnets de crédit",
        home: "Caisse",
        stock: "Stocks",
        credits: "L'Ardoise",
        reports: "Rapports",
        settings: "Boutique",
        todaySales: "Ventes du jour",
        cashInHand: "Cash en caisse",
        creditGiven: "Crédit accordé",
        totalOutstanding: "Total ardoise en cours",
        quickSale: "Vente Express",
        recordSale: "Enregistrer une vente",
        emptyCart: "Le panier est vide",
        addToCart: "Ajouter au panier",
        cash: "Espèces (Cash)",
        credit: "Sur l'Ardoise (Crédit)",
        customer: "Client",
        repayment: "Remboursement",
        stockAlert: "Alerte de rupture",
        allCategories: "Tous les rayons",
        catBase: "Denrées de base",
        catDejeuner: "Petit Déjeuner",
        catCondiment: "Condiments & Épices",
        catHygiene: "Hygiène & Maison",
        catDivers: "Divers",
        receipt: "Reçu de vente",
        shareWhatsapp: "Partager sur WhatsApp",
        remindCustomer: "Envoyer relance",
        creditLimit: "Plafond d'ardoise",
        solvency: "Solvabilité",
        statusGood: "Bon payeur",
        statusVigilance: "Surveillance",
        statusExcellent: "Très bon payeur",
    },
    wo: {
        appName: "Kaye Bor bi",
        subtitle: "Saytu dencukaay ak bor yi",
        home: "Njaay mi",
        stock: "Dencukaay",
        credits: "Kaye Bor",
        reports: "Seetlu",
        settings: "Boutik bi",
        todaySales: "Njaayum tey",
        cashInHand: "Xalis bu leer",
        creditGiven: "Bor bu ñu joxe tey",
        totalOutstanding: "Li dess ci kaye bi",
        quickSale: "Njaay bu gaaw",
        recordSale: "Duggal njaay",
        emptyCart: "Dara nekkul ci panyé bi",
        addToCart: "Yokk ci panyé bi",
        cash: "Kees (Xalis bu leer)",
        credit: "Kaye bi (Bor)",
        customer: "Kiliyán",
        repayment: "Fey / Delloo",
        stockAlert: "Jeex na duma yàgg",
        allCategories: "Lépp",
        catBase: "Ceb, Suukër, Diwlin",
        catDejeuner: "Ndekki (Kaafe, Meew)",
        catCondiment: "Safal (Kaani, Maggi)",
        catHygiene: "Set (Saabu, Buusi)",
        catDivers: "Yeneen",
        receipt: "Reçu njaay mi",
        shareWhatsapp: "Yónnee ci WhatsApp",
        remindCustomer: "Fattali bor bi",
        creditLimit: "Plafond bor bi",
        solvency: "Ni muy feye",
        statusGood: "Dafay fey bu baax",
        statusVigilance: "Moytu ko tuuti",
        statusExcellent: "Kiliyán bu sell",
    }
};

// ---------------------------------------------------------------------------
// Catalogue réaliste d'une boutique de quartier dakaroise
// ---------------------------------------------------------------------------
export const SEED_PRODUCTS: Product[] = [
    {
        id: 'p1',
        name: 'Pain Baguette / Tapalapa',
        wolofName: 'Mburu bu neex',
        emoji: '🥖',
        category: 'dejeuner',
        unit: 'miche',
        price: 200,
        cost: 175,
        stock: 25,
        lowStockThreshold: 10,
        priority: true,
    },
    {
        id: 'p2',
        name: 'Sachet Lait en poudre (25g)',
        wolofName: 'Meewu saase',
        emoji: '🥛',
        category: 'dejeuner',
        unit: 'sachet',
        price: 150,
        cost: 120,
        stock: 35,
        lowStockThreshold: 15,
        priority: true,
    },
    {
        id: 'p3',
        name: 'Café Touba (sachet)',
        wolofName: 'Kaafe Tuubaa',
        emoji: '☕',
        category: 'dejeuner',
        unit: 'sachet',
        price: 100,
        cost: 75,
        stock: 40,
        lowStockThreshold: 15,
        priority: true,
    },
    {
        id: 'p4',
        name: 'Sucre en morceaux (500g)',
        wolofName: 'Suukër morso',
        emoji: '🧂',
        category: 'base',
        unit: 'paquet',
        price: 450,
        cost: 375,
        stock: 18,
        lowStockThreshold: 8,
        priority: true,
    },
    {
        id: 'p5',
        name: 'Sucre en poudre (1kg)',
        wolofName: 'Suukër pudër',
        emoji: '🍚',
        category: 'base',
        unit: 'kg',
        price: 700,
        cost: 580,
        stock: 14,
        lowStockThreshold: 10,
        priority: true,
    },
    {
        id: 'p6',
        name: 'Huile végétale (1 Litre)',
        wolofName: 'Diwlin 1L',
        emoji: '🛢️',
        category: 'base',
        unit: 'bouteille',
        price: 1400,
        cost: 1200,
        stock: 9,
        lowStockThreshold: 5,
        priority: true,
    },
    {
        id: 'p7',
        name: 'Huile demi-litre (50cl)',
        wolofName: 'Diwlin xawaal',
        emoji: '🧴',
        category: 'base',
        unit: 'flacon',
        price: 750,
        cost: 650,
        stock: 4,
        lowStockThreshold: 6,
        priority: true,
    },
    {
        id: 'p8',
        name: 'Riz brisé parfumé (sac 5kg)',
        wolofName: 'Ceb bu neex 5kg',
        emoji: '🌾',
        category: 'base',
        unit: 'sac',
        price: 3500,
        cost: 3050,
        stock: 6,
        lowStockThreshold: 4,
        priority: true,
    },
    {
        id: 'p9',
        name: 'Riz brisé au kilo',
        wolofName: 'Ceb bu ñu peese',
        emoji: '🍚',
        category: 'base',
        unit: 'kg',
        price: 600,
        cost: 510,
        stock: 22,
        lowStockThreshold: 10,
        priority: false,
    },
    {
        id: 'p10',
        name: 'Boîte Tomate concentrée (70g)',
        wolofName: 'Tomaat bu ñuul',
        emoji: '🥫',
        category: 'condiment',
        unit: 'boîte',
        price: 250,
        cost: 190,
        stock: 28,
        lowStockThreshold: 12,
        priority: true,
    },
    {
        id: 'p11',
        name: 'Cube Bouillon (Maggi/Jumbo)',
        wolofName: 'Kupp Maggi',
        emoji: '🧊',
        category: 'condiment',
        unit: 'unité',
        price: 50,
        cost: 35,
        stock: 80,
        lowStockThreshold: 30,
        priority: true,
    },
    {
        id: 'p12',
        name: 'Oignon du Sénégal (1kg)',
        wolofName: 'Sooble 1kg',
        emoji: '🧅',
        category: 'condiment',
        unit: 'kg',
        price: 500,
        cost: 390,
        stock: 15,
        lowStockThreshold: 8,
        priority: false,
    },
    {
        id: 'p13',
        name: 'Œuf frais de ferme',
        wolofName: 'Nen bu bees',
        emoji: '🥚',
        category: 'dejeuner',
        unit: 'unité',
        price: 150,
        cost: 120,
        stock: 30,
        lowStockThreshold: 12,
        priority: false,
    },
    {
        id: 'p14',
        name: 'Savon de ménage Diarama/BF',
        wolofName: 'Saabu Diarama',
        emoji: '🧼',
        category: 'hygiene',
        unit: 'morceau',
        price: 300,
        cost: 230,
        stock: 3,
        lowStockThreshold: 6,
        priority: true,
    },
    {
        id: 'p15',
        name: 'Paquet de Bougies (x6)',
        wolofName: 'Buusi (paquet)',
        emoji: '🕯️',
        category: 'hygiene',
        unit: 'paquet',
        price: 500,
        cost: 390,
        stock: 5,
        lowStockThreshold: 5,
        priority: false,
    },
    {
        id: 'p16',
        name: 'Thé vert Warga (paquet)',
        wolofName: 'Warga ataaya',
        emoji: '🍵',
        category: 'dejeuner',
        unit: 'paquet',
        price: 250,
        cost: 180,
        stock: 12,
        lowStockThreshold: 6,
        priority: false,
    },
];

// ---------------------------------------------------------------------------
// Clients habitués du quartier (carnet d'ardoise)
// ---------------------------------------------------------------------------
export const SEED_CLIENTS: Client[] = [
    {
        id: 'c1',
        name: 'Awa Sarr (Mère de famille)',
        phone: '77 111 22 33',
        address: 'Médina Rue 14 x 17, Maison Ndiaye',
        avatar: '👩🏾',
        joinDate: '2026-01-10',
        creditLimit: 25000,
        rating: 'excellent',
        notes: 'Paye chaque vendredi soir après réception de la dépense familiale.',
    },
    {
        id: 'c2',
        name: 'Ibrahima Ba (Chauffeur Taxi)',
        phone: '78 222 33 44',
        address: 'Rue 11 près de la Mosquée',
        avatar: '👨🏾',
        joinDate: '2026-02-02',
        creditLimit: 15000,
        rating: 'bon',
        notes: 'Prend le café et le pain le matin. Rembourse par acomptes Wave.',
    },
    {
        id: 'c3',
        name: 'Mariama Diallo (Enseignante)',
        phone: '76 333 44 55',
        address: 'Immeuble Bleu, 2ème étage',
        avatar: '🧕🏾',
        joinDate: '2026-02-15',
        creditLimit: 30000,
        rating: 'excellent',
        notes: 'Règle la totalité de son carnet le 30 du mois par virement Wave.',
    },
    {
        id: 'c4',
        name: 'Ousmane Fall (Tailleur)',
        phone: '77 444 55 66',
        address: 'Atelier de couture en face pharmacie',
        avatar: '✂️',
        joinDate: '2026-03-01',
        creditLimit: 12000,
        rating: 'vigilance',
        notes: 'Retards fréquents. Toujours vérifier le montant avant nouvel achat.',
    },
    {
        id: 'c5',
        name: 'Fatou Ndiaye (Vendeuse beignets)',
        phone: '70 555 66 77',
        address: 'Coin de la rue 9',
        avatar: '🥞',
        joinDate: '2026-03-12',
        creditLimit: 20000,
        rating: 'bon',
        notes: 'Prend de l’huile et du sucre en gros, règle en fin de journée.',
    },
];

const daysAgo = (n: number, hoursOffset = 0) => {
    const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000);
    return d.toISOString();
};

export const SEED_TRANSACTIONS: Transaction[] = [
    // Vente comptoir cash aujourd'hui (multi-articles)
    {
        id: 't1',
        type: 'sale_cash',
        date: daysAgo(0, 2),
        amount: 1100,
        paymentMethod: 'cash',
        receiptNumber: 'TKT-2026-001',
        items: [
            { productId: 'p1', productName: 'Pain Baguette / Tapalapa', emoji: '🥖', unitPrice: 200, cost: 175, quantity: 2 },
            { productId: 'p2', productName: 'Sachet Lait en poudre (25g)', emoji: '🥛', unitPrice: 150, cost: 120, quantity: 2 },
            { productId: 'p3', productName: 'Café Touba (sachet)', emoji: '☕', unitPrice: 100, cost: 75, quantity: 4 },
        ],
    },
    // Vente à crédit aujourd'hui pour Awa Sarr
    {
        id: 't2',
        type: 'sale_credit',
        date: daysAgo(0, 4),
        amount: 4700,
        paymentMethod: 'credit',
        clientId: 'c1',
        clientName: 'Awa Sarr (Mère de famille)',
        receiptNumber: 'TKT-2026-002',
        items: [
            { productId: 'p8', productName: 'Riz brisé parfumé (sac 5kg)', emoji: '🌾', unitPrice: 3500, cost: 3050, quantity: 1 },
            { productId: 'p6', productName: 'Huile végétale (1 Litre)', emoji: '🛢️', unitPrice: 1400, cost: 1200, quantity: 1 },
            { productId: 'p11', productName: 'Cube Bouillon (Maggi/Jumbo)', emoji: '🧊', unitPrice: 50, cost: 35, quantity: 4 },
        ],
        note: 'Dépense pour le déjeuner (Cebu Jën)',
    },
    // Achat à crédit hier pour Ibrahima Ba
    {
        id: 't3',
        type: 'sale_credit',
        date: daysAgo(1, 10),
        amount: 1350,
        paymentMethod: 'credit',
        clientId: 'c2',
        clientName: 'Ibrahima Ba (Chauffeur Taxi)',
        receiptNumber: 'TKT-2026-003',
        items: [
            { productId: 'p1', productName: 'Pain Baguette / Tapalapa', emoji: '🥖', unitPrice: 200, cost: 175, quantity: 2 },
            { productId: 'p13', productName: 'Œuf frais de ferme', emoji: '🥚', unitPrice: 150, cost: 120, quantity: 3 },
            { productId: 'p3', productName: 'Café Touba (sachet)', emoji: '☕', unitPrice: 100, cost: 75, quantity: 5 },
        ],
        note: 'Petit-déjeuner avant service',
    },
    // Remboursement Wave partiel hier par Ibrahima Ba
    {
        id: 't4',
        type: 'repayment',
        date: daysAgo(1, 2),
        amount: 2000,
        paymentMethod: 'wave',
        clientId: 'c2',
        clientName: 'Ibrahima Ba (Chauffeur Taxi)',
        note: 'Remboursement direct par Wave',
    },
    // Vente cash hier
    {
        id: 't5',
        type: 'sale_cash',
        date: daysAgo(1, 6),
        amount: 1900,
        paymentMethod: 'cash',
        items: [
            { productId: 'p5', productName: 'Sucre en poudre (1kg)', emoji: '🍚', unitPrice: 700, cost: 580, quantity: 2 },
            { productId: 'p15', productName: 'Paquet de Bougies (x6)', emoji: '🕯️', unitPrice: 500, cost: 390, quantity: 1 },
        ],
    },
    // Achat à crédit il y a 3 jours pour Mariama Diallo
    {
        id: 't6',
        type: 'sale_credit',
        date: daysAgo(3, 4),
        amount: 8150,
        paymentMethod: 'credit',
        clientId: 'c3',
        clientName: 'Mariama Diallo (Enseignante)',
        receiptNumber: 'TKT-2026-004',
        items: [
            { productId: 'p8', productName: 'Riz brisé parfumé (sac 5kg)', emoji: '🌾', unitPrice: 3500, cost: 3050, quantity: 1 },
            { productId: 'p6', productName: 'Huile végétale (1 Litre)', emoji: '🛢️', unitPrice: 1400, cost: 1200, quantity: 2 },
            { productId: 'p4', productName: 'Sucre en morceaux (500g)', emoji: '🧂', unitPrice: 450, cost: 375, quantity: 2 },
            { productId: 'p10', productName: 'Boîte Tomate concentrée (70g)', emoji: '🥫', unitPrice: 250, cost: 190, quantity: 3 },
            { productId: 'p12', productName: 'Oignon du Sénégal (1kg)', emoji: '🧅', unitPrice: 500, cost: 390, quantity: 2 },
        ],
    },
    // Achat à crédit il y a 5 jours pour Ousmane Fall (en retard)
    {
        id: 't7',
        type: 'sale_credit',
        date: daysAgo(5, 8),
        amount: 5400,
        paymentMethod: 'credit',
        clientId: 'c4',
        clientName: 'Ousmane Fall (Tailleur)',
        items: [
            { productId: 'p4', productName: 'Sucre en morceaux (500g)', emoji: '🧂', unitPrice: 450, cost: 375, quantity: 2 },
            { productId: 'p16', productName: 'Thé vert Warga (paquet)', emoji: '🍵', unitPrice: 250, cost: 180, quantity: 4 },
            { productId: 'p8', productName: 'Riz brisé parfumé (sac 5kg)', emoji: '🌾', unitPrice: 3500, cost: 3050, quantity: 1 },
        ],
        note: 'Attente règlement commande boubous',
    },
    // Réassort de stock il y a 4 jours
    {
        id: 't8',
        type: 'stock_in',
        date: daysAgo(4, 3),
        amount: 30500,
        items: [
            { productId: 'p8', productName: 'Riz brisé parfumé (sac 5kg)', emoji: '🌾', unitPrice: 3500, cost: 3050, quantity: 10 },
        ],
        note: 'Livraison grossiste Sandaga',
    },
];
