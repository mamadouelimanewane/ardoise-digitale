"use client";

import React, { useState } from 'react';
import {
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    Share2,
    X,
    AlertCircle,
    UserPlus,
} from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { CartItem, Transaction, formatMoney } from '../data';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface SaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRemoveItem: (productId: string) => void;
    onClearCart: () => void;
    initialPaymentType?: 'cash' | 'credit';
    initialClientId?: string;
}

export const SaleModal: React.FC<SaleModalProps> = ({
    isOpen,
    onClose,
    cart,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    initialPaymentType,
    initialClientId,
}) => {
    const { clients, clientStats, addClient, recordCartSale, shopProfile, t, language } = useArdoise();

    const [paymentType, setPaymentType] = useState<'cash' | 'credit'>(initialPaymentType || 'cash');
    const [clientId, setClientId] = useState<string>(initialClientId || clients[0]?.id || '');
    const [note, setNote] = useState('');
    const [completedTx, setCompletedTx] = useState<Transaction | null>(null);

    React.useEffect(() => {
        if (initialPaymentType) setPaymentType(initialPaymentType);
        if (initialClientId) setClientId(initialClientId);
    }, [initialPaymentType, initialClientId, isOpen]);

    // Formulaire de création rapide de client
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientAddress, setNewClientAddress] = useState('');
    const [newClientLimit, setNewClientLimit] = useState('20000');

    const totalAmount = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const selectedClient = clients.find((c) => c.id === clientId);
    const selectedClientStats = clientId ? clientStats(clientId) : null;
    const projectedBalance = (selectedClientStats?.balance || 0) + (paymentType === 'credit' ? totalAmount : 0);
    const willExceedLimit = selectedClient && projectedBalance > selectedClient.creditLimit;

    const handleCreateClient = () => {
        if (!newClientName.trim()) return;
        const created = addClient({
            name: newClientName.trim(),
            phone: newClientPhone.trim() || 'Non renseigné',
            address: newClientAddress.trim(),
            avatar: '🧑🏾',
            creditLimit: Number(newClientLimit) || 20000,
            rating: 'bon',
        });
        setClientId(created.id);
        setShowNewClientForm(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientAddress('');
    };

    const handleConfirmSale = () => {
        if (cart.length === 0) return;
        if (paymentType === 'credit' && !clientId) return;

        try {
            const tx = recordCartSale(
                cart,
                paymentType,
                paymentType === 'credit' ? clientId : undefined,
                note.trim() || undefined
            );
            setCompletedTx(tx);
            onClearCart();
        } catch (err) {
            console.error("Erreur enregistrement vente:", err);
        }
    };

    const handleFinish = () => {
        setCompletedTx(null);
        setNote('');
        setPaymentType('cash');
        onClose();
    };

    const handleShareWhatsAppReceipt = () => {
        if (!completedTx) return;
        const phone = selectedClient?.phone?.replace(/\s+/g, '') || '';
        const lines = [
            `*${shopProfile.name}*`,
            `📍 ${shopProfile.neighborhood}`,
            `🧾 Reçu N° ${completedTx.receiptNumber || completedTx.id}`,
            `📅 ${new Date(completedTx.date).toLocaleString('fr-FR')}`,
            `------------------------`,
            `*Détail de vos achats :*`,
            ...(completedTx.items || []).map(
                (item) => `• ${item.emoji} ${item.productName} (x${item.quantity}) : ${formatMoney(item.unitPrice * item.quantity)}`
            ),
            `------------------------`,
            `*TOTAL : ${formatMoney(completedTx.amount)}*`,
            completedTx.type === 'sale_credit'
                ? `Mode : 📒 Ardoise (Crédit)`
                : `Mode : 💵 Espèces (Cash)`,
        ];

        if (completedTx.type === 'sale_credit' && selectedClient) {
            lines.push(`*Nouveau solde ardoise : ${formatMoney(projectedBalance)}*`);
            lines.push(`Règlement direct Wave : https://wave.com/send?phone=+221${shopProfile.wavePhone.replace(/\s+/g, '')}&amount=${projectedBalance}`);
        }

        lines.push(`Jërëjëf pour votre confiance ! 🙏`);
        const text = encodeURIComponent(lines.join('\n'));
        const url = phone ? `https://wa.me/221${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={completedTx ? handleFinish : onClose}
            title={completedTx ? "Quittance & Reçu" : "Panier & Encaissement"}
        >
            {completedTx ? (
                /* REÇU / QUITTANCE SUCCÈS */
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: '#D1FAE5', color: '#059669', marginBottom: 12 }}>
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#065F46' }}>Vente Enregistrée !</h3>
                    <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                        Le stock a été décrémenté automatiquement.
                    </p>

                    <div className="receipt-paper" style={{ margin: '16px 0', textAlign: 'left', fontSize: 13 }}>
                        <div style={{ textAlign: 'center', borderBottom: '1px dashed #CBD5E1', paddingBottom: 8, marginBottom: 8 }}>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>{shopProfile.name}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{shopProfile.neighborhood}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>Tél / Wave : {shopProfile.phone}</div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{completedTx.receiptNumber}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(completedTx.items || []).map((it, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{it.quantity}x {it.productName}</span>
                                    <span style={{ fontWeight: 700 }}>{formatMoney(it.unitPrice * it.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px dashed #CBD5E1', marginTop: 10, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
                            <span>TOTAL</span>
                            <span>{formatMoney(completedTx.amount)}</span>
                        </div>

                        <div style={{ marginTop: 6, fontSize: 11, color: '#64748B' }}>
                            Paiement : {completedTx.type === 'sale_credit' ? `Ardoise (${completedTx.clientName})` : 'Espèces'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            onClick={handleShareWhatsAppReceipt}
                            className="btn"
                            style={{ background: '#25D366', color: '#fff' }}
                        >
                            <Share2 size={18} /> Partager le reçu (WhatsApp)
                        </button>
                        <Button variant="secondary" onClick={handleFinish}>
                            Nouvelle vente
                        </Button>
                    </div>
                </div>
            ) : (
                /* ÉTAPE ENCAISSEMENT PANIER */
                <div>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>
                            <ShoppingCart size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                            <p style={{ fontWeight: 600 }}>{t('emptyCart')}</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Touchez les produits pour les ajouter.</p>
                        </div>
                    ) : (
                        <>
                            {/* Liste des articles du panier */}
                            <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                                {cart.map((item) => (
                                    <div
                                        key={item.productId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            background: '#F8FAFC',
                                            borderRadius: 10,
                                            border: '1px solid #E2E8F0',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: 20 }}>{item.emoji}</span>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.productName}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748B' }}>
                                                    {formatMoney(item.unitPrice)} / u
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                onClick={() => onUpdateQuantity(item.productId, -1)}
                                                style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #CBD5E1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <Minus size={13} />
                                            </button>
                                            <span style={{ fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: 'center' }}>
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.productId, 1)}
                                                style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #CBD5E1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <Plus size={13} />
                                            </button>
                                            <button
                                                onClick={() => onRemoveItem(item.productId)}
                                                style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 4, marginLeft: 2 }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Choix du mode de paiement */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Mode de règlement
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div
                                        onClick={() => setPaymentType('cash')}
                                        style={{
                                            padding: 12,
                                            borderRadius: 12,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            background: paymentType === 'cash' ? '#FFEDD5' : '#F8FAFC',
                                            border: paymentType === 'cash' ? '2px solid #C2410C' : '1.5px solid #E2E8F0',
                                            color: paymentType === 'cash' ? '#C2410C' : '#475569',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        💵 {t('cash')}
                                    </div>
                                    <div
                                        onClick={() => setPaymentType('credit')}
                                        style={{
                                            padding: 12,
                                            borderRadius: 12,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            fontSize: 13,
                                            background: paymentType === 'credit' ? '#FFEDD5' : '#F8FAFC',
                                            border: paymentType === 'credit' ? '2px solid #C2410C' : '1.5px solid #E2E8F0',
                                            color: paymentType === 'credit' ? '#C2410C' : '#475569',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        📒 {t('credit')}
                                    </div>
                                </div>
                            </div>

                            {/* Sélection du client en cas d'ardoise */}
                            {paymentType === 'credit' && (
                                <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                                    {!showNewClientForm ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <label style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                                                    Choisir le client (Kaye)
                                                </label>
                                                <button
                                                    onClick={() => setShowNewClientForm(true)}
                                                    style={{ border: 'none', background: 'transparent', color: '#C2410C', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    <UserPlus size={14} /> + Nouveau
                                                </button>
                                            </div>
                                            <select
                                                value={clientId}
                                                onChange={(e) => setClientId(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #FCD34D', fontSize: 13, background: '#fff', fontWeight: 600, outline: 'none' }}
                                            >
                                                {clients.map((c) => {
                                                    const bal = clientStats(c.id).balance;
                                                    return (
                                                        <option key={c.id} value={c.id}>
                                                            {c.avatar} {c.name} — Dû: {formatMoney(bal)} (Max: {formatMoney(c.creditLimit)})
                                                        </option>
                                                    );
                                                })}
                                            </select>

                                            {selectedClient && selectedClientStats && (
                                                <div style={{ marginTop: 8, fontSize: 11, color: '#92400E', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Solde actuel : <strong>{formatMoney(selectedClientStats.balance)}</strong></span>
                                                    <span>Plafond : <strong>{formatMoney(selectedClient.creditLimit)}</strong></span>
                                                </div>
                                            )}

                                            {willExceedLimit && (
                                                <div style={{ marginTop: 8, padding: 8, background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#991B1B', fontWeight: 600 }}>
                                                    <AlertCircle size={14} /> Attention : Le nouveau solde ({formatMoney(projectedBalance)}) dépassera le plafond autorisé !
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: '#92400E' }}>Nouveau client</span>
                                                <button
                                                    onClick={() => setShowNewClientForm(false)}
                                                    style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <Input label="Nom et Prénom" value={newClientName} onChange={setNewClientName} placeholder="Ex: Fatou Sow" />
                                            <Input label="Téléphone (Wave / WhatsApp)" value={newClientPhone} onChange={setNewClientPhone} placeholder="77 000 00 00" />
                                            <Input label="Adresse / Repère dans le quartier" value={newClientAddress} onChange={setNewClientAddress} placeholder="Ex: Maison blanche Rue 12" />
                                            <Input label="Plafond de crédit autorisé (FCFA)" type="number" value={newClientLimit} onChange={setNewClientLimit} placeholder="20000" />
                                            <Button size="sm" onClick={handleCreateClient} style={{ width: '100%', marginTop: 8 }} disabled={!newClientName.trim()}>
                                                Enregistrer et sélectionner
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Note facultative */}
                            <div style={{ marginBottom: 14 }}>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Note facultative (ex: pris par la fille, urgence...)"
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                                />
                            </div>

                            {/* Récapitulatif Total & Bouton Valider */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1.5px solid #E2E8F0', marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#64748B' }}>{totalItems} article(s)</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>Total à payer</div>
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: paymentType === 'credit' ? '#C2410C' : '#059669' }}>
                                    {formatMoney(totalAmount)}
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmSale}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                disabled={cart.length === 0 || (paymentType === 'credit' && !clientId)}
                            >
                                <CheckCircle2 size={18} /> Valider la vente ({paymentType === 'credit' ? 'Ardoise' : 'Cash'})
                            </button>
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
};
