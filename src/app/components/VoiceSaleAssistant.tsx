"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    MicOff,
    CheckCircle2,
    X,
    Volume2,
    Sparkles,
    AlertCircle,
    ShoppingCart,
    ArrowRight,
    RotateCcw,
} from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { CartItem, formatMoney } from '../data';

// Types pour la Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

interface ParsedVoiceSale {
    clientId?: string;
    clientName?: string;
    paymentType: 'cash' | 'credit';
    items: CartItem[];
    totalAmount: number;
    rawText: string;
    confidence: number;
}

interface VoiceSaleAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyToCart: (items: CartItem[], paymentType: 'cash' | 'credit', clientId?: string) => void;
    onDirectSaleConfirmed: (items: CartItem[], paymentType: 'cash' | 'credit', clientId?: string) => void;
}

export const VoiceSaleAssistant: React.FC<VoiceSaleAssistantProps> = ({
    isOpen,
    onClose,
    onApplyToCart,
    onDirectSaleConfirmed,
}) => {
    const { products, clients, clientStats, shopProfile } = useArdoise();

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [speechError, setSpeechError] = useState<string | null>(null);
    const [parsedSale, setParsedSale] = useState<ParsedVoiceSale | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    // Initialisation SpeechRecognition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

        if (!SpeechRec) {
            setSpeechError("Votre navigateur ne supporte pas la reconnaissance vocale Web Speech API (recommandé: Chrome ou Edge sur PC/Android).");
            return;
        }

        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'fr-FR';

        rec.onstart = () => {
            setIsListening(true);
            setSpeechError(null);
            setInterimTranscript('');
        };

        rec.onresult = (event: SpeechRecognitionEvent) => {
            let currentInterim = '';
            let currentFinal = '';

            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                    currentFinal += res[0].transcript;
                } else {
                    currentInterim += res[0].transcript;
                }
            }

            if (currentFinal) {
                setTranscript(currentFinal);
                parseVoiceInput(currentFinal);
            } else if (currentInterim) {
                setInterimTranscript(currentInterim);
            }
        };

        rec.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("SpeechRecognition error:", event.error);
            if (event.error === 'no-speech') {
                setSpeechError("Aucune parole détectée. Veuillez parler près du micro.");
            } else if (event.error === 'not-allowed') {
                setSpeechError("Accès au microphone refusé. Autorisez le microphone dans les paramètres de votre navigateur.");
            } else {
                setSpeechError(`Erreur micro : ${event.error}`);
            }
            setIsListening(false);
        };

        rec.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = rec;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    // Démarre l'écoute automatique à l'ouverture de la modale
    useEffect(() => {
        if (isOpen) {
            setTranscript('');
            setInterimTranscript('');
            setParsedSale(null);
            setIsSuccess(false);
            setSpeechError(null);
            startListening();
        } else {
            stopListening();
        }
    }, [isOpen]);

    const startListening = () => {
        setSpeechError(null);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch {
                // ignore
            }
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.warn("Impossible de démarrer la reconnaissance vocale:", e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
        }
        setIsListening(false);
    };

    // -----------------------------------------------------------------------
    // MOTEUR D'ANALYSE DU LANGAGE NATUREL (Français + Termes Sénégal / Wolof)
    // -----------------------------------------------------------------------
    const parseVoiceInput = (text: string) => {
        const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Détection du mode de paiement
        const isCreditMatch = /\b(credit|ardoise|dette|carnet|kaye|bor|noter|mettre sur)\b/i.test(clean);
        const isCashMatch = /\b(cash|espece|especes|liquide|comptant|xalis|payer)\b/i.test(clean);
        let paymentType: 'cash' | 'credit' = isCreditMatch ? 'credit' : 'cash';

        // 2. Détection du client
        let detectedClient: typeof clients[0] | undefined = undefined;
        for (const c of clients) {
            const clientNameNorm = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const parts = clientNameNorm.split(/[\s()]+/);
            for (const part of parts) {
                if (part.length >= 3 && clean.includes(part)) {
                    detectedClient = c;
                    break;
                }
            }
            if (detectedClient) break;
        }

        // Si un client précis est cité et que le mode n'est pas explicitement cash, par défaut sur marché c'est souvent à l'ardoise
        if (detectedClient && !isCashMatch) {
            paymentType = 'credit';
        }

        // 3. Détection des articles et quantités
        const detectedItems: CartItem[] = [];

        // Dictionnaire de correspondances mots -> produits
        const productKeywords: Record<string, string[]> = {
            p1: ['pain', 'baguette', 'baguettes', 'tapalapa', 'mburu'],
            p2: ['lait', 'meew', 'sachet de lait', 'poudre de lait'],
            p3: ['cafe', 'cafe touba', 'touba', 'kaafe'],
            p4: ['sucre morceaux', 'morceaux de sucre', 'sucre morso', 'suuker morso'],
            p5: ['sucre', 'sucre poudre', 'suuker', 'kilo de sucre'],
            p6: ['huile 1l', 'bouteille d huile', 'huile', 'diwlin'],
            p7: ['demi litre d huile', 'demi litre', 'huile 50cl', 'xawaal'],
            p8: ['sac de riz', 'riz parfume', 'sac 5kg', 'ceb bu neex', 'sac'],
            p9: ['kilo de riz', 'riz', 'ceb'],
            p10: ['tomate', 'boite de tomate', 'concentre de tomate', 'tomaat'],
            p11: ['cube', 'cubes', 'maggi', 'jumbo', 'bouillon'],
            p12: ['oignon', 'oignons', 'sooble', 'kilo d oignon'],
            p13: ['oeuf', 'oeufs', 'nen'],
            p14: ['savon', 'savon diarama', 'diarama', 'bf', 'saabu'],
            p15: ['bougie', 'bougies', 'buusi'],
            p16: ['the', 'the vert', 'warga', 'ataaya'],
        };

        // Table de conversion nombres écrits -> chiffres
        const wordsToNumbers: Record<string, number> = {
            un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
            quinze: 15, vingt: 20, trente: 30,
            benn: 1, naar: 2, natt: 3, nent: 4, juroom: 5,
        };

        // Découpage et recherche
        products.forEach((product) => {
            const keywords = productKeywords[product.id] || [product.name.toLowerCase()];
            let foundKeyword: string | null = null;

            for (const kw of keywords) {
                const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (clean.includes(kwNorm)) {
                    foundKeyword = kwNorm;
                    break;
                }
            }

            if (foundKeyword) {
                // Recherche de la quantité immédiatement avant le mot
                let qty = 1;
                const regexBefore = new RegExp(`(?:(\\d+)|(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|benn|naar|natt))\\s*(?:de\\s+)?(?:sachet[s]?\\s+de\\s+|boite[s]?\\s+de\\s+|morceau[x]?\\s+de\\s+|kilo[s]?\\s+de\\s+|sac[s]?\\s+de\\s+)?${foundKeyword}`, 'i');
                const match = clean.match(regexBefore);

                if (match) {
                    if (match[1]) {
                        qty = parseInt(match[1], 10);
                    } else if (match[2]) {
                        qty = wordsToNumbers[match[2].toLowerCase()] || 1;
                    }
                }

                detectedItems.push({
                    productId: product.id,
                    productName: product.name,
                    emoji: product.emoji,
                    unitPrice: product.price,
                    cost: product.cost,
                    quantity: Math.max(1, qty),
                });
            }
        });

        // Calcul du total
        const totalAmount = detectedItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

        setParsedSale({
            clientId: detectedClient?.id,
            clientName: detectedClient?.name,
            paymentType,
            items: detectedItems,
            totalAmount,
            rawText: text,
            confidence: detectedItems.length > 0 ? 0.9 : 0.4,
        });

        // Synthèse vocale de confirmation
        if (detectedItems.length > 0) {
            speakConfirmation(detectedItems, paymentType, detectedClient?.name);
        }
    };

    // Synthèse Vocale (Feedback Audio)
    const speakConfirmation = (items: CartItem[], mode: 'cash' | 'credit', clientName?: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const itemsList = items.map((i) => `${i.quantity} ${i.productName}`).join(' et ');
        let phrase = `Compris : ${itemsList}.`;
        if (mode === 'credit' && clientName) {
            phrase += ` Sur l'ardoise de ${clientName}.`;
        } else {
            phrase += ` Paiement cash.`;
        }

        const utter = new SpeechSynthesisUtterance(phrase);
        utter.lang = 'fr-FR';
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
    };

    const handleConfirmDirectSale = () => {
        if (!parsedSale || parsedSale.items.length === 0) return;
        onDirectSaleConfirmed(parsedSale.items, parsedSale.paymentType, parsedSale.clientId);
        setIsSuccess(true);

        // Clôture automatique après 1.5s
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleSendToCart = () => {
        if (!parsedSale || parsedSale.items.length === 0) return;
        onApplyToCart(parsedSale.items, parsedSale.paymentType, parsedSale.clientId);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: 24,
                width: '100%',
                maxWidth: 520,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* En-tête */}
                <div style={{
                    padding: '20px 22px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 100%)',
                    color: '#fff',
                    borderRadius: '24px 24px 0 0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Mic size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Saisie Vocale IA</h3>
                            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Dictez votre vente en français ou wolof</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '22px' }}>
                    {/* Écran de succès */}
                    {isSuccess ? (
                        <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <div style={{
                                width: 70,
                                height: 70,
                                borderRadius: '50%',
                                background: '#D1FAE5',
                                color: '#059669',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 14,
                            }}>
                                <CheckCircle2 size={42} />
                            </div>
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>Vente validée par la voix !</h3>
                            <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                                Les stocks ont été décrémentés et l&apos;ardoise mise à jour.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Bouton Micro Central avec animation sonore */}
                            <div style={{ textAlign: 'center', margin: '10px 0 24px' }}>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    {isListening && (
                                        <>
                                            <div style={{
                                                position: 'absolute',
                                                inset: -12,
                                                borderRadius: '50%',
                                                background: 'rgba(194, 65, 12, 0.2)',
                                                animation: 'pulse 1.5s infinite',
                                            }} />
                                            <div style={{
                                                position: 'absolute',
                                                inset: -24,
                                                borderRadius: '50%',
                                                background: 'rgba(194, 65, 12, 0.1)',
                                                animation: 'pulse 2s infinite',
                                            }} />
                                        </>
                                    )}

                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        style={{
                                            width: 84,
                                            height: 84,
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: isListening
                                                ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
                                                : 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isListening
                                                ? '0 0 30px rgba(220, 38, 38, 0.5)'
                                                : '0 8px 24px rgba(194, 65, 12, 0.35)',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            zIndex: 2,
                                        }}
                                    >
                                        {isListening ? <MicOff size={32} /> : <Mic size={34} />}
                                    </button>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                    <span style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: isListening ? '#DC2626' : '#64748B',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}>
                                        {isListening ? (
                                            <>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                                                Je vous écoute... Parlez naturellement !
                                            </>
                                        ) : (
                                            'Appuyez sur le micro pour parler'
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Retranscription en temps réel */}
                            {(transcript || interimTranscript) && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: 14,
                                    background: '#F8FAFC',
                                    border: '1.5px solid #E2E8F0',
                                    marginBottom: 16,
                                    fontSize: 14,
                                    color: '#1E293B',
                                    fontStyle: interimTranscript && !transcript ? 'italic' : 'normal',
                                }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                                        Transcription entendue :
                                    </span>
                                    &ldquo;{transcript || interimTranscript}&rdquo;
                                </div>
                            )}

                            {/* Message d'erreur microphone si présent */}
                            {speechError && (
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: '#FEE2E2',
                                    color: '#991B1B',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 16,
                                }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    {speechError}
                                </div>
                            )}

                            {/* Résultat de l'analyse IA */}
                            {parsedSale && (
                                <div style={{
                                    background: parsedSale.items.length > 0 ? '#F0FDF4' : '#FFFBEB',
                                    border: `1.5px solid ${parsedSale.items.length > 0 ? '#BBF7D0' : '#FDE68A'}`,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 20,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: parsedSale.items.length > 0 ? '#166534' : '#92400E', fontWeight: 800, fontSize: 14 }}>
                                        <Sparkles size={16} />
                                        {parsedSale.items.length > 0 ? 'Vente détectée avec succès !' : 'Articles non reconnus'}
                                    </div>

                                    {parsedSale.items.length > 0 ? (
                                        <>
                                            {/* Détail client & mode */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                <div>
                                                    <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Client :</span>
                                                    <strong style={{ fontSize: 14, color: '#1E293B' }}>
                                                        {parsedSale.clientName ? `👤 ${parsedSale.clientName}` : '🛒 Client de passage'}
                                                    </strong>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Mode de règlement :</span>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '3px 10px',
                                                        borderRadius: 12,
                                                        fontSize: 12,
                                                        fontWeight: 800,
                                                        background: parsedSale.paymentType === 'credit' ? '#FFEDD5' : '#D1FAE5',
                                                        color: parsedSale.paymentType === 'credit' ? '#C2410C' : '#065F46',
                                                    }}>
                                                        {parsedSale.paymentType === 'credit' ? '📒 Ardoise (Crédit)' : '💵 Espèces (Cash)'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Articles détectés */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                                {parsedSale.items.map((it, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                        <span>{it.emoji} {it.quantity}x {it.productName}</span>
                                                        <strong style={{ color: '#1E293B' }}>{formatMoney(it.unitPrice * it.quantity)}</strong>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Total */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 16, fontWeight: 800 }}>
                                                <span>Total calculé :</span>
                                                <span style={{ color: parsedSale.paymentType === 'credit' ? '#C2410C' : '#059669', fontSize: 20 }}>
                                                    {formatMoney(parsedSale.totalAmount)}
                                                </span>
                                            </div>

                                            {/* Boutons de validation rapide */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                                                <button
                                                    onClick={handleSendToCart}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: 13 }}
                                                >
                                                    <ShoppingCart size={16} /> Ajuster au panier
                                                </button>
                                                <button
                                                    onClick={handleConfirmDirectSale}
                                                    className="btn btn-primary"
                                                    style={{ fontSize: 13 }}
                                                >
                                                    <CheckCircle2 size={16} /> Valider direct
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <p style={{ fontSize: 13, color: '#78350F', margin: 0 }}>
                                            Dites par exemple : <em>&ldquo;Awa Sarr 2 pains et 1 sachet de lait à crédit&rdquo;</em> ou <em>&ldquo;1 sac de riz cash&rdquo;</em>.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Exemples guidés de phrases vocales */}
                            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 14, border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                                    💡 Exemples de phrases à dicter :
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#334155' }}>
                                    <div
                                        onClick={() => {
                                            setTranscript("Awa Sarr 2 pains et 1 lait à crédit");
                                            parseVoiceInput("Awa Sarr 2 pains et 1 lait à crédit");
                                        }}
                                        style={{ cursor: 'pointer', padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}
                                    >
                                        👉 <em>&ldquo;Awa Sarr 2 pains et 1 lait à crédit&rdquo;</em>
                                    </div>
                                    <div
                                        onClick={() => {
                                            setTranscript("Ibrahima Ba 1 sac de riz et 2 huiles en espèces");
                                            parseVoiceInput("Ibrahima Ba 1 sac de riz et 2 huiles en espèces");
                                        }}
                                        style={{ cursor: 'pointer', padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}
                                    >
                                        👉 <em>&ldquo;Ibrahima Ba 1 sac de riz et 2 huiles en espèces&rdquo;</em>
                                    </div>
                                    <div
                                        onClick={() => {
                                            setTranscript("3 cafés Touba et 2 sucres cash");
                                            parseVoiceInput("3 cafés Touba et 2 sucres cash");
                                        }}
                                        style={{ cursor: 'pointer', padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}
                                    >
                                        👉 <em>&ldquo;3 cafés Touba et 2 sucres cash&rdquo;</em>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
