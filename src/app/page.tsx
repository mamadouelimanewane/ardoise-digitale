"use client";

import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    ShoppingCart,
    TrendingUp,
    Clock,
    ChevronRight,
    Search,
    Minus,
    Plus,
} from 'lucide-react';
import { useArdoise } from './context/ArdoiseContext';
import { CartItem, formatMoney, isToday } from './data';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { SaleModal } from './components/SaleModal';

export default function Home() {
    const { products, clients, transactions, clientStats, t, shopProfile, language } = useArdoise();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

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
                if (existing.quantity >= product.stock) return prev; // ne pas dépasser le stock
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

    // -----------------------------------------------------------------------
    // Activité récente (5 dernières transactions)
    // -----------------------------------------------------------------------
    const recentActivity = transactions.slice(0, 5);

    return (
        <div>
            {/* ---------------------------------------------------------------- */}
            {/* HEADER HERO                                                       */}
            {/* ---------------------------------------------------------------- */}
            <div className="header-hero">
                {/* Nom de la boutique */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <p style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            L&apos;Ardoise Digitale
                        </p>
                        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 2 }}>
                            {shopProfile.name}
                        </h1>
                        <p style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: 2 }}>
                            📍 {shopProfile.neighborhood}
                        </p>
                    </div>
                    {lowStockProducts.length > 0 && (
                        <div style={{
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: 20,
                            padding: '4px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 700,
                        }}>
                            <AlertTriangle size={13} />
                            {lowStockProducts.length}
                        </div>
                    )}
                </div>

                {/* KPIs du jour */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                        <p style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('todaySales')}
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatMoney(salesToday)}</p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, opacity: 0.85 }}>
                            <span>💵 {formatMoney(cashToday)}</span>
                            <span>📒 {formatMoney(creditToday)}</span>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                        <p style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Ardoise totale
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: totalOutstanding > 0 ? '#FCD34D' : '#A7F3D0' }}>
                            {formatMoney(Math.max(0, totalOutstanding))}
                        </p>
                        <p style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>
                            {clients.length} clients enregistrés
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 14px' }}>
                {/* ------------------------------------------------------------ */}
                {/* ALERTES RUPTURE & CRÉDIT LIMITE                               */}
                {/* ------------------------------------------------------------ */}
                {lowStockProducts.length > 0 && (
                    <Card style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', marginTop: 14, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#92400E', fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                            <AlertTriangle size={16} /> Stocks bas à réassortir
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {lowStockProducts.map((p) => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#92400E' }}>
                                    <span>{p.emoji} {p.name}</span>
                                    <span style={{ fontWeight: 700 }}>⚠ {p.stock} {p.unit}(s)</span>
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
                        {clientsNearLimit.slice(0, 3).map((c) => {
                            const stats = clientStats(c.id);
                            return (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7F1D1D', marginBottom: 3 }}>
                                    <span>{c.avatar} {c.name.split(' ')[0]}</span>
                                    <span style={{ fontWeight: 700 }}>{formatMoney(stats.balance)} / {formatMoney(c.creditLimit)}</span>
                                </div>
                            );
                        })}
                    </Card>
                )}

                {/* ------------------------------------------------------------ */}
                {/* CAISSE RAPIDE — GRILLE DE PRODUITS                            */}
                {/* ------------------------------------------------------------ */}
                <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800 }}>⚡ {t('quickSale')}</h2>
                        <span style={{ fontSize: 12, color: '#64748B' }}>{products.length} produits</span>
                    </div>

                    {/* Barre de recherche */}
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Chercher produit (français ou Wolof)..."
                            style={{
                                width: '100%',
                                padding: '9px 9px 9px 32px',
                                borderRadius: 10,
                                border: '1.5px solid #E2E8F0',
                                fontSize: 13,
                                fontFamily: 'inherit',
                                outline: 'none',
                                background: '#F8FAFC',
                            }}
                        />
                    </div>

                    {/* Filtres de catégories */}
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
                        {categories.map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 20,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'inherit',
                                    background: activeCategory === cat.key ? 'var(--primary)' : '#F1F5F9',
                                    color: activeCategory === cat.key ? '#fff' : '#475569',
                                    transition: 'all 0.15s ease',
                                    flexShrink: 0,
                                }}
                            >
                                {cat.emoji} {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Grille tactile produits */}
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
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'var(--primary)',
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {cartQty}
                                        </div>
                                    )}

                                    <div style={{ fontSize: 28 }}>{product.emoji}</div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B', textAlign: 'center', lineHeight: 1.3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {product.name}
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                                            {formatMoney(product.price)}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: isLowStock ? '#D97706' : '#94A3B8', fontWeight: 600 }}>
                                        {isOutOfStock ? '❌ Épuisé' : isLowStock ? `⚠ ${product.stock}` : `✓ ${product.stock}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {displayedProducts.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>
                            <p style={{ fontWeight: 600 }}>Aucun produit trouvé</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Modifiez votre recherche ou ajoutez un produit dans l&apos;onglet Stock.</p>
                        </div>
                    )}
                </div>

                {/* ------------------------------------------------------------ */}
                {/* ACTIVITÉ RÉCENTE                                              */}
                {/* ------------------------------------------------------------ */}
                <div style={{ marginTop: 20, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Clock size={16} style={{ color: '#64748B' }} />
                        <h3 style={{ fontSize: 15, fontWeight: 800 }}>Activité récente</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {recentActivity.map((tx) => {
                            const isCredit = tx.type === 'sale_credit';
                            const isRepayment = tx.type === 'repayment';
                            const isStockIn = tx.type === 'stock_in';
                            let label = '';
                            if (tx.type === 'sale_cash') label = `💵 Vente cash`;
                            else if (isCredit) label = `📒 Ardoise — ${tx.clientName || 'Client'}`;
                            else if (isRepayment) label = `✅ Remboursement — ${tx.clientName || 'Client'}`;
                            else if (isStockIn) label = `📦 Réassort stock`;
                            else label = '📊 Mouvement stock';

                            return (
                                <div key={tx.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '9px 12px',
                                    background: '#fff',
                                    borderRadius: 10,
                                    border: '1px solid #E2E8F0',
                                }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{label}</div>
                                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
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

                        {recentActivity.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8' }}>
                                <TrendingUp size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                <p style={{ fontSize: 13, fontWeight: 600 }}>Aucune activité aujourd&apos;hui</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* PANIER FLOTTANT (visible si panier > 0)                          */}
            {/* ---------------------------------------------------------------- */}
            {totalCartItems > 0 && (
                <div className="floating-cart" onClick={() => setShowSaleModal(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ position: 'relative' }}>
                            <ShoppingCart size={22} />
                            <div style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: '#EF4444',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {totalCartItems}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>{totalCartItems} article{totalCartItems > 1 ? 's' : ''} dans le panier</div>
                            <div style={{ fontSize: 16, fontWeight: 800 }}>{formatMoney(totalCartAmount)}</div>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '9px 16px', fontSize: 13 }}
                    >
                        Encaisser <ChevronRight size={15} />
                    </button>
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* MODALE DE VENTE                                                   */}
            {/* ---------------------------------------------------------------- */}
            <SaleModal
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onClearCart={clearCart}
            />
        </div>
    );
}
