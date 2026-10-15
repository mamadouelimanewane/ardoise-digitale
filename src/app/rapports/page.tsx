"use client";

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Download } from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { formatMoney, isToday, isThisWeek, isThisMonth } from '../data';
import { Card } from '../components/ui/Card';

type Period = 'day' | 'week' | 'month' | 'all';

export default function RapportsPage() {
    const { products, clients, transactions, clientStats, shopProfile, exportBackup } = useArdoise();
    const [period, setPeriod] = useState<Period>('week');

    // -----------------------------------------------------------------------
    // Filtrage par période
    // -----------------------------------------------------------------------
    const periodFilter = (iso: string) => {
        if (period === 'day') return isToday(iso);
        if (period === 'week') return isThisWeek(iso);
        if (period === 'month') return isThisMonth(iso);
        return true;
    };

    const salesTx = transactions.filter(
        (t) => (t.type === 'sale_cash' || t.type === 'sale_credit') && periodFilter(t.date)
    );
    const repayTx = transactions.filter(
        (t) => t.type === 'repayment' && periodFilter(t.date)
    );
    const stockInTx = transactions.filter(
        (t) => t.type === 'stock_in' && periodFilter(t.date)
    );

    const totalSales = salesTx.reduce((s, t) => s + t.amount, 0);
    const totalCash = salesTx.filter((t) => t.type === 'sale_cash').reduce((s, t) => s + t.amount, 0);
    const totalCredit = salesTx.filter((t) => t.type === 'sale_credit').reduce((s, t) => s + t.amount, 0);
    const totalRepaid = repayTx.reduce((s, t) => s + t.amount, 0);
    const totalStockIn = stockInTx.reduce((s, t) => s + t.amount, 0);

    // Marge estimée sur la période
    const totalMargin = salesTx.reduce((sum, t) => {
        if (t.items && t.items.length > 0) {
            return sum + t.items.reduce((s, it) => s + (it.unitPrice - it.cost) * it.quantity, 0);
        }
        // Rétrocompat ventes mono-produit
        const p = products.find((p) => p.id === t.productId);
        if (p && t.quantity) {
            return sum + (p.price - p.cost) * t.quantity;
        }
        return sum;
    }, 0);

    // Ardoise globale en cours (tous temps)
    const totalOutstanding = transactions.reduce((bal, t) => {
        if (t.type === 'sale_credit') return bal + t.amount;
        if (t.type === 'repayment') return bal - t.amount;
        return bal;
    }, 0);

    // -----------------------------------------------------------------------
    // Produits les plus vendus
    // -----------------------------------------------------------------------
    const productMap = new Map<string, { name: string; emoji: string; qty: number; revenue: number; margin: number }>();
    for (const t of salesTx) {
        const items = t.items && t.items.length > 0
            ? t.items
            : t.productId
            ? [{ productId: t.productId, productName: t.productName || '?', emoji: products.find((p) => p.id === t.productId)?.emoji || '📦', unitPrice: t.unitPrice || t.amount, cost: products.find((p) => p.id === t.productId)?.cost || 0, quantity: t.quantity || 1 }]
            : [];

        for (const it of items) {
            const existing = productMap.get(it.productId || it.productName) || {
                name: it.productName,
                emoji: it.emoji,
                qty: 0,
                revenue: 0,
                margin: 0,
            };
            existing.qty += it.quantity;
            existing.revenue += it.unitPrice * it.quantity;
            existing.margin += (it.unitPrice - (it.cost || 0)) * it.quantity;
            productMap.set(it.productId || it.productName, existing);
        }
    }
    const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

    // -----------------------------------------------------------------------
    // Clients les plus endettés
    // -----------------------------------------------------------------------
    const topDebtors = clients
        .map((c) => ({ ...c, balance: clientStats(c.id).balance }))
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5);

    // -----------------------------------------------------------------------
    // Taux de recouvrement
    // -----------------------------------------------------------------------
    const allTimeCredit = transactions.filter((t) => t.type === 'sale_credit').reduce((s, t) => s + t.amount, 0);
    const allTimeRepaid = transactions.filter((t) => t.type === 'repayment').reduce((s, t) => s + t.amount, 0);
    const recoveryRate = allTimeCredit > 0 ? Math.round((allTimeRepaid / allTimeCredit) * 100) : 100;

    const handleExport = () => {
        const json = exportBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ardoise-digitale-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const periodLabels: Record<Period, string> = {
        day: "Aujourd'hui",
        week: '7 derniers jours',
        month: 'Ce mois',
        all: 'Depuis le début',
    };

    return (
        <div style={{ padding: '0 14px 110px' }}>
            <div style={{ padding: '20px 0 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800 }}>📊 Rapports</h2>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{shopProfile.name}</p>
                    </div>
                    <button onClick={handleExport} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Download size={14} /> Sauvegarder
                    </button>
                </div>
            </div>

            {/* Sélecteur de période */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {(Object.entries(periodLabels) as [Period, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setPeriod(key)}
                        style={{
                            padding: '5px 11px',
                            borderRadius: 20,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            flex: 1,
                            background: period === key ? 'var(--primary)' : '#F1F5F9',
                            color: period === key ? '#fff' : '#475569',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* KPIs principaux */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <Card style={{ padding: 14, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CA Total</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatMoney(totalSales)}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10 }}>
                        <span style={{ color: '#059669' }}>💵 {formatMoney(totalCash)}</span>
                        <span style={{ color: '#D97706' }}>📒 {formatMoney(totalCredit)}</span>
                    </div>
                </Card>
                <Card style={{ padding: 14, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Marge estimée</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 4 }}>{formatMoney(totalMargin)}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                        {totalSales > 0 ? Math.round((totalMargin / totalSales) * 100) : 0}% du CA
                    </div>
                </Card>
                <Card style={{ padding: 14, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Remboursements</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 4 }}>{formatMoney(totalRepaid)}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{repayTx.length} opération(s)</div>
                </Card>
                <Card style={{ padding: 14, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Achats de stock</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>{formatMoney(totalStockIn)}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{stockInTx.length} réassort(s)</div>
                </Card>
            </div>

            {/* Trésorerie & ardoise */}
            <Card style={{ marginBottom: 14, padding: 14 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>💰 Trésorerie réelle</h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Cash encaissé (ventes + remboursements)</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{formatMoney(totalCash + totalRepaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Ardoise globale en cours</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>{formatMoney(Math.max(0, totalOutstanding))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Taux de recouvrement</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: recoveryRate >= 80 ? '#059669' : '#DC2626' }}>
                        {recoveryRate}%
                    </span>
                </div>
                <div style={{ marginTop: 8, height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${recoveryRate}%`, background: recoveryRate >= 80 ? '#059669' : '#DC2626', borderRadius: 4 }} />
                </div>
            </Card>

            {/* Top produits */}
            <Card style={{ marginBottom: 14 }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>
                    <BarChart3 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: '#64748B' }} />
                    Produits les plus vendus
                </h4>
                {topProducts.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#94A3B8' }}>Aucune vente sur cette période.</p>
                ) : (
                    topProducts.map((p, i) => {
                        const maxRevenue = topProducts[0]?.revenue || 1;
                        const pct = Math.round((p.revenue / maxRevenue) * 100);
                        return (
                            <div key={i} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>{p.emoji}</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                                            <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.qty} unité(s) · marge {formatMoney(p.margin)}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{formatMoney(p.revenue)}</div>
                                </div>
                                <div style={{ height: 4, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 4 }} />
                                </div>
                            </div>
                        );
                    })
                )}
            </Card>

            {/* Clients les plus endettés */}
            {topDebtors.length > 0 && (
                <Card style={{ marginBottom: 14 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>
                        <TrendingUp size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: '#DC2626' }} />
                        Ardoise par client
                    </h4>
                    {topDebtors.map((c) => {
                        const maxBal = topDebtors[0]?.balance || 1;
                        const pct = Math.round((c.balance / maxBal) * 100);
                        return (
                            <div key={c.id} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>{c.avatar}</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                                            <div style={{ fontSize: 10, color: '#94A3B8' }}>Plafond : {formatMoney(c.creditLimit)}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>{formatMoney(c.balance)}</div>
                                </div>
                                <div style={{ height: 4, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: '#DC2626', borderRadius: 4 }} />
                                </div>
                            </div>
                        );
                    })}
                </Card>
            )}

            {/* Inventaire actuel */}
            <Card>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>
                    <TrendingDown size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: '#64748B' }} />
                    Inventaire — Valeur du stock actuel
                </h4>
                {products
                    .sort((a, b) => (b.cost * b.stock) - (a.cost * a.stock))
                    .slice(0, 8)
                    .map((p) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.stock} {p.unit}(s) en stock</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(p.cost * p.stock)}</div>
                                <div style={{ fontSize: 10, color: '#94A3B8' }}>valeur achat</div>
                            </div>
                        </div>
                    ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '2px solid #E2E8F0' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Total inventaire</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>
                        {formatMoney(products.reduce((s, p) => s + p.cost * p.stock, 0))}
                    </span>
                </div>
            </Card>
        </div>
    );
}
