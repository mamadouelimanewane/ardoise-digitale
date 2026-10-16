"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    AlertTriangle,
    ShoppingCart,
    TrendingUp,
    Clock,
    ChevronRight,
    Search,
    Minus,
    Plus,
    Mic,
    Sparkles,
    CheckCircle2,
    Users,
} from 'lucide-react';
import { useArdoise } from './context/ArdoiseContext';
import { CartItem, formatMoney, isToday } from './data';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { SaleModal } from './components/SaleModal';
import { VoiceSaleAssistant } from './components/VoiceSaleAssistant';

export default function Home() {
    const { products, clients, transactions, clientStats, t, shopProfile, language, recordCartSale } = useArdoise();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [initialPaymentType, setInitialPaymentType] = useState<'cash' | 'credit'>('cash');
    const [initialClientId, setInitialClientId] = useState<string | undefined>(undefined);

    // -----------------------------------------------------------------------
    // Écoute des événements vocaux globaux (déclenchés depuis le header ou le bouton flottant)
    // -----------------------------------------------------------------------
    useEffect(() => {
        const handleVoiceCartAdd = (e: Event) => {
            const customEvent = e as CustomEvent<{ items: CartItem[]; paymentType: 'cash' | 'credit'; clientId?: string }>;
            if (customEvent.detail && customEvent.detail.items) {
                setCart(customEvent.detail.items);
                if (customEvent.detail.paymentType) setInitialPaymentType(customEvent.detail.paymentType);
                if (customEvent.detail.clientId) setInitialClientId(customEvent.detail.clientId);
                setShowSaleModal(true);
            }
        };

        const handleVoiceSaleCompleted = () => {
            setCart([]);
        };

        window.addEventListener('voice-cart-add', handleVoiceCartAdd);
        window.addEventListener('voice-sale-completed', handleVoiceSaleCompleted);

        return () => {
            window.removeEventListener('voice-cart-add', handleVoiceCartAdd);
            window.removeEventListener('voice-sale-completed', handleVoiceSaleCompleted);
        };
    }, []);

    // -----------------------------------------------------------------------
    // Calculs du tableau de bord
    // -----------------------------------------------------------------------
    const todayTx = transactions.filter((tx) => isToday(tx.date));
    const cashToday = todayTx
        .filter((tx) => tx.type === 'sale_cash' || tx.type === 'repayment')
        .reduce((s, tx) => s + tx.amount, 0);
    const creditToday = todayTx
        .filter((tx) => tx.type === 'sale_credit')
        .reduce((s, tx) => s + tx.amount, 0);
    const salesToday = todayTx
        .filter((tx) => tx.type === 'sale_cash' || tx.type === 'sale_credit')
        .reduce((s, tx) => s + tx.amount, 0);
    const totalOutstanding = transactions.reduce((bal, tx) => {
        if (tx.type === 'sale_credit') return bal + tx.amount;
        if (tx.type === 'repayment') return bal - tx.amount;
        return bal;
    }, 0);

    const lowStockProducts = products.filter((p) => p.priority && p.stock <= p.lowStockThreshold);
    const clientsNearLimit = clients.filter((c) => {
        const stats = clientStats(c.id);
        return stats.balance > c.creditLimit * 0.8 && stats.balance > 0;
    });

    // -----------------------------------------------------------------------
    // Catalogue produits avec filtre et caisse tactile
    // -----------------------------------------------------------------------
    const categories = [
        { key: 'all', label: language === 'wo' ? 'Lépp' : 'Tous', emoji: '🏪' },
        { key: 'base', label: language === 'wo' ? 'Ceb/Suukër' : 'Denrées', emoji: '🌾' },
        { key: 'dejeuner', label: language === 'wo' ? 'Ndekki' : 'P\'Déj', emoji: '☕' },
        { key: 'condiment', label: language === 'wo' ? 'Safal' : 'Condiments', emoji: '🧅' },
        { key: 'hygiene', label: language === 'wo' ? 'Set' : 'Hygiène', emoji: '🧼' },
        { key: 'divers', label: 'Divers', emoji: '📦' },
    ];

    const displayedProducts = useMemo(() => {
        return products
            .filter((p) => {
                const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.wolofName && p.wolofName.toLowerCase().includes(search.toLowerCase()));
                const matchesCat = activeCategory === 'all' || p.category === activeCategory;
                return matchesSearch && matchesCat;
            });
    }, [products, search, activeCategory]);

    // -----------------------------------------------------------------------
    // Gestion du panier
    // -----------------------------------------------------------------------
    const totalCartItems = cart.reduce((s, i) => s + i.quantity, 0);
    const totalCartAmount = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const addToCart = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product || product.stock <= 0) return;

        setCart((prev) => {
            const existing = prev.find((i) => i.productId === productId);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map((i) =>
                    i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    productId: product.id,
                    productName: product.name,
                    emoji: product.emoji,
                    unitPrice: product.price,
                    cost: product.cost,
                    quantity: 1,
                },
            ];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) => {
            return prev
                .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
                .filter((i) => i.quantity > 0);
        });
    };

    const removeItem = (productId: string) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
    };

    const clearCart = () => setCart([]);

    const getCartQty = (productId: string) =>
        cart.find((i) => i.productId === productId)?.quantity || 0;

    // Raccourcis vocaux
    const handleVoiceDirectSale = (items: CartItem[], paymentType: 'cash' | 'credit', clientId?: string) => {
        recordCartSale(items, paymentType, clientId, 'Vente enregistrée par saisie vocale IA');
        setCart([]);
    };

    const handleVoiceApplyToCart = (items: CartItem[], paymentType: 'cash' | 'credit', clientId?: string) => {
        setCart(items);
        setInitialPaymentType(paymentType);
        setInitialClientId(clientId);
        setShowSaleModal(true);
    };

    // -----------------------------------------------------------------------
    // Activité récente (5 dernières transactions)
    // -----------------------------------------------------------------------
    const recentActivity = transactions.slice(0, 5);

    return (
        <div style={{ paddingBottom: 20 }}>
            {/* ---------------------------------------------------------------- */}
            {/* HEADER HERO                                                       */}
            {/* ---------------------------------------------------------------- */}
            <div className="header-hero">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <p style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            L&apos;Ardoise Digitale · Gestion de Proximité
                        </p>
                        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 2 }}>
                            {shopProfile.name}
                        </h1>
                        <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 2 }}>
                            📍 {shopProfile.neighborhood} · Gérant : {shopProfile.ownerName}
                        </p>
                    </div>
                    {lowStockProducts.length > 0 && (
                        <div style={{
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: 20,
                            padding: '5px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 700,
                        }}>
                            <AlertTriangle size={14} />
                            {lowStockProducts.length} alertes stock
                        </div>
                    )}
                </div>

                {/* KPIs du jour */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 14, padding: '12px 16px' }}>
                        <p style={{ fontSize: '0.725rem', opacity: 0.85, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                            {t('todaySales')}
                        </p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatMoney(salesToday)}</p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, opacity: 0.9 }}>
                            <span>💵 Cash : {formatMoney(cashToday)}</span>
                            <span>📒 Crédit : {formatMoney(creditToday)}</span>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 14, padding: '12px 16px' }}>
                        <p style={{ fontSize: '0.725rem', opacity: 0.85, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                            Total Ardoise en cours
                        </p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800, color: totalOutstanding > 0 ? '#FCD34D' : '#A7F3D0' }}>
                            {formatMoney(Math.max(0, totalOutstanding))}
                        </p>
                        <p style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                            {clients.length} clients habitués enregistrés
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 16px' }}>
                {/* ------------------------------------------------------------ */}
                {/* BANNIÈRE VOCALE RAPIDE (Accès 1-Clic sur la Caisse)            */}
                {/* ------------------------------------------------------------ */}
                <div
                    onClick={() => setShowVoiceModal(true)}
                    style={{
                        marginTop: 16,
                        padding: '14px 18px',
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                        border: '2px dashed #FDBA74',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.15s ease',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(194, 65, 12, 0.35)',
                            flexShrink: 0,
                        }}>
                            <Mic size={22} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#9A3412', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>🎙️ Vente Vocale IA (Parlez en français)</span>
                                <span style={{ background: '#EA580C', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>Nouveau</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#C2410C', marginTop: 2 }}>
                                Dictez par ex. : &ldquo;<em>Awa Sarr 2 pains et 1 lait à crédit</em>&rdquo;
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={20} style={{ color: '#C2410C', flexShrink: 0 }} />
                </div>

                {/* ------------------------------------------------------------ */}
                {/* ALERTES RUPTURE & CRÉDIT LIMITE                               */}
                {/* ------------------------------------------------------------ */}
                {lowStockProducts.length > 0 && (
                    <Card style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', marginTop: 14, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#92400E', fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                            <AlertTriangle size={16} /> Stocks bas à réassortir
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
                            {lowStockProducts.map((p) => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#92400E', background: '#FEF3C7', padding: '6px 10px', borderRadius: 8 }}>
                                    <span>{p.emoji} {p.name}</span>
                                    <span style={{ fontWeight: 700 }}>⚠ {p.stock} restant(s)</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {clientsNearLimit.length > 0 && (
                    <Card style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', marginTop: 10, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#991B1B', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                            ⚡ Clients proches de leur plafond d&apos;ardoise
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                            {clientsNearLimit.slice(0, 4).map((c) => {
                                const stats = clientStats(c.id);
                                return (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7F1D1D', background: '#FEE2E2', padding: '6px 10px', borderRadius: 8 }}>
                                        <span>{c.avatar} {c.name}</span>
                                        <span style={{ fontWeight: 700 }}>{formatMoney(stats.balance)} / {formatMoney(c.creditLimit)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* ------------------------------------------------------------ */}
                {/* CAISSE RAPIDE — GRILLE DE PRODUITS TACTILE                    */}
                {/* ------------------------------------------------------------ */}
                <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0F172A' }}>⚡ {t('quickSale')}</h2>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Touchez les articles pour les ajouter au panier</p>
                        </div>
                        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{displayedProducts.length} articles</span>
                    </div>

                    {/* Barre de recherche avec autocomplétion rapide */}
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Recherche rapide (ex: riz, pain, suukër, lait, huile...)"
                            style={{
                                width: '100%',
                                padding: '11px 12px 11px 36px',
                                borderRadius: 12,
                                border: '1.5px solid #E2E8F0',
                                fontSize: 14,
                                fontFamily: 'inherit',
                                outline: 'none',
                                background: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: '#E2E8F0',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 20,
                                    height: 20,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filtres de catégories par onglets pills */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14, scrollbarWidth: 'none' }}>
                        {categories.map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: 20,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'inherit',
                                    background: activeCategory === cat.key ? 'var(--primary)' : '#F1F5F9',
                                    color: activeCategory === cat.key ? '#fff' : '#475569',
                                    transition: 'all 0.15s ease',
                                    flexShrink: 0,
                                    boxShadow: activeCategory === cat.key ? '0 2px 6px rgba(194, 65, 12, 0.25)' : 'none',
                                }}
                            >
                                {cat.emoji} {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Grille tactile responsive de produits */}
                    <div className="pos-grid">
                        {displayedProducts.map((product) => {
                            const cartQty = getCartQty(product.id);
                            const isOutOfStock = product.stock <= 0;
                            const isLowStock = product.stock <= product.lowStockThreshold;

                            return (
                                <div
                                    key={product.id}
                                    className="pos-card"
                                    onClick={() => !isOutOfStock && addToCart(product.id)}
                                    style={{
                                        opacity: isOutOfStock ? 0.45 : 1,
                                        position: 'relative',
                                        border: cartQty > 0
                                            ? '2px solid var(--primary)'
                                            : isLowStock
                                            ? '1.5px solid #FCD34D'
                                            : '1.5px solid #E2E8F0',
                                        background: cartQty > 0 ? '#FFF7ED' : '#fff',
                                    }}
                                >
                                    {/* Badge quantité dans le panier */}
                                    {cartQty > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: 'var(--primary)',
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        }}>
                                            {cartQty}
                                        </div>
                                    )}

                                    <div style={{ fontSize: 32, marginBottom: 2 }}>{product.emoji}</div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', textAlign: 'center', lineHeight: 1.3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {product.name}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginTop: 3 }}>
                                            {formatMoney(product.price)}
                                        </div>
                                    </div>

                                    {/* Contrôles tactiles rapides + / - si déjà dans le panier */}
                                    {cartQty > 0 ? (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                background: '#fff',
                                                border: '1px solid #FED7AA',
                                                borderRadius: 14,
                                                padding: '2px 6px',
                                                marginTop: 6,
                                            }}
                                        >
                                            <button
                                                onClick={() => updateQuantity(product.id, -1)}
                                                style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#F1F5F9', color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#C2410C' }}>{cartQty}</span>
                                            <button
                                                onClick={() => addToCart(product.id)}
                                                style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#C2410C', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 11, color: isLowStock ? '#D97706' : '#94A3B8', fontWeight: 600, marginTop: 4 }}>
                                            {isOutOfStock ? '❌ Épuisé' : isLowStock ? `⚠ ${product.stock} restant(s)` : `✓ ${product.stock} en stock`}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {displayedProducts.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                            <p style={{ fontWeight: 700, fontSize: 15 }}>Aucun produit trouvé</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Essayez un autre mot-clé ou ajoutez ce produit au catalogue.</p>
                        </div>
                    )}
                </div>

                {/* ------------------------------------------------------------ */}
                {/* ACTIVITÉ RÉCENTE                                              */}
                {/* ------------------------------------------------------------ */}
                <div style={{ marginTop: 28, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Clock size={18} style={{ color: '#64748B' }} />
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Dernières opérations de la boutique</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                        {recentActivity.map((tx) => {
                            const isCredit = tx.type === 'sale_credit';
                            const isRepayment = tx.type === 'repayment';
                            let label = '';
                            if (tx.type === 'sale_cash') label = `💵 Vente cash`;
                            else if (isCredit) label = `📒 Ardoise — ${tx.clientName || 'Client'}`;
                            else if (isRepayment) label = `✅ Remboursement — ${tx.clientName || 'Client'}`;
                            else label = `📦 Mouvement stock`;

                            return (
                                <div key={tx.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    background: '#fff',
                                    borderRadius: 12,
                                    border: '1px solid #E2E8F0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{label}</div>
                                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                            {new Date(tx.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            {tx.items && tx.items.length > 1 ? ` · ${tx.items.length} articles` : tx.productName ? ` · ${tx.productName}` : ''}
                                        </div>
                                    </div>
                                    <Badge
                                        bg={isRepayment ? '#D1FAE5' : isCredit ? '#FEF3C7' : '#EFF6FF'}
                                        color={isRepayment ? '#065F46' : isCredit ? '#92400E' : '#1E40AF'}
                                    >
                                        {isRepayment ? '-' : '+'}{formatMoney(tx.amount)}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* PANIER FLOTTANT (visible si articles > 0)                         */}
            {/* ---------------------------------------------------------------- */}
            {totalCartItems > 0 && (
                <div className="floating-cart" onClick={() => setShowSaleModal(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                            <ShoppingCart size={24} />
                            <div style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: '#EF4444',
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {totalCartItems}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>{totalCartItems} article{totalCartItems > 1 ? 's' : ''} au panier</div>
                            <div style={{ fontSize: 17, fontWeight: 800 }}>{formatMoney(totalCartAmount)}</div>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '10px 18px', fontSize: 13, borderRadius: 12 }}
                    >
                        Encaisser <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* MODALE DE VENTE & ENCAISSEMENT                                    */}
            {/* ---------------------------------------------------------------- */}
            <SaleModal
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onClearCart={clearCart}
                initialPaymentType={initialPaymentType}
                initialClientId={initialClientId}
            />

            {/* ---------------------------------------------------------------- */}
            {/* MODALE DE SAISIE VOCALE IA                                        */}
            {/* ---------------------------------------------------------------- */}
            <VoiceSaleAssistant
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onApplyToCart={handleVoiceApplyToCart}
                onDirectSaleConfirmed={handleVoiceDirectSale}
            />
        </div>
    );
}
