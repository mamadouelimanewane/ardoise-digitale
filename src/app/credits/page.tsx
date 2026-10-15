"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    UserPlus,
    Search,
    ChevronRight,
    Share2,
    MessageCircle,
    CreditCard,
    AlertCircle,
} from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { formatMoney } from '../data';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export default function CreditsPage() {
    const router = useRouter();
    const { clients, clientStats, addClient, t, shopProfile } = useArdoise();

    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [filterMode, setFilterMode] = useState<'all' | 'debt' | 'ok' | 'vigilance'>('all');

    // Formulaire nouveau client
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [creditLimit, setCreditLimit] = useState('20000');
    const [avatar, setAvatar] = useState('🧑🏾');

    const avatarOptions = ['🧑🏾', '👩🏾', '👨🏾', '🧕🏾', '👴🏾', '👵🏾', '🤵🏾', '✂️', '🥞', '🧑‍🍳'];

    // Total ardoise globale
    const totalOutstanding = clients.reduce((sum, c) => {
        const stats = clientStats(c.id);
        return sum + Math.max(0, stats.balance);
    }, 0);

    // Liste filtrée et triée
    const filteredClients = clients
        .filter((c) => {
            const matchesSearch =
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.phone.includes(search) ||
                (c.address || '').toLowerCase().includes(search.toLowerCase());

            const stats = clientStats(c.id);
            if (filterMode === 'debt') return matchesSearch && stats.balance > 0;
            if (filterMode === 'ok') return matchesSearch && stats.balance === 0;
            if (filterMode === 'vigilance') return matchesSearch && stats.solvencyScore === 'vigilance';
            return matchesSearch;
        })
        .sort((a, b) => {
            const balA = clientStats(a.id).balance;
            const balB = clientStats(b.id).balance;
            return balB - balA;
        });

    const handleAdd = () => {
        if (!name.trim()) return;
        addClient({
            name: name.trim(),
            phone: phone.trim() || 'Non renseigné',
            address: address.trim(),
            avatar,
            creditLimit: Number(creditLimit) || 20000,
            rating: 'bon',
        });
        setName('');
        setPhone('');
        setAddress('');
        setCreditLimit('20000');
        setAvatar('🧑🏾');
        setShowAdd(false);
    };

    // Générer un message de relance WhatsApp respectueux
    const sendReminder = (clientId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const client = clients.find((c) => c.id === clientId);
        if (!client) return;
        const stats = clientStats(clientId);
        const phone = client.phone.replace(/\s+/g, '');

        const msg = [
            `Assalāmu ʿalaykum ${client.name.split(' ')[0]},`,
            ``,
            `Je vous contacte de la part de *${shopProfile.name}* concernant votre ardoise.`,
            ``,
            `Montant restant dû : *${formatMoney(stats.balance)}*`,
            ``,
            `Quand vous serez disponible, vous pouvez régler directement via Wave :`,
            `👉 https://wave.com/send?phone=+221${shopProfile.wavePhone.replace(/\s+/g, '')}&amount=${stats.balance}`,
            ``,
            `Merci de votre confiance. Nanga def ? 🙏`,
            `— ${shopProfile.ownerName}, ${shopProfile.name}`,
        ].join('\n');

        const url = `https://wa.me/221${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const filterTabs = [
        { key: 'all', label: 'Tous', emoji: '👥' },
        { key: 'debt', label: 'Ont une ardoise', emoji: '📒' },
        { key: 'vigilance', label: 'Surveillance', emoji: '⚡' },
        { key: 'ok', label: 'À jour', emoji: '✅' },
    ];

    return (
        <div style={{ padding: '0 14px 110px' }}>
            {/* En-tête */}
            <div style={{ padding: '20px 0 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800 }}>📒 {t('credits')}</h2>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                            {clients.length} client(s) · Ardoise totale :{' '}
                            <strong style={{ color: '#C2410C' }}>{formatMoney(Math.max(0, totalOutstanding))}</strong>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                    >
                        <UserPlus size={16} /> Nouveau client
                    </button>
                </div>
            </div>

            {/* Barre de recherche */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher client, téléphone, adresse..."
                    style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#F8FAFC' }}
                />
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
                {filterTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilterMode(tab.key as typeof filterMode)}
                        style={{
                            padding: '5px 11px',
                            borderRadius: 20,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            flexShrink: 0,
                            background: filterMode === tab.key ? 'var(--primary)' : '#F1F5F9',
                            color: filterMode === tab.key ? '#fff' : '#475569',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {tab.emoji} {tab.label}
                    </button>
                ))}
            </div>

            {/* Liste clients */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredClients.map((c) => {
                    const stats = clientStats(c.id);
                    const limitPct = Math.min(100, (stats.balance / c.creditLimit) * 100);
                    const isAtRisk = stats.isOverLimit || stats.solvencyScore === 'vigilance';

                    return (
                        <div
                            key={c.id}
                            className="card card-clickable"
                            onClick={() => router.push(`/credits/detail?id=${c.id}`)}
                            style={{
                                padding: 12,
                                border: isAtRisk ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
                                background: isAtRisk ? '#FFF5F5' : '#fff',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <Avatar emoji={c.avatar} size={46} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{c.name}</div>
                                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                                📞 {c.phone}
                                                {c.address ? ` · 📍 ${c.address}` : ''}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                                            <Badge
                                                bg={stats.balance > 0 ? (isAtRisk ? '#FEE2E2' : '#FEF3C7') : '#D1FAE5'}
                                                color={stats.balance > 0 ? (isAtRisk ? '#991B1B' : '#92400E') : '#065F46'}
                                            >
                                                {stats.balance > 0 ? formatMoney(stats.balance) : '✓ À jour'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Barre de progression plafond */}
                                    {stats.balance > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', marginBottom: 3 }}>
                                                <span>Plafond utilisé</span>
                                                <span style={{ fontWeight: 700, color: limitPct >= 90 ? '#DC2626' : '#64748B' }}>
                                                    {Math.round(limitPct)}%
                                                </span>
                                            </div>
                                            <div style={{ height: 5, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${limitPct}%`,
                                                    borderRadius: 4,
                                                    background: limitPct >= 90 ? '#DC2626' : limitPct >= 70 ? '#D97706' : '#059669',
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <ChevronRight size={16} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                            </div>

                            {/* Actions rapides */}
                            {stats.balance > 0 && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                                    <button
                                        onClick={(e) => sendReminder(c.id, e)}
                                        className="btn btn-sm"
                                        style={{ flex: 1, background: '#25D366', color: '#fff', fontSize: 11 }}
                                    >
                                        <MessageCircle size={13} /> Relancer WhatsApp
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const waveUrl = `https://wave.com/send?phone=+221${shopProfile.wavePhone.replace(/\s+/g, '')}&amount=${stats.balance}`;
                                            window.open(waveUrl, '_blank');
                                        }}
                                        className="btn btn-sm btn-wave"
                                        style={{ flex: 1, fontSize: 11 }}
                                    >
                                        <CreditCard size={13} /> Lien Wave
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredClients.length === 0 && (
                    <EmptyState
                        icon="🧑🏾"
                        title="Aucun client trouvé"
                        subtitle="Ajoutez un client pour suivre son ardoise."
                    />
                )}
            </div>

            {/* Modal ajout client */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Nouveau client">
                {/* Choix avatar */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Avatar</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {avatarOptions.map((av) => (
                            <button
                                key={av}
                                onClick={() => setAvatar(av)}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    border: avatar === av ? '2px solid var(--primary)' : '1px solid #E2E8F0',
                                    background: avatar === av ? '#FFEDD5' : '#F8FAFC',
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {av}
                            </button>
                        ))}
                    </div>
                </div>

                <Input label="Nom et Prénom *" value={name} onChange={setName} placeholder="Ex: Fatoumata Ndiaye" />
                <Input label="Téléphone (WhatsApp / Wave)" value={phone} onChange={setPhone} placeholder="77 000 00 00" />
                <Input label="Adresse / Repère dans le quartier" value={address} onChange={setAddress} placeholder="Ex: Maison jaune Rue 14" />
                <Input
                    label="Plafond d'ardoise autorisé (FCFA)"
                    type="number"
                    value={creditLimit}
                    onChange={setCreditLimit}
                    placeholder="20000"
                />

                {Number(creditLimit) > 0 && (
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                        💡 Ce client pourra prendre jusqu&apos;à <strong>{formatMoney(Number(creditLimit))}</strong> à crédit avant d&apos;être bloqué.
                    </div>
                )}

                <Button
                    onClick={handleAdd}
                    style={{ width: '100%' }}
                    size="lg"
                    disabled={!name.trim()}
                >
                    <UserPlus size={17} /> Enregistrer le client
                </Button>
            </Modal>
        </div>
    );
}
