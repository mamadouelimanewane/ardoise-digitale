"use client";

import React, { useState } from 'react';
import { Plus, Minus, PackagePlus, Trash2, Edit3, Search } from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { formatMoney, Product } from '../data';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

const CATEGORIES = [
    { key: 'all', label: 'Tous', emoji: '🏪' },
    { key: 'base', label: 'Denrées de base', emoji: '🌾' },
    { key: 'dejeuner', label: 'Petit-déjeuner', emoji: '☕' },
    { key: 'condiment', label: 'Condiments', emoji: '🧅' },
    { key: 'hygiene', label: 'Hygiène', emoji: '🧼' },
    { key: 'divers', label: 'Divers', emoji: '📦' },
];

const EMOJIS = ['📦', '🌾', '🍚', '🛢️', '🧂', '🥛', '☕', '🥖', '🧼', '🥫', '🧊', '🧅', '🥚', '🍵', '🕯️', '🧴', '💊', '🧹'];
const UNITS = ['kg', 'g', 'L', 'cl', 'sac', 'sachet', 'boîte', 'morceau', 'paquet', 'unité', 'bouteille', 'flacon', 'miche', 'carton'];

export default function StockPage() {
    const { products, adjustStock, addProduct, updateProduct, deleteProduct } = useArdoise();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState<Product | null>(null);
    const [showAdjust, setShowAdjust] = useState<Product | null>(null);
    const [adjustQty, setAdjustQty] = useState('1');
    const [adjustNote, setAdjustNote] = useState('');

    // Formulaire d'ajout
    const [name, setName] = useState('');
    const [wolofName, setWolofName] = useState('');
    const [emoji, setEmoji] = useState('📦');
    const [category, setCategory] = useState<Product['category']>('divers');
    const [unit, setUnit] = useState('unité');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [stockInit, setStockInit] = useState('0');
    const [threshold, setThreshold] = useState('5');
    const [priority, setPriority] = useState(true);

    const resetForm = () => {
        setName(''); setWolofName(''); setEmoji('📦'); setCategory('divers');
        setUnit('unité'); setPrice(''); setCost(''); setStockInit('0'); setThreshold('5'); setPriority(true);
    };

    const handleAdd = () => {
        if (!name.trim() || !price) return;
        addProduct({
            name: name.trim(),
            wolofName: wolofName.trim() || undefined,
            emoji: emoji || '📦',
            category,
            unit,
            price: Number(price),
            cost: Number(cost) || Math.round(Number(price) * 0.8),
            stock: Number(stockInit) || 0,
            lowStockThreshold: Number(threshold) || 5,
            priority,
        });
        resetForm();
        setShowAdd(false);
    };

    const handleSaveEdit = () => {
        if (!showEdit) return;
        updateProduct(showEdit.id, {
            name: name.trim() || showEdit.name,
            wolofName: wolofName.trim() || undefined,
            emoji: emoji || showEdit.emoji,
            category,
            unit,
            price: Number(price) || showEdit.price,
            cost: Number(cost) || showEdit.cost,
            lowStockThreshold: Number(threshold) || showEdit.lowStockThreshold,
            priority,
        });
        setShowEdit(null);
    };

    const openEdit = (p: Product) => {
        setName(p.name);
        setWolofName(p.wolofName || '');
        setEmoji(p.emoji);
        setCategory(p.category);
        setUnit(p.unit);
        setPrice(String(p.price));
        setCost(String(p.cost));
        setThreshold(String(p.lowStockThreshold));
        setPriority(p.priority);
        setShowEdit(p);
    };

    const handleAdjust = (delta: number) => {
        if (!showAdjust) return;
        const qty = Number(adjustQty) || 1;
        adjustStock(showAdjust.id, delta * qty, adjustNote.trim() || (delta > 0 ? 'Réassort' : 'Retrait'));
        setAdjustQty('1');
        setAdjustNote('');
        setShowAdjust(null);
    };

    const filtered = products.filter((p) => {
        const matchesCat = activeCategory === 'all' || p.category === activeCategory;
        const matchesSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.wolofName && p.wolofName.toLowerCase().includes(search.toLowerCase()));
        return matchesCat && matchesSearch;
    });

    const lowStockCount = products.filter((p) => p.priority && p.stock <= p.lowStockThreshold).length;

    return (
        <div style={{ padding: '0 14px 110px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' }}>
                <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800 }}>📦 Stock</h2>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                        {products.length} produit(s)
                        {lowStockCount > 0 && (
                            <span style={{ color: '#D97706', fontWeight: 700 }}> · ⚠ {lowStockCount} en rupture proche</span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowAdd(true); }}
                    className="btn btn-primary btn-sm"
                >
                    <Plus size={16} /> Produit
                </button>
            </div>

            {/* Barre de recherche */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un produit..."
                    style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#F8FAFC' }}
                />
            </div>

            {/* Filtres catégories */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        style={{
                            padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
                            background: activeCategory === cat.key ? 'var(--primary)' : '#F1F5F9',
                            color: activeCategory === cat.key ? '#fff' : '#475569',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {cat.emoji} {cat.label}
                    </button>
                ))}
            </div>

            {/* Liste des produits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((p) => {
                    const low = p.stock <= p.lowStockThreshold;
                    const outOfStock = p.stock === 0;
                    const margin = p.price - p.cost;
                    const marginPct = Math.round((margin / p.price) * 100);

                    return (
                        <Card key={p.id} style={{
                            padding: 12,
                            border: outOfStock ? '1.5px solid #FECACA' : low ? '1.5px solid #FDE68A' : '1px solid #E2E8F0',
                            background: outOfStock ? '#FFF5F5' : low ? '#FFFBEB' : '#fff',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ fontSize: 26, flexShrink: 0 }}>{p.emoji}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{p.name}</div>
                                            {p.wolofName && (
                                                <div style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>🇸🇳 {p.wolofName}</div>
                                            )}
                                            <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 11, color: '#64748B' }}>
                                                <span>💰 {formatMoney(p.price)} / {p.unit}</span>
                                                <span style={{ color: '#059669' }}>📈 {marginPct}% marge</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <Badge
                                                bg={outOfStock ? '#FEE2E2' : low ? '#FEF3C7' : '#D1FAE5'}
                                                color={outOfStock ? '#991B1B' : low ? '#92400E' : '#065F46'}
                                            >
                                                {outOfStock ? '❌ Épuisé' : `${p.stock} ${p.unit}(s)`}
                                            </Badge>
                                            {low && !outOfStock && (
                                                <div style={{ fontSize: 10, color: '#D97706', marginTop: 3, fontWeight: 700 }}>⚠ Stock bas</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                <button
                                    onClick={() => { setShowAdjust(p); setAdjustQty('1'); setAdjustNote(''); }}
                                    className="btn btn-secondary btn-sm"
                                    style={{ flex: 1, fontSize: 12 }}
                                >
                                    <PackagePlus size={14} /> Ajuster stock
                                </button>
                                <button
                                    onClick={() => openEdit(p)}
                                    className="btn btn-outline btn-sm"
                                    style={{ flex: 1, fontSize: 12 }}
                                >
                                    <Edit3 size={13} /> Modifier
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`Supprimer ${p.name} du catalogue ?`)) deleteProduct(p.id);
                                    }}
                                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </Card>
                    );
                })}
                {filtered.length === 0 && (
                    <EmptyState icon="📦" title="Aucun produit" subtitle="Ajoutez votre premier produit au catalogue." />
                )}
            </div>

            {/* Modal Ajustement de stock */}
            {showAdjust && (
                <Modal isOpen={!!showAdjust} onClose={() => setShowAdjust(null)} title={`Ajuster stock — ${showAdjust.emoji} ${showAdjust.name}`}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#1E293B' }}>
                            {showAdjust.stock} {showAdjust.unit}(s) en stock
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                            Seuil d&apos;alerte : {showAdjust.lowStockThreshold} {showAdjust.unit}(s)
                        </div>
                    </div>

                    <Input label="Quantité à ajouter / retirer" type="number" value={adjustQty} onChange={setAdjustQty} placeholder="1" />
                    <Input label="Motif / Note" value={adjustNote} onChange={setAdjustNote} placeholder="Ex: livraison Sandaga, vente manuelle, perte..." />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                        <button
                            onClick={() => handleAdjust(-1)}
                            className="btn btn-secondary"
                            disabled={showAdjust.stock === 0 || !adjustQty || Number(adjustQty) <= 0}
                        >
                            <Minus size={16} /> Retirer {adjustQty || '0'} {showAdjust.unit}(s)
                        </button>
                        <button
                            onClick={() => handleAdjust(1)}
                            className="btn btn-success"
                            disabled={!adjustQty || Number(adjustQty) <= 0}
                        >
                            <PackagePlus size={16} /> Ajouter {adjustQty || '0'} {showAdjust.unit}(s)
                        </button>
                    </div>
                </Modal>
            )}

            {/* Modal Ajout produit */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un produit">
                <ProductForm
                    name={name} setName={setName}
                    wolofName={wolofName} setWolofName={setWolofName}
                    emoji={emoji} setEmoji={setEmoji}
                    category={category} setCategory={setCategory}
                    unit={unit} setUnit={setUnit}
                    price={price} setPrice={setPrice}
                    cost={cost} setCost={setCost}
                    stockInit={stockInit} setStockInit={setStockInit}
                    threshold={threshold} setThreshold={setThreshold}
                    priority={priority} setPriority={setPriority}
                    showStockInit={true}
                />
                <Button onClick={handleAdd} style={{ width: '100%', marginTop: 8 }} size="lg" disabled={!name.trim() || !price}>
                    <Plus size={17} /> Ajouter au catalogue
                </Button>
            </Modal>

            {/* Modal Édition produit */}
            {showEdit && (
                <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title={`Modifier — ${showEdit.name}`}>
                    <ProductForm
                        name={name} setName={setName}
                        wolofName={wolofName} setWolofName={setWolofName}
                        emoji={emoji} setEmoji={setEmoji}
                        category={category} setCategory={setCategory}
                        unit={unit} setUnit={setUnit}
                        price={price} setPrice={setPrice}
                        cost={cost} setCost={setCost}
                        stockInit={stockInit} setStockInit={setStockInit}
                        threshold={threshold} setThreshold={setThreshold}
                        priority={priority} setPriority={setPriority}
                        showStockInit={false}
                    />
                    <Button onClick={handleSaveEdit} style={{ width: '100%', marginTop: 8 }} size="lg" disabled={!name.trim()}>
                        Enregistrer les modifications
                    </Button>
                </Modal>
            )}
        </div>
    );
}

// Composant réutilisable pour le formulaire de produit
function ProductForm({
    name, setName, wolofName, setWolofName, emoji, setEmoji,
    category, setCategory, unit, setUnit, price, setPrice,
    cost, setCost, stockInit, setStockInit, threshold, setThreshold,
    priority, setPriority, showStockInit,
}: {
    name: string; setName: (v: string) => void;
    wolofName: string; setWolofName: (v: string) => void;
    emoji: string; setEmoji: (v: string) => void;
    category: Product['category']; setCategory: (v: Product['category']) => void;
    unit: string; setUnit: (v: string) => void;
    price: string; setPrice: (v: string) => void;
    cost: string; setCost: (v: string) => void;
    stockInit: string; setStockInit: (v: string) => void;
    threshold: string; setThreshold: (v: string) => void;
    priority: boolean; setPriority: (v: boolean) => void;
    showStockInit: boolean;
}) {
    const EMOJIS = ['📦', '🌾', '🍚', '🛢️', '🧂', '🥛', '☕', '🥖', '🧼', '🥫', '🧊', '🧅', '🥚', '🍵', '🕯️', '🧴', '🧹', '🧃'];
    const UNITS = ['kg', 'g', 'L', 'cl', 'sac', 'sachet', 'boîte', 'morceau', 'paquet', 'unité', 'bouteille', 'flacon', 'miche'];

    return (
        <>
            {/* Choix emoji */}
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Emoji</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {EMOJIS.map((em) => (
                        <button
                            key={em}
                            onClick={() => setEmoji(em)}
                            style={{
                                width: 34, height: 34, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                                border: emoji === em ? '2px solid var(--primary)' : '1px solid #E2E8F0',
                                background: emoji === em ? '#FFEDD5' : '#F8FAFC',
                            }}
                        >
                            {em}
                        </button>
                    ))}
                </div>
            </div>

            <Input label="Nom du produit *" value={name} onChange={setName} placeholder="Ex: Riz brisé parfumé (sac 5kg)" />
            <Input label="Nom en Wolof (facultatif)" value={wolofName} onChange={setWolofName} placeholder="Ex: Ceb bu neex 5kg" />

            {/* Catégorie */}
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Catégorie</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Product['category'])}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                >
                    <option value="base">🌾 Denrées de base</option>
                    <option value="dejeuner">☕ Petit-déjeuner</option>
                    <option value="condiment">🧅 Condiments</option>
                    <option value="hygiene">🧼 Hygiène</option>
                    <option value="divers">📦 Divers</option>
                </select>
            </div>

            {/* Unité */}
            <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Unité de vente</label>
                <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Input label="Prix de vente (FCFA) *" type="number" value={price} onChange={setPrice} placeholder="1000" />
                <Input label="Prix d'achat (FCFA)" type="number" value={cost} onChange={setCost} placeholder="800" />
            </div>

            {showStockInit && (
                <Input label="Stock initial" type="number" value={stockInit} onChange={setStockInit} placeholder="0" />
            )}

            <Input label="Seuil d'alerte rupture" type="number" value={threshold} onChange={setThreshold} placeholder="5" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', marginBottom: 8 }}>
                <input
                    type="checkbox"
                    id="priority-checkbox"
                    checked={priority}
                    onChange={(e) => setPriority(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="priority-checkbox" style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    ⚡ Produit prioritaire (alerte rupture active)
                </label>
            </div>

            {price && cost && (
                <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 10, marginBottom: 8, fontSize: 12, color: '#065F46' }}>
                    💰 Marge : <strong>{Number(price) - Number(cost)} FCFA ({Math.round(((Number(price) - Number(cost)) / Number(price)) * 100)}%)</strong> par {unit}
                </div>
            )}
        </>
    );
}
