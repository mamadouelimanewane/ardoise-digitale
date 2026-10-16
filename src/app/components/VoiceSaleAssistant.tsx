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
    Brain,
    FlaskConical,
    Plus,
    Trash2,
} from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { CartItem, formatMoney, LearnedAlias } from '../data';

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
    matchedAlias?: string;
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
    const { products, clients, learnedAliases, learnAlias, forgetAlias } = useArdoise();

    // Onglet actif : 'mic' (micro direct), 'test' (banc d'essai), 'learn' (mémoire d'apprentissage)
    const [activeTab, setActiveTab] = useState<'mic' | 'test' | 'learn'>('mic');

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [speechError, setSpeechError] = useState<string | null>(null);
    const [parsedSale, setParsedSale] = useState<ParsedVoiceSale | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Formulaire d'apprentissage rapide manuel
    const [newAliasPhrase, setNewAliasPhrase] = useState('');
    const [newAliasType, setNewAliasType] = useState<'client' | 'product'>('client');
    const [newAliasTargetId, setNewAliasTargetId] = useState('');
    const [aliasSuccessMsg, setAliasSuccessMsg] = useState<string | null>(null);

    // Banc d'essai test personnalisé
    const [customTestInput, setCustomTestInput] = useState('');

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    // Initialisation SpeechRecognition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

        if (!SpeechRec) {
            setSpeechError("Votre navigateur ne supporte pas la reconnaissance vocale Web Speech API (recommandé: Chrome ou Edge sur PC/Android). Vous pouvez utiliser l'onglet Banc d'Essai ci-dessus pour tester le moteur.");
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
                setSpeechError("Aucune parole détectée. Veuillez parler près du micro ou utiliser l'onglet Banc d'Essai.");
            } else if (event.error === 'not-allowed') {
                setSpeechError("Accès au microphone refusé. Autorisez le micro dans votre navigateur ou testez via l'onglet Banc d'Essai.");
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
            setActiveTab('mic');
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
    // MOTEUR D'ANALYSE DU LANGAGE NATUREL AVEC AUTO-APPRENTISSAGE
    // -----------------------------------------------------------------------
    const parseVoiceInput = (text: string) => {
        const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Détection du mode de paiement
        const isCreditMatch = /\b(credit|ardoise|dette|carnet|kaye|bor|noter|mettre sur)\b/i.test(clean);
        const isCashMatch = /\b(cash|espece|especes|liquide|comptant|xalis|payer)\b/i.test(clean);
        let paymentType: 'cash' | 'credit' = isCreditMatch ? 'credit' : 'cash';

        // 2. Détection du client : d'abord via la mémoire d'auto-apprentissage
        let detectedClient: typeof clients[0] | undefined = undefined;
        let matchedAliasPhrase: string | undefined = undefined;

        for (const alias of learnedAliases.filter((a) => a.type === 'client')) {
            const aliasNorm = alias.phrase.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (clean.includes(aliasNorm)) {
                detectedClient = clients.find((c) => c.id === alias.targetId);
                matchedAliasPhrase = alias.phrase;
                break;
            }
        }

        // Si non trouvé via alias, chercher par nom/prénom dans la liste des clients
        if (!detectedClient) {
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
        }

        // Si un client précis est cité et que le mode n'est pas explicitement cash, par défaut c'est l'ardoise
        if (detectedClient && !isCashMatch) {
            paymentType = 'credit';
        }

        // 3. Détection des articles et quantités
        const detectedItems: CartItem[] = [];

        // Base de mots-clés par produit
        const productKeywords: Record<string, string[]> = {
            p1: ['pain', 'baguette', 'baguettes', 'tapalapa', 'mburu'],
            p2: ['lait', 'meew', 'sachet de lait', 'sachets de lait', 'poudre de lait'],
            p3: ['cafe', 'cafe touba', 'touba', 'kaafe'],
            p4: ['sucre morceaux', 'morceaux de sucre', 'sucre morso', 'suuker morso'],
            p5: ['sucre', 'sucre poudre', 'suuker', 'kilo de sucre'],
            p6: ['huile 1l', 'bouteille d huile', 'bouteilles d huile', 'huile', 'diwlin'],
            p7: ['demi litre d huile', 'demi litre', 'huile 50cl', 'xawaal'],
            p8: ['sac de riz', 'sacs de riz', 'riz parfume', 'sac 5kg', 'ceb bu neex', 'riz'],
            p9: ['kilo de riz', 'riz'],
            p10: ['tomate', 'boite de tomate', 'boites de tomate', 'concentre de tomate', 'tomaat'],
            p11: ['cube', 'cubes', 'maggi', 'jumbo', 'bouillon'],
            p12: ['oignon', 'oignons', 'sooble', 'kilo d oignon'],
            p13: ['oeuf', 'oeufs', 'nen'],
            p14: ['savon', 'savon diarama', 'diarama', 'bf', 'saabu'],
            p15: ['bougie', 'bougies', 'buusi'],
            p16: ['the', 'the vert', 'warga', 'ataaya'],
        };

        // Enrichir avec le vocabulaire appris (auto-apprentissage)
        learnedAliases.filter((a) => a.type === 'product').forEach((alias) => {
            if (!productKeywords[alias.targetId]) {
                productKeywords[alias.targetId] = [];
            }
            if (!productKeywords[alias.targetId].includes(alias.phrase)) {
                productKeywords[alias.targetId].unshift(alias.phrase);
            }
        });

        // Table de conversion nombres écrits -> chiffres
        const wordsToNumbers: Record<string, number> = {
            un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
            quinze: 15, vingt: 20, trente: 30,
            benn: 1, naar: 2, natt: 3, nent: 4, juroom: 5,
        };

        // Découpage et recherche
        products.forEach((product) => {
            const keywords = productKeywords[product.id] || [product.name.toLowerCase()];
            keywords.sort((a, b) => b.length - a.length);

            let foundKeyword: string | null = null;

            for (const kw of keywords) {
                const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const kwRegex = new RegExp(`\\b${kwNorm}\\b`, 'i');
                if (kwRegex.test(clean)) {
                    foundKeyword = kwNorm;
                    break;
                }
            }

            if (foundKeyword) {
                // Recherche de la quantité immédiatement avant le mot
                let qty = 1;
                const regexBefore = new RegExp(
                    `(?:(\\d+)|(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|benn|naar|natt))\\s*(?:de\\s+)?(?:sachets?|boites?|morceaux?|kilos?|sacs?|bouteilles?|baguettes?|miches?)?\\s*(?:d['\\s]|de\\s+)?${foundKeyword}`,
                    'i'
                );
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
            confidence: detectedItems.length > 0 ? (matchedAliasPhrase ? 0.98 : 0.9) : 0.4,
            matchedAlias: matchedAliasPhrase,
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

        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleSendToCart = () => {
        if (!parsedSale || parsedSale.items.length === 0) return;
        onApplyToCart(parsedSale.items, parsedSale.paymentType, parsedSale.clientId);
        onClose();
    };

    // Enregistrer un nouvel alias d'apprentissage
    const handleSaveNewAlias = () => {
        if (!newAliasPhrase.trim() || !newAliasTargetId) return;
        learnAlias(newAliasPhrase.trim(), newAliasType, newAliasTargetId);
        setAliasSuccessMsg(`Expression « ${newAliasPhrase.trim()} » apprise avec succès !`);
        setNewAliasPhrase('');
        setTimeout(() => setAliasSuccessMsg(null), 3000);
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
                maxWidth: 560,
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* En-tête */}
                <div style={{
                    padding: '18px 22px 14px',
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
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Saisie Vocale IA & Auto-Apprentissage</h3>
                            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Reconnaissance intelligente en français & wolof</p>
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

                {/* Onglets de navigation : Micro / Banc d'Essai / Auto-Apprentissage */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '8px 16px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    gap: 6,
                }}>
                    <button
                        onClick={() => { setActiveTab('mic'); startListening(); }}
                        style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: 'none',
                            background: activeTab === 'mic' ? '#fff' : 'transparent',
                            color: activeTab === 'mic' ? '#C2410C' : '#64748B',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            boxShadow: activeTab === 'mic' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                        }}
                    >
                        <Mic size={14} /> Micro Direct
                    </button>
                    <button
                        onClick={() => { setActiveTab('test'); stopListening(); }}
                        style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: 'none',
                            background: activeTab === 'test' ? '#fff' : 'transparent',
                            color: activeTab === 'test' ? '#C2410C' : '#64748B',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            boxShadow: activeTab === 'test' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                        }}
                    >
                        <FlaskConical size={14} /> Banc d&apos;Essai
                    </button>
                    <button
                        onClick={() => { setActiveTab('learn'); stopListening(); }}
                        style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: 'none',
                            background: activeTab === 'learn' ? '#fff' : 'transparent',
                            color: activeTab === 'learn' ? '#C2410C' : '#64748B',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            boxShadow: activeTab === 'learn' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                        }}
                    >
                        <Brain size={14} /> Mémoire IA ({learnedAliases.length})
                    </button>
                </div>

                <div style={{ padding: '20px 22px' }}>
                    {/* ======================================================== */}
                    {/* ONGLET 1 : MICROPHONE DIRECT                              */}
                    {/* ======================================================== */}
                    {activeTab === 'mic' && (
                        <>
                            {isSuccess ? (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
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
                                    {/* Bouton Micro Central */}
                                    <div style={{ textAlign: 'center', margin: '6px 0 20px' }}>
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
                                                    width: 82,
                                                    height: 82,
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    background: isListening
                                                        ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
                                                        : 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    display: 'flex',
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

                                        <div style={{ marginTop: 12 }}>
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
                                        }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                                                Transcription en direct :
                                            </span>
                                            &ldquo;{transcript || interimTranscript}&rdquo;
                                        </div>
                                    )}

                                    {/* Erreur micro */}
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
                                            <div>{speechError}</div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* ======================================================== */}
                    {/* ONGLET 2 : BANC D'ESSAI & SIMULATION                      */}
                    {/* ======================================================== */}
                    {activeTab === 'test' && (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                                    🧪 Tester une phrase dictée (sans micro)
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        value={customTestInput}
                                        onChange={(e) => setCustomTestInput(e.target.value)}
                                        placeholder="Ex: Mère Awa 2 Gloria à l'ardoise"
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            border: '1.5px solid #E2E8F0',
                                            fontSize: 13,
                                            outline: 'none',
                                            fontFamily: 'inherit',
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && customTestInput.trim()) {
                                                setTranscript(customTestInput.trim());
                                                parseVoiceInput(customTestInput.trim());
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (customTestInput.trim()) {
                                                setTranscript(customTestInput.trim());
                                                parseVoiceInput(customTestInput.trim());
                                            }
                                        }}
                                        className="btn btn-primary"
                                        style={{ width: 'auto', padding: '10px 16px', fontSize: 13 }}
                                    >
                                        Analyser
                                    </button>
                                </div>
                            </div>

                            {/* Échantillons de test 1-clic */}
                            <div style={{ marginBottom: 18 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                                    Phrases de test types à exécuter :
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        { label: "1. Vente à crédit classique", text: "Awa Sarr 2 pains et 1 lait à crédit" },
                                        { label: "2. Vente cash classique", text: "Ibrahima Ba 1 sac de riz et 2 huiles en espèces" },
                                        { label: "3. Auto-apprentissage alias (Mère Awa = Awa Sarr, Gloria = Lait)", text: "Mère Awa 2 Gloria à l'ardoise" },
                                        { label: "4. Multi-articles sans client (cash)", text: "3 cafés Touba et 2 sucres cash" },
                                        { label: "5. Expression wolof courante", text: "Awa Sarr jël na ñaari mburu ak meew ci kaye bi" },
                                    ].map((testItem, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setCustomTestInput(testItem.text);
                                                setTranscript(testItem.text);
                                                parseVoiceInput(testItem.text);
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: 10,
                                                background: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                cursor: 'pointer',
                                                fontSize: 12,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1E293B' }}>{testItem.label}</div>
                                                <div style={{ color: '#C2410C', marginTop: 1 }}>&ldquo;{testItem.text}&rdquo;</div>
                                            </div>
                                            <ArrowRight size={14} style={{ color: '#94A3B8' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* ONGLET 3 : MÉMOIRE D'AUTO-APPRENTISSAGE                   */}
                    {/* ======================================================== */}
                    {activeTab === 'learn' && (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
                                    🧠 Comment fonctionne l&apos;auto-apprentissage ?
                                </h4>
                                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                                    L&apos;IA apprend les surnoms de vos clients (*« Mère Awa »*, *« Tonton Ibra »*) et les marques locales (*« Gloria »* pour le lait, *« Tapalapa »* pour le pain).
                                    Dès que vous apprenez un alias, le système le reconnaît automatiquement à chaque dictée vocale.
                                </p>
                            </div>

                            {/* Formulaire pour enseigner une nouvelle expression */}
                            <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#9A3412', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={15} /> Enseigner une nouvelle expression à l&apos;IA
                                </div>

                                <div style={{ marginBottom: 8 }}>
                                    <input
                                        value={newAliasPhrase}
                                        onChange={(e) => setNewAliasPhrase(e.target.value)}
                                        placeholder="Mot ou surnom prononcé (ex: Mère Fatou, Nido, Tapalapa)"
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #FDBA74', fontSize: 12, outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <select
                                        value={newAliasType}
                                        onChange={(e) => {
                                            setNewAliasType(e.target.value as 'client' | 'product');
                                            setNewAliasTargetId('');
                                        }}
                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FDBA74', fontSize: 12, background: '#fff' }}
                                    >
                                        <option value="client">👤 C&apos;est un Client</option>
                                        <option value="product">📦 C&apos;est un Produit</option>
                                    </select>

                                    <select
                                        value={newAliasTargetId}
                                        onChange={(e) => setNewAliasTargetId(e.target.value)}
                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FDBA74', fontSize: 12, background: '#fff' }}
                                    >
                                        <option value="">Sélectionner la cible...</option>
                                        {newAliasType === 'client'
                                            ? clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                                            : products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                                    </select>
                                </div>

                                {aliasSuccessMsg && (
                                    <div style={{ fontSize: 11, color: '#065F46', background: '#D1FAE5', padding: '6px 10px', borderRadius: 6, marginBottom: 8, fontWeight: 700 }}>
                                        ✓ {aliasSuccessMsg}
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveNewAlias}
                                    className="btn btn-primary btn-sm"
                                    style={{ width: '100%', fontSize: 12 }}
                                    disabled={!newAliasPhrase.trim() || !newAliasTargetId}
                                >
                                    <Plus size={14} /> Mémoriser dans l&apos;IA
                                </button>
                            </div>

                            {/* Liste des règles apprises */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                                    Vocabulaire mémorisé ({learnedAliases.length} règles) :
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                                    {learnedAliases.map((alias) => (
                                        <div
                                            key={alias.id}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                background: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: 12,
                                            }}
                                        >
                                            <div>
                                                <strong style={{ color: '#C2410C' }}>&ldquo;{alias.phrase}&rdquo;</strong>
                                                <span style={{ color: '#64748B' }}> → {alias.targetName}</span>
                                                <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 6 }}>({alias.usageCount}x)</span>
                                            </div>
                                            <button
                                                onClick={() => forgetAlias(alias.id)}
                                                style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                                                title="Oublier cet alias"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* RÉSULTAT DE L'ANALYSE IA (partagé entre onglet micro et test) */}
                    {/* ======================================================== */}
                    {parsedSale && (
                        <div style={{
                            background: parsedSale.items.length > 0 ? '#F0FDF4' : '#FFFBEB',
                            border: `1.5px solid ${parsedSale.items.length > 0 ? '#BBF7D0' : '#FDE68A'}`,
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 16,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: parsedSale.items.length > 0 ? '#166534' : '#92400E', fontWeight: 800, fontSize: 14 }}>
                                    <Sparkles size={16} />
                                    {parsedSale.items.length > 0 ? 'Vente détectée avec succès !' : 'Articles non reconnus'}
                                </div>
                                {parsedSale.matchedAlias && (
                                    <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                                        🧠 Reconnu via apprentissage
                                    </span>
                                )}
                            </div>

                            {parsedSale.items.length > 0 ? (
                                <>
                                    {/* Détail client & mode */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Client détecté :</span>
                                            <strong style={{ fontSize: 14, color: '#1E293B' }}>
                                                {parsedSale.clientName ? `👤 ${parsedSale.clientName}` : '🛒 Client de passage (comptoir)'}
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
                </div>
            </div>
        </div>
    );
};
