"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ShoppingBag,
    BookOpen,
    Package,
    BarChart3,
    Store,
    Mic,
    Sparkles,
} from "lucide-react";
import { ArdoiseProvider, useArdoise } from "./context/ArdoiseContext";
import { VoiceSaleAssistant } from "./components/VoiceSaleAssistant";
import { CartItem } from "./data";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <ArdoiseProvider>
            <AppShell>{children}</AppShell>
        </ArdoiseProvider>
    );
}

function AppShell({ children }: { children: React.ReactNode }) {
    const { shopProfile, recordCartSale } = useArdoise();
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);

    const handleApplyToCart = (items: CartItem[], paymentType: 'cash' | 'credit', clientId?: string) => {
        // Dispatch custom event to notify home page cart
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('voice-cart-add', {
                detail: { items, paymentType, clientId }
            }));
        }
    };

    const handleDirectSaleConfirmed = (items: CartItem[], paymentType: 'cash' | 'credit', clientId?: string) => {
        try {
            recordCartSale(items, paymentType, clientId, 'Vente enregistrée par saisie vocale IA');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('voice-sale-completed'));
            }
        } catch (e) {
            console.error("Erreur validation vente vocale:", e);
        }
    };

    return (
        <div className="app-responsive-container">
            {/* Barre de navigation Desktop (visible sur écrans >= 769px) */}
            <DesktopHeader onOpenVoice={() => setIsVoiceOpen(true)} />

            {/* Contenu principal fluide */}
            <main className="main-content">
                {children}
            </main>

            {/* Bouton Flottant Microphone Rapide sur Mobile */}
            <button
                onClick={() => setIsVoiceOpen(true)}
                className="floating-voice-btn"
                title="Saisie vocale IA"
                aria-label="Dicter une vente"
            >
                <Mic size={24} />
                <span className="voice-btn-label">Vocal</span>
            </button>

            {/* Barre de navigation Mobile (visible sur écrans < 769px) */}
            <MobileNavigation />

            {/* Assistant Vocal IA Global */}
            <VoiceSaleAssistant
                isOpen={isVoiceOpen}
                onClose={() => setIsVoiceOpen(false)}
                onApplyToCart={handleApplyToCart}
                onDirectSaleConfirmed={handleDirectSaleConfirmed}
            />
        </div>
    );
}

function DesktopHeader({ onOpenVoice }: { onOpenVoice: () => void }) {
    const pathname = usePathname();
    const { t, shopProfile } = useArdoise();

    const isActive = (path: string) => {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    };

    return (
        <header className="desktop-header">
            <div className="desktop-header-inner">
                {/* Logo & Titre */}
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        boxShadow: '0 4px 10px rgba(194, 65, 12, 0.3)',
                    }}>
                        🏪
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                            {shopProfile.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                            L&apos;Ardoise Digitale · {shopProfile.neighborhood}
                        </div>
                    </div>
                </Link>

                {/* Liens de navigation */}
                <nav className="desktop-nav-links">
                    <Link href="/" className={`desktop-nav-item ${isActive("/") ? "active" : ""}`}>
                        <ShoppingBag size={18} />
                        <span>{t("home")}</span>
                    </Link>
                    <Link href="/credits" className={`desktop-nav-item ${isActive("/credits") ? "active" : ""}`}>
                        <BookOpen size={18} />
                        <span>{t("credits")}</span>
                    </Link>
                    <Link href="/stock" className={`desktop-nav-item ${isActive("/stock") ? "active" : ""}`}>
                        <Package size={18} />
                        <span>{t("stock")}</span>
                    </Link>
                    <Link href="/rapports" className={`desktop-nav-item ${isActive("/rapports") ? "active" : ""}`}>
                        <BarChart3 size={18} />
                        <span>{t("reports")}</span>
                    </Link>
                    <Link href="/reglages" className={`desktop-nav-item ${isActive("/reglages") ? "active" : ""}`}>
                        <Store size={18} />
                        <span>{t("settings")}</span>
                    </Link>
                </nav>

                {/* Bouton Saisie Vocale Desktop */}
                <button onClick={onOpenVoice} className="btn-desktop-voice">
                    <Mic size={17} />
                    <span>Saisie Vocale IA</span>
                </button>
            </div>
        </header>
    );
}

function MobileNavigation() {
    const pathname = usePathname();
    const { t } = useArdoise();

    const isActive = (path: string) => {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    };

    return (
        <nav className="bottom-nav">
            <Link href="/" className={`nav-item ${isActive("/") ? "active" : ""}`}>
                <ShoppingBag size={21} />
                <span>{t("home")}</span>
            </Link>
            <Link href="/credits" className={`nav-item ${isActive("/credits") ? "active" : ""}`}>
                <BookOpen size={21} />
                <span>{t("credits")}</span>
            </Link>
            <Link href="/stock" className={`nav-item ${isActive("/stock") ? "active" : ""}`}>
                <Package size={21} />
                <span>{t("stock")}</span>
            </Link>
            <Link href="/rapports" className={`nav-item ${isActive("/rapports") ? "active" : ""}`}>
                <BarChart3 size={21} />
                <span>{t("reports")}</span>
            </Link>
            <Link href="/reglages" className={`nav-item ${isActive("/reglages") ? "active" : ""}`}>
                <Store size={21} />
                <span>{t("settings")}</span>
            </Link>
        </nav>
    );
}
