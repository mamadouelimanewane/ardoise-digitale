"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    MicOff,
    CheckCircle2,
    X,
    Sparkles,
    AlertCircle,
    ShoppingCart,
    ArrowRight,
    Brain,
    FlaskConical,
    Plus,
    Trash2,
    Lightbulb,
    History,
} from 'lucide-react';
import { useArdoise } from '../context/ArdoiseContext';
import { CartItem, formatMoney, LearnedAlias } from '../data';
import { parseVoiceWithAI, AIParseResult } from '../lib/voiceAIEngine';

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
    const {
        products,
        clients,
        learnedAliases,
        learnAlias,
        forgetAlias,
        clientHabits,
        recordVoiceFeedback,
    } = useArdoise();

    const [activeTab, setActiveTab] = useState<'mic' | 'test' | 'learn'>('mic');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [speechError, setSpeechError] = useState<string | null>(null);
    const [parsedSale, setParsedSale] = useState<AIParseResult | null>(null);
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
            setSpeechError("Votre navigateur ne supporte pas la reconnaissance vocale Web Speech API (recommandé: Chrome ou Edge sur PC/Android). Vous pouvez utiliser l'onglet Banc d'Essai ci-dessus pour tester le moteur IA.");
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
                runAIAnalysis(currentFinal);
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
    // ANALYSE IA DU TEXTE (Appel au moteur unifié)
    // -----------------------------------------------------------------------
    const runAIAnalysis = (text: string) => {
        const result = parseVoiceWithAI(text, products, clients, learnedAliases, clientHabits);
        setParsedSale(result);

        if (result.items.length > 0) {
            speakConfirmation(result.items, result.paymentType, result.clientName);
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

        // Auto-apprentissage automatique des termes employés lors de la vente confirmée
        recordVoiceFeedback(parsedSale.rawText, parsedSale.clientId, parsedSale.items);

        onDirectSaleConfirmed(parsedSale.items, parsedSale.paymentType, parsedSale.clientId);
        setIsSuccess(true);

        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleSendToCart = () => {
        if (!parsedSale || parsedSale.items.length === 0) return;

        recordVoiceFeedback(parsedSale.rawText, parsedSale.clientId, parsedSale.items);
        onApplyToCart(parsedSale.items, parsedSale.paymentType, parsedSale.clientId);
        onClose();
    };

    // Ajouter une suggestion intelligente de panier fréquent
    const handleAddSuggestion = (item: CartItem) => {
        if (!parsedSale) return;
        const updatedItems = [...parsedSale.items, item];
        const newTotal = updatedItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

        setParsedSale({
            ...parsedSale,
            items: updatedItems,
            totalAmount: newTotal,
            smartSuggestions: undefined, // Masquer après ajout
            learningInsights: [
                ...parsedSale.learningInsights,
                `Article habituel "${item.productName}" ajouté selon le profil d'achat de ${parsedSale.clientName}.`,
            ],
        });
    };

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
                maxWidth: 580,
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
                            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Reconnaissance phonétique & habitudes de caisse</p>
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

                {/* Onglets de navigation */}
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
                    {/* ONGLET 1 : MICROPHONE DIRECT */}
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
                                        L&apos;IA a mémorisé cette formulation pour vos prochaines dictées.
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
                                                Transcription entendue :
                                            </span>
                                            &ldquo;{transcript || interimTranscript}&rdquo;
                                        </div>
                                    )}

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

                    {/* ONGLET 2 : BANC D'ESSAI & SIMULATION */}
                    {activeTab === 'test' && (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                                    🧪 Tester une phrase dictée (Simulation IA)
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
                                                runAIAnalysis(customTestInput.trim());
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (customTestInput.trim()) {
                                                setTranscript(customTestInput.trim());
                                                runAIAnalysis(customTestInput.trim());
                                            }
                                        }}
                                        className="btn btn-primary"
                                        style={{ width: 'auto', padding: '10px 16px', fontSize: 13 }}
                                    >
                                        Analyser
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: 18 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                                    Scénarios de test prédéfinis :
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        { label: "1. Vente crédit classique", text: "Awa Sarr 2 baguettes de pain et 1 sachet de lait à crédit" },
                                        { label: "2. Vente cash avec grand nombre", text: "Ibrahima Ba 1 sac de riz et 2 bouteilles d huile en espèces" },
                                        { label: "3. Tolérance phonétique (Ibrahim au lieu d'Ibrahima)", text: "Ibrahim Ba 2 cafés Touba cash" },
                                        { label: "4. Surnom & marque locale (Mère Awa = Awa Sarr, Gloria = Lait)", text: "Mère Awa 2 Gloria sur le carnet" },
                                        { label: "5. Multi-articles sans nom client", text: "3 cafés Touba et 2 sucres cash" },
                                    ].map((testItem, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setCustomTestInput(testItem.text);
                                                setTranscript(testItem.text);
                                                runAIAnalysis(testItem.text);
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

                    {/* ONGLET 3 : MÉMOIRE D'AUTO-APPRENTISSAGE */}
                    {activeTab === 'learn' && (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
                                    🧠 Mémoire d&apos;Auto-Apprentissage & Habitudes Clients
                                </h4>
                                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                                    L&apos;IA retient automatiquement les surnoms de vos clients (*« Mère Awa »*, *« Tonton Ibra »*) et les marques de quartier (*« Gloria »* pour le lait, *« Tapalapa »* pour le pain).
                                    Elle analyse également les habitudes d&apos;achat pour suggérer les produits usuels.
                                </p>
                            </div>

                            {/* Habitudes clients détectées */}
                            {clientHabits.length > 0 && (
                                <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <History size={15} /> Habitudes d&apos;achat apprises par client :
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#166534' }}>
                                        {clientHabits.slice(0, 3).map((h) => {
                                            const clientName = clients.find((c) => c.id === h.clientId)?.name || 'Client';
                                            const topProds = h.frequentProducts.slice(0, 2).map((p) => {
                                                const prod = products.find((pr) => pr.id === p.productId);
                                                return `${prod?.emoji || ''} ${prod?.name || ''}`;
                                            }).join(', ');

                                            return (
                                                <div key={h.clientId} style={{ background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #DCFCE7' }}>
                                                    <strong>{clientName}</strong> : {topProds || 'Achats divers'} · <em>{h.preferredPayment === 'credit' ? 'Ardoise fréquente' : 'Paiement cash'}</em>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Formulaire pour enseigner une nouvelle expression */}
                            <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#9A3412', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={15} /> Enseigner une nouvelle règle à l&apos;IA
                                </div>

                                <div style={{ marginBottom: 8 }}>
                                    <input
                                        value={newAliasPhrase}
                                        onChange={(e) => setNewAliasPhrase(e.target.value)}
                                        placeholder="Mot prononcé (ex: Mère Fatou, Nido, Tapalapa)"
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
                                    Vocabulaire appris ({learnedAliases.length} règles) :
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

                    {/* RÉSULTAT DE L'ANALYSE IA */}
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
                                    {parsedSale.items.length > 0 ? 'Vente détectée par l\'IA !' : 'Articles non reconnus'}
                                </div>
                                <span style={{
                                    fontSize: 11,
                                    background: parsedSale.overallConfidence >= 90 ? '#DCFCE7' : '#FEF3C7',
                                    color: parsedSale.overallConfidence >= 90 ? '#15803D' : '#92400E',
                                    padding: '2px 8px',
                                    borderRadius: 8,
                                    fontWeight: 700,
                                }}>
                                    ⚡ Confiance IA : {parsedSale.overallConfidence}%
                                </span>
                            </div>

                            {/* Déductions & Insights d'apprentissage */}
                            {parsedSale.learningInsights.length > 0 && (
                                <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '8px 10px', marginBottom: 12, fontSize: 11, color: '#166534' }}>
                                    {parsedSale.learningInsights.map((insight, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                            <span>🧠</span> {insight}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {parsedSale.items.length > 0 ? (
                                <>
                                    {/* Détail client & mode */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Client détecté :</span>
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

                                    {/* Suggestions d'habitudes d'achat */}
                                    {parsedSale.smartSuggestions && parsedSale.smartSuggestions.length > 0 && (
                                        <div style={{ marginTop: 12, padding: '10px 12px', background: '#FEF3C7', borderRadius: 12, border: '1px solid #FDE68A' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>
                                                <Lightbulb size={15} /> Suggestion basée sur les habitudes :
                                            </div>
                                            {parsedSale.smartSuggestions.map((sug, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                                    <span style={{ color: '#78350F' }}>{sug.text}</span>
                                                    <button
                                                        onClick={() => handleAddSuggestion(sug.item)}
                                                        className="btn btn-sm"
                                                        style={{ background: '#D97706', color: '#fff', fontSize: 11, padding: '4px 8px' }}
                                                    >
                                                        + Ajouter
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

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
