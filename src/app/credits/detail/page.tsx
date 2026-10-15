"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    MessageCircle,
    CreditCard,
    Wallet,
    TrendingUp,
    Edit3,
    CheckCircle2,
    Trash2,
} from 'lucide-react';
import { useArdoise } from '../../context/ArdoiseContext';
import { formatMoney } from '../../data';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

function ClientDetailContent() {
    const router = useRouter();
    const id = useSearchParams().get('id') ?? '';
    const { clients, transactions, clientStats, recordRepayment, updateClient, deleteClient, shopProfile } = useArdoise();

    const [showRepay, setShowRepay] = useState(false);
    const [amount, setAmount] = useState('');
    const [repayMethod, setRepayMethod] = useState<'cash' | 'wave' | 'om'>('cash');
    const [repayNote, setRepayNote] = useState('');
    const [repaySuccess, setRepaySuccess] = useState(false);

    const [showEdit, setShowEdit] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editLimit, setEditLimit] = useState('');
    const [editNotes, setEditNotes] = useState('');

    const client = clients.find((c) => c.id === id);
    if (!client) {
        return (
            <EmptyState
                icon="❌"
                title="Client non trouvé"
                subtitle="Ce client n'existe pas ou a été supprimé."
            />
        );
    }

    const stats = clientStats(id);
    const history = transactions
        .filter((t) => t.clientId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const limitPct = Math.min(100, (stats.balance / client.creditLimit) * 100);
    const isAtRisk = stats.isOverLimit || stats.solvencyScore === 'vigilance';
    const isExcellent = stats.solvencyScore === 'excellent';

    const handleRepay = () => {
        const value = Number(amount);
        if (!value || value <= 0) return;
        recordRepayment(id, value, repayMethod, repayNote.trim() || undefined);
        setRepaySuccess(true);
        setAmount('');
        setRepayNote('');
    };

    const closeRepay = () => {
        setShowRepay(false);
        setRepaySuccess(false);
    };

    const openEdit = () => {
        setEditName(client.name);
        setEditPhone(client.phone);
        setEditAddress(client.address || '');
        setEditLimit(String(client.creditLimit));
        setEditNotes(client.notes || '');
        setShowEdit(true);
    };

    const handleSaveEdit = () => {
        updateClient(id, {
            name: editName.trim() || client.name,
            phone: editPhone.trim() || client.phone,
            address: editAddress.trim(),
            creditLimit: Number(editLimit) || client.creditLimit,
            notes: editNotes.trim(),
        });
        setShowEdit(false);
    };

    const handleDeleteClient = () => {
        if (confirm(`Supprimer ${client.name} ? L'historique de ses transactions sera conservé.`)) {
            deleteClient(id);
            router.back();
        }
    };

    const sendReminder = () => {
        const phone = client.phone.replace(/\s+/g, '');
        const msg = [
            `Assalāmu ʿalaykum ${client.name.split(' ')[0]},`,
            ``,
            `Je vous contacte de la part de *${shopProfile.name}* (${shopProfile.neighborhood}).`,
            ``,
            `Votre ardoise en cours s'élève à : *${formatMoney(stats.balance)}*`,
            ``,
            `Pour régler facilement par Wave (2 secondes) :`,
            `👉 https://wave.com/send?phone=+221${shopProfile.wavePhone.replace(/\s+/g, '')}&amount=${stats.balance}`,
            ``,
            `Si vous avez déjà réglé, veuillez ignorer ce message.`,
            `Merci de votre confiance. Yalla nañ ko sàkk ✨`,
            `— ${shopProfile.ownerName}`,
        ].join('\n');

        window.open(`https://wa.me/221${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const solvencyColor = isAtRisk ? '#DC2626' : isExcellent ? '#059669' : '#D97706';
    const solvencyLabel = isAtRisk ? '⚡ Surveillance' : isExcellent ? '⭐ Excellent payeur' : '✓ Bon payeur';

    return (
        <div style={{ paddingBottom: 100 }}>
            {/* En-tête gradient */}
            <div style={{
                background: `linear-gradient(135deg, ${isAtRisk ? '#7F1D1D, #B91C1C' : '#7C2D12, #C2410C'} 100%)`,
                padding: '16px 14px 24px',
                color: '#fff',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <button
                        onClick={() => router.back()}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Fiche client</h2>
                    <button
                        onClick={openEdit}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                        <Edit3 size={16} />
                    </button>
                </div>

                {/* Profil client */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <Avatar emoji={client.avatar} size={56} bg="rgba(255,255,255,0.18)" />
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{client.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                            📞 {client.phone}
                            {client.address ? ` · 📍 ${client.address}` : ''}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, color: solvencyColor, background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: '2px 8px', display: 'inline-block', fontWeight: 700 }}>
                            {solvencyLabel}
                        </div>
                    </div>
                </div>

                {/* KPIs ardoise */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase' }}>Solde dû (ardoise)</div>
                        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2, color: stats.balance > 0 ? '#FCD34D' : '#A7F3D0' }}>
                            {formatMoney(stats.balance)}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase' }}>Plafond autorisé</div>
                        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                            {formatMoney(client.creditLimit)}
                        </div>
                    </div>
                </div>

                {/* Barre de remplissage */}
                {stats.balance > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${limitPct}%`,
                                background: limitPct >= 90 ? '#EF4444' : '#FCD34D',
                                borderRadius: 4,
                            }} />
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.8, marginTop: 3 }}>
                            {Math.round(limitPct)}% du plafond utilisé
                            {stats.isOverLimit ? ' ⚠ DÉPASSEMENT !' : ''}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '14px' }}>
                {/* Notes du boutiquier */}
                {client.notes && (
                    <Card style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: 12, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>📝 Note personnelle</div>
                        <div style={{ fontSize: 12, color: '#78350F' }}>{client.notes}</div>
                    </Card>
                )}

                {/* Statistiques */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <Card style={{ padding: 12 }}>
                        <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Total acheté</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#C2410C', marginTop: 2 }}>{formatMoney(stats.totalPurchases)}</div>
                    </Card>
                    <Card style={{ padding: 12 }}>
                        <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Total remboursé</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 2 }}>{formatMoney(stats.totalRepaid)}</div>
                    </Card>
                </div>

                {/* Boutons d'action */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {stats.balance > 0 && (
                        <>
                            <button onClick={() => setShowRepay(true)} className="btn btn-primary">
                                <Wallet size={18} /> Enregistrer un remboursement
                            </button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <button onClick={sendReminder} className="btn" style={{ background: '#25D366', color: '#fff', fontSize: 13 }}>
                                    <MessageCircle size={15} /> Relance WhatsApp
                                </button>
                                <button
                                    onClick={() => window.open(`https://wave.com/send?phone=+221${shopProfile.wavePhone.replace(/\s+/g, '')}&amount=${stats.balance}`, '_blank')}
                                    className="btn btn-wave"
                                    style={{ fontSize: 13 }}
                                >
                                    <CreditCard size={15} /> Payer par Wave
                                </button>
                            </div>
                        </>
                    )}
                    {stats.balance === 0 && (
                        <div style={{ textAlign: 'center', padding: '12px', background: '#D1FAE5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#065F46', fontWeight: 700 }}>
                            <CheckCircle2 size={18} /> Ce client est à jour ! Pas d&apos;ardoise en cours.
                        </div>
                    )}
                </div>

                {/* Historique des transactions */}
                <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>
                    <TrendingUp size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: '#64748B' }} />
                    Historique complet
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {history.map((tx) => {
                        const isCredit = tx.type === 'sale_credit';
                        const isRepayment = tx.type === 'repayment';
                        return (
                            <div
                                key={tx.id}
                                style={{
                                    padding: '10px 12px',
                                    background: '#fff',
                                    border: `1px solid ${isCredit ? '#FDE68A' : '#A7F3D0'}`,
                                    borderRadius: 10,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                                            {isCredit ? '📒 Achat à crédit' : '✅ Remboursement'}
                                            {tx.paymentMethod === 'wave' ? ' (Wave)' : tx.paymentMethod === 'om' ? ' (Orange Money)' : ''}
                                        </div>
                                        {tx.items && tx.items.length > 0 && (
                                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                                                {tx.items.map((it) => `${it.emoji} ${it.productName} x${it.quantity}`).join(' · ')}
                                            </div>
                                        )}
                                        {tx.note && (
                                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' }}>
                                                {tx.note}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 3 }}>
                                            {new Date(tx.date).toLocaleString('fr-FR', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <Badge
                                        bg={isRepayment ? '#D1FAE5' : '#FEF3C7'}
                                        color={isRepayment ? '#065F46' : '#92400E'}
                                    >
                                        {isRepayment ? '-' : '+'}{formatMoney(tx.amount)}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                    {history.length === 0 && (
                        <EmptyState icon="🧾" title="Aucun mouvement" subtitle="Aucun achat à crédit ni remboursement pour ce client." />
                    )}
                </div>

                {/* Supprimer le client */}
                <button
                    onClick={handleDeleteClient}
                    className="btn btn-sm"
                    style={{ marginTop: 20, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', width: '100%' }}
                >
                    <Trash2 size={14} /> Supprimer ce client
                </button>
            </div>

            {/* Modal Remboursement */}
            <Modal isOpen={showRepay} onClose={closeRepay} title="Enregistrer un remboursement">
                {repaySuccess ? (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <CheckCircle2 size={48} style={{ color: '#059669', margin: '0 auto 10px' }} />
                        <h3 style={{ color: '#065F46', fontWeight: 800 }}>Remboursement enregistré !</h3>
                        <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                            Nouveau solde : <strong>{formatMoney(stats.balance)}</strong>
                        </p>
                        <Button onClick={closeRepay} style={{ marginTop: 16, width: '100%' }}>Fermer</Button>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
                            Solde actuel : <strong style={{ color: '#C2410C' }}>{formatMoney(stats.balance)}</strong>
                        </p>

                        {/* Choix du mode de remboursement */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                                Mode de remboursement
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                                {[
                                    { key: 'cash', label: '💵 Cash', bg: '#F1F5F9', activeColor: '#C2410C' },
                                    { key: 'wave', label: '💙 Wave', bg: '#EFF6FF', activeColor: '#0084BD' },
                                    { key: 'om', label: '🟠 Orange', bg: '#FFF7ED', activeColor: '#FF7900' },
                                ].map((m) => (
                                    <div
                                        key={m.key}
                                        onClick={() => setRepayMethod(m.key as 'cash' | 'wave' | 'om')}
                                        style={{
                                            padding: '9px 4px',
                                            borderRadius: 10,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            border: repayMethod === m.key ? `2px solid ${m.activeColor}` : '1.5px solid transparent',
                                            background: repayMethod === m.key ? m.bg : '#F8FAFC',
                                            color: repayMethod === m.key ? m.activeColor : '#475569',
                                        }}
                                    >
                                        {m.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Input
                            label={`Montant remboursé (FCFA) — Max : ${formatMoney(stats.balance)}`}
                            type="number"
                            value={amount}
                            onChange={setAmount}
                            placeholder="Ex: 5000"
                        />

                        {/* Bouton payer tout */}
                        {stats.balance > 0 && (
                            <button
                                onClick={() => setAmount(String(stats.balance))}
                                style={{ fontSize: 11, color: '#059669', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 0 10px', fontWeight: 700 }}
                            >
                                ✓ Tout régler d&apos;un coup ({formatMoney(stats.balance)})
                            </button>
                        )}

                        <Input
                            label="Note (optionnelle)"
                            value={repayNote}
                            onChange={setRepayNote}
                            placeholder="Ex: reçu en main propre, Wave confirmé..."
                        />

                        <Button
                            onClick={handleRepay}
                            style={{ width: '100%' }}
                            size="lg"
                            disabled={!amount || Number(amount) <= 0}
                        >
                            <CheckCircle2 size={18} /> Confirmer le remboursement
                        </Button>
                    </>
                )}
            </Modal>

            {/* Modal Édition client */}
            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Modifier — ${client.name}`}>
                <Input label="Nom et Prénom" value={editName} onChange={setEditName} placeholder={client.name} />
                <Input label="Téléphone" value={editPhone} onChange={setEditPhone} placeholder={client.phone} />
                <Input label="Adresse" value={editAddress} onChange={setEditAddress} placeholder="Rue, maison, quartier..." />
                <Input label="Plafond d'ardoise (FCFA)" type="number" value={editLimit} onChange={setEditLimit} placeholder={String(client.creditLimit)} />
                <Input label="Notes personnelles" value={editNotes} onChange={setEditNotes} placeholder="Habitudes, jours de paiement..." />
                <Button onClick={handleSaveEdit} style={{ width: '100%' }} size="lg">
                    Enregistrer les modifications
                </Button>
            </Modal>
        </div>
    );
}

export default function ClientDetailPage() {
    return (
        <Suspense fallback={null}>
            <ClientDetailContent />
        </Suspense>
    );
}
