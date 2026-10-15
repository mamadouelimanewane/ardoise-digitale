"use client";

import React, { useState } from 'react';
import {
    Store,
    Phone,
    MapPin,
    Languages,
    Download,
    Upload,
    RotateCcw,
    Shield,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function ReglagesPage() {
    const {
        shopProfile,
        updateShopProfile,
        language,
        setLanguage,
        clients,
        products,
        transactions,
        exportBackup,
        importBackup,
        resetToDemoData,
    } = useArdoise();

    const [name, setName] = useState(shopProfile.name);
    const [ownerName, setOwnerName] = useState(shopProfile.ownerName);
    const [neighborhood, setNeighborhood] = useState(shopProfile.neighborhood);
    const [phone, setPhone] = useState(shopProfile.phone);
    const [wavePhone, setWavePhone] = useState(shopProfile.wavePhone);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleSave = () => {
        updateShopProfile({ name, ownerName, neighborhood, phone, wavePhone });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    const handleExport = () => {
        const json = exportBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ardoise-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const ok = importBackup(content);
            setImportMsg({
                ok,
                text: ok
                    ? 'Sauvegarde importée avec succès ! Les données ont été restaurées.'
                    : 'Erreur : fichier de sauvegarde invalide.',
            });
            setTimeout(() => setImportMsg(null), 4000);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleReset = () => {
        if (confirm('⚠ Attention : Cette action supprime TOUTES vos données et recharge les données de démonstration. Continuer ?')) {
            resetToDemoData();
        }
    };

    const totalStockValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
    const totalOutstanding = transactions.reduce((bal, t) => {
        if (t.type === 'sale_credit') return bal + t.amount;
        if (t.type === 'repayment') return bal - t.amount;
        return bal;
    }, 0);

    return (
        <div style={{ padding: '0 14px 110px' }}>
            <div style={{ padding: '20px 0 16px' }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800 }}>⚙️ Ma Boutique</h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Paramètres et profil</p>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Stats récapitulatives                                             */}
            {/* ---------------------------------------------------------------- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                <Card style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{clients.length}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Clients</div>
                </Card>
                <Card style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{products.length}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Produits</div>
                </Card>
                <Card style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{transactions.length}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Opérations</div>
                </Card>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Profil boutique                                                   */}
            {/* ---------------------------------------------------------------- */}
            <Card style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Store size={18} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Profil de ma boutique</h4>
                </div>

                <Input label="Nom de la boutique" value={name} onChange={setName} placeholder="Boutique Al-Amine" />
                <Input label="Votre nom (propriétaire / gérant)" value={ownerName} onChange={setOwnerName} placeholder="Cheikh Tidiane Wade" />
                <Input label="Quartier / Adresse" value={neighborhood} onChange={setNeighborhood} placeholder="Médina Rue 11, Dakar" />
                <Input label="Téléphone" value={phone} onChange={setPhone} placeholder="77 450 28 19" />

                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        <span style={{ color: '#00B2FE' }}>💙</span> Numéro Wave (pour lien de paiement)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#64748B', fontWeight: 600 }}>+221</span>
                        <input
                            value={wavePhone}
                            onChange={(e) => setWavePhone(e.target.value)}
                            placeholder="77 000 00 00"
                            style={{ width: '100%', padding: '9px 9px 9px 44px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                        />
                    </div>
                    {wavePhone && (
                        <div style={{ fontSize: 11, color: '#00B2FE', marginTop: 4 }}>
                            🔗 Lien Wave : https://wave.com/send?phone=+221{wavePhone.replace(/\s+/g, '')}
                        </div>
                    )}
                </div>

                {saveSuccess ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#D1FAE5', borderRadius: 10, color: '#065F46', fontWeight: 700, fontSize: 13 }}>
                        <CheckCircle2 size={16} /> Profil enregistré avec succès !
                    </div>
                ) : (
                    <Button onClick={handleSave} style={{ width: '100%' }}>
                        Enregistrer le profil
                    </Button>
                )}
            </Card>

            {/* ---------------------------------------------------------------- */}
            {/* Langue de l'interface                                             */}
            {/* ---------------------------------------------------------------- */}
            <Card style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Languages size={18} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Langue de l&apos;application</h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                        onClick={() => setLanguage('fr')}
                        style={{
                            padding: '14px 10px',
                            borderRadius: 12,
                            border: language === 'fr' ? '2px solid var(--primary)' : '1.5px solid #E2E8F0',
                            background: language === 'fr' ? '#FFEDD5' : '#F8FAFC',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontFamily: 'inherit',
                        }}
                    >
                        <div style={{ fontSize: 24 }}>🇫🇷</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: language === 'fr' ? 'var(--primary)' : '#1E293B', marginTop: 4 }}>Français</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Interface en français</div>
                    </button>
                    <button
                        onClick={() => setLanguage('wo')}
                        style={{
                            padding: '14px 10px',
                            borderRadius: 12,
                            border: language === 'wo' ? '2px solid var(--primary)' : '1.5px solid #E2E8F0',
                            background: language === 'wo' ? '#FFEDD5' : '#F8FAFC',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontFamily: 'inherit',
                        }}
                    >
                        <div style={{ fontSize: 24 }}>🇸🇳</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: language === 'wo' ? 'var(--primary)' : '#1E293B', marginTop: 4 }}>Wolof</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Xam-xam Wolof</div>
                    </button>
                </div>
            </Card>

            {/* ---------------------------------------------------------------- */}
            {/* Sauvegarde & Restauration                                         */}
            {/* ---------------------------------------------------------------- */}
            <Card style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Shield size={18} style={{ color: '#059669' }} />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Sauvegarde des données</h4>
                </div>

                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>
                    Toutes les données sont stockées localement sur cet appareil.
                    Exportez une sauvegarde JSON pour ne jamais perdre votre carnet d&apos;ardoise.
                </p>

                {importMsg && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        background: importMsg.ok ? '#D1FAE5' : '#FEE2E2',
                        color: importMsg.ok ? '#065F46' : '#991B1B',
                        borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 600,
                    }}>
                        {importMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {importMsg.text}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Download size={16} /> Exporter la sauvegarde (.json)
                    </button>

                    <label style={{ cursor: 'pointer' }}>
                        <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                        <div className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Upload size={16} /> Importer une sauvegarde
                        </div>
                    </label>
                </div>
            </Card>

            {/* ---------------------------------------------------------------- */}
            {/* Zone danger                                                        */}
            {/* ---------------------------------------------------------------- */}
            <Card style={{ border: '1.5px solid #FECACA', background: '#FFF5F5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <AlertCircle size={18} style={{ color: '#DC2626' }} />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#DC2626' }}>Zone de danger</h4>
                </div>
                <p style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 12 }}>
                    Cette action efface TOUTES vos données (produits, clients, transactions) et recharge les données de démonstration. Cette action est irréversible.
                </p>
                <button
                    onClick={handleReset}
                    className="btn btn-sm"
                    style={{ background: '#DC2626', color: '#fff', width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <RotateCcw size={14} /> Réinitialiser (données de démo)
                </button>
            </Card>

            {/* Version */}
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#94A3B8' }}>
                L&apos;Ardoise Digitale v1.0 · Offline-first · Fait pour les boutiquiers du Sénégal 🇸🇳
                <br />Basé sur le cahier des charges PROCESSINGENIERIE
            </div>
        </div>
    );
}
