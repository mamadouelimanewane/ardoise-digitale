"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    Product,
    Client,
    Transaction,
    CartItem,
    ShopProfile,
    PaymentMethod,
    SEED_PRODUCTS,
    SEED_CLIENTS,
    SEED_TRANSACTIONS,
    DEFAULT_SHOP_PROFILE,
    DICTIONARY,
    generateId,
    todayISO,
} from '../data';

const STORAGE_KEY = 'ardoise-digitale:v2';
// Fallback key pour récupérer les données de la v1 si existantes
const STORAGE_KEY_V1 = 'ardoise-digitale:v1';

interface StoredState {
    products: Product[];
    clients: Client[];
    transactions: Transaction[];
    shopProfile?: ShopProfile;
    language?: 'fr' | 'wo';
}

export interface ClientStats {
    balance: number;
    totalPurchases: number;
    totalRepaid: number;
    lastTransactionDate?: string;
    isOverLimit: boolean;
    solvencyScore: 'excellent' | 'bon' | 'vigilance';
}

interface ArdoiseContextType {
    ready: boolean;
    shopProfile: ShopProfile;
    updateShopProfile: (profile: Partial<ShopProfile>) => void;
    language: 'fr' | 'wo';
    setLanguage: (lang: 'fr' | 'wo') => void;
    t: (key: keyof typeof DICTIONARY.fr) => string;
    products: Product[];
    clients: Client[];
    transactions: Transaction[];
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (id: string, product: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    adjustStock: (productId: string, delta: number, note?: string) => void;
    recordCartSale: (
        items: CartItem[],
        paymentType: 'cash' | 'credit',
        clientId?: string,
        note?: string
    ) => Transaction;
    recordSale: (
        productId: string,
        quantity: number,
        paymentType: 'cash' | 'credit',
        clientId?: string,
        note?: string
    ) => void;
    addClient: (client: Omit<Client, 'id' | 'joinDate'>) => Client;
    updateClient: (id: string, data: Partial<Client>) => void;
    deleteClient: (id: string) => void;
    recordRepayment: (
        clientId: string,
        amount: number,
        method?: PaymentMethod,
        note?: string
    ) => void;
    clientBalance: (clientId: string) => number;
    clientStats: (clientId: string) => ClientStats;
    exportBackup: () => string;
    importBackup: (jsonContent: string) => boolean;
    resetToDemoData: () => void;
}

const ArdoiseContext = createContext<ArdoiseContextType | undefined>(undefined);

function loadInitialState(): StoredState {
    if (typeof window === 'undefined') {
        return {
            products: SEED_PRODUCTS,
            clients: SEED_CLIENTS,
            transactions: SEED_TRANSACTIONS,
            shopProfile: DEFAULT_SHOP_PROFILE,
            language: 'fr',
        };
    }
    try {
        const rawV2 = window.localStorage.getItem(STORAGE_KEY);
        if (rawV2) {
            return JSON.parse(rawV2) as StoredState;
        }

        const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
        if (rawV1) {
            const v1Data = JSON.parse(rawV1);
            return {
                products: v1Data.products || SEED_PRODUCTS,
                clients: v1Data.clients || SEED_CLIENTS,
                transactions: v1Data.transactions || SEED_TRANSACTIONS,
                shopProfile: DEFAULT_SHOP_PROFILE,
                language: 'fr',
            };
        }
    } catch (e) {
        console.error("Erreur lecture localStorage:", e);
    }
    return {
        products: SEED_PRODUCTS,
        clients: SEED_CLIENTS,
        transactions: SEED_TRANSACTIONS,
        shopProfile: DEFAULT_SHOP_PROFILE,
        language: 'fr',
    };
}

export const ArdoiseProvider = ({ children }: { children: ReactNode }) => {
    const [ready, setReady] = useState(false);
    const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
    const [clients, setClients] = useState<Client[]>(SEED_CLIENTS);
    const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS);
    const [shopProfile, setShopProfile] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);
    const [language, setLanguage] = useState<'fr' | 'wo'>('fr');

    useEffect(() => {
        const initial = loadInitialState();
        setProducts(initial.products || SEED_PRODUCTS);
        setClients(initial.clients || SEED_CLIENTS);
        setTransactions(initial.transactions || SEED_TRANSACTIONS);
        setShopProfile(initial.shopProfile || DEFAULT_SHOP_PROFILE);
        setLanguage(initial.language || 'fr');
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        try {
            const stateToSave: StoredState = {
                products,
                clients,
                transactions,
                shopProfile,
                language,
            };
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Impossible de persister l'état dans localStorage:", e);
        }
    }, [ready, products, clients, transactions, shopProfile, language]);

    const t = (key: keyof typeof DICTIONARY.fr): string => {
        const dict = DICTIONARY[language] || DICTIONARY.fr;
        return dict[key] || DICTIONARY.fr[key] || key;
    };

    const updateShopProfile = (profile: Partial<ShopProfile>) => {
        setShopProfile((prev) => ({ ...prev, ...profile }));
    };

    const addProduct = (product: Omit<Product, 'id'>) => {
        setProducts((prev) => [...prev, { ...product, id: generateId() }]);
    };

    const updateProduct = (id: string, updated: Partial<Product>) => {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    };

    const deleteProduct = (id: string) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
    };

    const adjustStock = (productId: string, delta: number, note?: string) => {
        setProducts((prev) =>
            prev.map((p) =>
                p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p
            )
        );

        const product = products.find((p) => p.id === productId);
        if (delta !== 0 && product) {
            setTransactions((prev) => [
                {
                    id: generateId(),
                    type: delta > 0 ? 'stock_in' : 'stock_loss',
                    date: todayISO(),
                    productId,
                    productName: product.name,
                    quantity: Math.abs(delta),
                    amount: (product.cost || product.price) * Math.abs(delta),
                    note: note || (delta > 0 ? 'Réassort de stock' : 'Ajustement inventaire'),
                },
                ...prev,
            ]);
        }
    };

    // Vente multi-articles (Panier Express du comptoir)
    const recordCartSale = (
        items: CartItem[],
        paymentType: 'cash' | 'credit',
        clientId?: string,
        note?: string
    ): Transaction => {
        if (!items || items.length === 0) throw new Error("Panier vide");

        // 1. Décrémenter les stocks de chaque produit
        setProducts((prev) =>
            prev.map((p) => {
                const item = items.find((i) => i.productId === p.id);
                if (item) {
                    return { ...p, stock: Math.max(0, p.stock - item.quantity) };
                }
                return p;
            })
        );

        // 2. Calculer le total et créer la transaction
        const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const client = clientId ? clients.find((c) => c.id === clientId) : undefined;
        const receiptNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newTx: Transaction = {
            id: generateId(),
            type: paymentType === 'cash' ? 'sale_cash' : 'sale_credit',
            date: todayISO(),
            amount: totalAmount,
            paymentMethod: paymentType === 'cash' ? 'cash' : 'credit',
            items: [...items],
            clientId: paymentType === 'credit' ? clientId : undefined,
            clientName: client?.name,
            receiptNumber,
            note,
            // Pour rétrocompatibilité avec les vues mono-produit
            productName: items.length === 1 ? items[0].productName : `${items.length} articles (${items[0].productName}...)`,
            quantity: items.reduce((acc, i) => acc + i.quantity, 0),
        };

        setTransactions((prev) => [newTx, ...prev]);
        return newTx;
    };

    // Rétrocompatibilité : vente mono-produit
    const recordSale = (
        productId: string,
        quantity: number,
        paymentType: 'cash' | 'credit',
        clientId?: string,
        note?: string
    ) => {
        const product = products.find((p) => p.id === productId);
        if (!product || quantity <= 0) return;

        const cartItem: CartItem = {
            productId: product.id,
            productName: product.name,
            emoji: product.emoji,
            unitPrice: product.price,
            cost: product.cost,
            quantity,
        };

        recordCartSale([cartItem], paymentType, clientId, note);
    };

    const addClient = (client: Omit<Client, 'id' | 'joinDate'>): Client => {
        const newClient: Client = {
            ...client,
            id: generateId(),
            joinDate: todayISO().split('T')[0],
            creditLimit: client.creditLimit || 20000,
            rating: client.rating || 'bon',
        };
        setClients((prev) => [...prev, newClient]);
        return newClient;
    };

    const updateClient = (id: string, data: Partial<Client>) => {
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    };

    const deleteClient = (id: string) => {
        setClients((prev) => prev.filter((c) => c.id !== id));
    };

    const recordRepayment = (
        clientId: string,
        amount: number,
        method: PaymentMethod = 'cash',
        note?: string
    ) => {
        if (amount <= 0) return;
        const client = clients.find((c) => c.id === clientId);

        setTransactions((prev) => [
            {
                id: generateId(),
                type: 'repayment',
                date: todayISO(),
                amount,
                paymentMethod: method,
                clientId,
                clientName: client?.name,
                note: note || (method === 'wave' ? 'Remboursement par Wave' : method === 'om' ? 'Remboursement Orange Money' : 'Remboursement espèces'),
            },
            ...prev,
        ]);
    };

    const clientBalance = (clientId: string): number => {
        return transactions.reduce((bal, t) => {
            if (t.clientId !== clientId) return bal;
            if (t.type === 'sale_credit') return bal + t.amount;
            if (t.type === 'repayment') return bal - t.amount;
            return bal;
        }, 0);
    };

    const clientStats = (clientId: string): ClientStats => {
        const client = clients.find((c) => c.id === clientId);
        const limit = client?.creditLimit || 20000;

        let totalPurchases = 0;
        let totalRepaid = 0;
        let lastDate: string | undefined = undefined;

        for (const t of transactions) {
            if (t.clientId === clientId) {
                if (!lastDate || new Date(t.date) > new Date(lastDate)) {
                    lastDate = t.date;
                }
                if (t.type === 'sale_credit') totalPurchases += t.amount;
                if (t.type === 'repayment') totalRepaid += t.amount;
            }
        }

        const balance = Math.max(0, totalPurchases - totalRepaid);
        const isOverLimit = balance > limit;

        // Calcul score de solvabilité
        let solvencyScore: 'excellent' | 'bon' | 'vigilance' = client?.rating || 'bon';
        if (isOverLimit || balance > limit * 0.9) {
            solvencyScore = 'vigilance';
        } else if (totalRepaid >= totalPurchases * 0.7 && balance <= limit * 0.4) {
            solvencyScore = 'excellent';
        }

        return {
            balance,
            totalPurchases,
            totalRepaid,
            lastTransactionDate: lastDate,
            isOverLimit,
            solvencyScore,
        };
    };

    const exportBackup = (): string => {
        const data: StoredState = {
            products,
            clients,
            transactions,
            shopProfile,
            language,
        };
        return JSON.stringify(data, null, 2);
    };

    const importBackup = (jsonContent: string): boolean => {
        try {
            const data = JSON.parse(jsonContent) as StoredState;
            if (data.products && Array.isArray(data.products)) setProducts(data.products);
            if (data.clients && Array.isArray(data.clients)) setClients(data.clients);
            if (data.transactions && Array.isArray(data.transactions)) setTransactions(data.transactions);
            if (data.shopProfile) setShopProfile(data.shopProfile);
            if (data.language) setLanguage(data.language);
            return true;
        } catch (e) {
            console.error("Erreur importation sauvegarde:", e);
            return false;
        }
    };

    const resetToDemoData = () => {
        setProducts(SEED_PRODUCTS);
        setClients(SEED_CLIENTS);
        setTransactions(SEED_TRANSACTIONS);
        setShopProfile(DEFAULT_SHOP_PROFILE);
        setLanguage('fr');
        try {
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem(STORAGE_KEY_V1);
        } catch {
            // ignore
        }
    };

    return (
        <ArdoiseContext.Provider
            value={{
                ready,
                shopProfile,
                updateShopProfile,
                language,
                setLanguage,
                t,
                products,
                clients,
                transactions,
                addProduct,
                updateProduct,
                deleteProduct,
                adjustStock,
                recordCartSale,
                recordSale,
                addClient,
                updateClient,
                deleteClient,
                recordRepayment,
                clientBalance,
                clientStats,
                exportBackup,
                importBackup,
                resetToDemoData,
            }}
        >
            {children}
        </ArdoiseContext.Provider>
    );
};

export const useArdoise = () => {
    const context = useContext(ArdoiseContext);
    if (context === undefined) {
        throw new Error('useArdoise must be used within an ArdoiseProvider');
    }
    return context;
};
