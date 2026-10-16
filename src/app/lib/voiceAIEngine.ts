// ============================================================================
// Moteur d'Auto-Apprentissage IA pour la Reconnaissance Vocale
// L'Ardoise Digitale - PROCESSINGENIERIE
// ============================================================================

import { Product, Client, CartItem, LearnedAlias } from '../data';

export interface VoiceTokenMapping {
    rawPhrase: string;
    normalizedTokens: string[];
    matchedClientId?: string;
    matchedProductIds: string[];
    confirmedCount: number;
    lastUsed: string;
}

export interface ClientHabit {
    clientId: string;
    frequentProducts: { productId: string; count: number }[];
    preferredPayment: 'cash' | 'credit';
    totalVoiceSales: number;
}

export interface AIParseResult {
    clientId?: string;
    clientName?: string;
    clientConfidence: number; // 0 à 100%
    paymentType: 'cash' | 'credit';
    paymentConfidence: number;
    items: CartItem[];
    totalAmount: number;
    rawText: string;
    overallConfidence: number; // 0 à 100%
    learningInsights: string[]; // Explications sur ce que l'IA a déduit/appris
    smartSuggestions?: {
        text: string;
        item: CartItem;
    }[];
}

// ----------------------------------------------------------------------------
// 1. UTILITAIRES PHONÉTIQUES & DISTANCE DE LEVENSHTEIN (Fuzzy Matching)
// ----------------------------------------------------------------------------
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
        .replace(/[^a-z0-9\s]/g, " ")     // Supprime ponctuation
        .replace(/\s+/g, " ")
        .trim();
}

// Distance de Levenshtein (nombre d'insertions, suppressions, substitutions)
export function levenshteinDistance(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;

    const matrix: number[][] = [];
    for (let i = 0; i <= bn; i++) matrix[i] = [i];
    for (let j = 0; j <= an; j++) matrix[0][j] = j;

    for (let i = 1; i <= bn; i++) {
        for (let j = 1; j <= an; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[bn][an];
}

// Score de similarité entre 0 et 1 (1 = identique)
export function similarityScore(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(a, b);
    return Math.max(0, 1 - dist / maxLen);
}

// ----------------------------------------------------------------------------
// 2. DICTIONNAIRES & CONVERSIONS DE NOMBRES
// ----------------------------------------------------------------------------
const WORDS_TO_NUMBERS: Record<string, number> = {
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
    onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, cinquante: 50, cent: 100,
    benn: 1, naar: 2, natt: 3, nent: 4, juroom: 5, juroom_benn: 6, fukk: 10,
};

// ----------------------------------------------------------------------------
// 3. MOTEUR PRINCIPAL D'ANALYSE IA AVEC AUTO-APPRENTISSAGE
// ----------------------------------------------------------------------------
export function parseVoiceWithAI(
    rawText: string,
    products: Product[],
    clients: Client[],
    learnedAliases: LearnedAlias[],
    clientHabits: ClientHabit[] = []
): AIParseResult {
    const clean = normalizeText(rawText);
    const tokens = clean.split(' ').filter(t => t.length > 0);
    const learningInsights: string[] = [];

    // A. DÉTECTION DU MODE DE PAIEMENT
    const isCreditMatch = /\b(credit|ardoise|dette|carnet|kaye|bor|noter|mettre sur|compte)\b/i.test(clean);
    const isCashMatch = /\b(cash|espece|especes|liquide|comptant|xalis|payer direct|payer tout de suite)\b/i.test(clean);

    let paymentType: 'cash' | 'credit' = isCreditMatch ? 'credit' : 'cash';
    let paymentConfidence = isCreditMatch || isCashMatch ? 95 : 60;

    // B. DÉTECTION DU CLIENT (Avec Auto-Apprentissage Phonétique & Alias)
    let detectedClient: Client | undefined = undefined;
    let clientConfidence = 0;
    let matchedAliasSource: string | undefined = undefined;

    // 1. Recherche par les alias appris en priorité
    for (const alias of learnedAliases.filter(a => a.type === 'client')) {
        const aliasNorm = normalizeText(alias.phrase);
        if (clean.includes(aliasNorm)) {
            const found = clients.find(c => c.id === alias.targetId);
            if (found) {
                detectedClient = found;
                clientConfidence = 98;
                matchedAliasSource = alias.phrase;
                learningInsights.push(`Client "${found.name}" reconnu grâce à l'alias appris "${alias.phrase}" (utilisé ${alias.usageCount}x).`);
                break;
            }
        }
    }

    // 2. Recherche par correspondance exacte et tolérante (Fuzzy Levenshtein)
    if (!detectedClient) {
        let bestClientScore = 0;
        let bestClient: Client | undefined = undefined;

        for (const c of clients) {
            const clientNameNorm = normalizeText(c.name);
            const clientWords = clientNameNorm.split(' ');

            // Test correspondance de sous-chaîne directe
            if (clean.includes(clientNameNorm)) {
                bestClient = c;
                bestClientScore = 1.0;
                break;
            }

            // Test de similarité mot par mot (ex: "ibrahim" vs "ibrahima")
            for (const cw of clientWords) {
                if (cw.length < 3) continue;
                for (const t of tokens) {
                    if (t.length < 3) continue;

                    // Si correspondance exacte d'un prénom ou nom
                    if (t === cw) {
                        const score = 0.92;
                        if (score > bestClientScore) {
                            bestClientScore = score;
                            bestClient = c;
                        }
                    } else {
                        // Tolérance phonétique Levenshtein
                        const sim = similarityScore(t, cw);
                        if (sim >= 0.75 && sim > bestClientScore) {
                            bestClientScore = sim;
                            bestClient = c;
                        }
                    }
                }
            }
        }

        if (bestClient && bestClientScore >= 0.75) {
            detectedClient = bestClient;
            clientConfidence = Math.round(bestClientScore * 100);
            if (bestClientScore < 0.95) {
                learningInsights.push(`Client "${bestClient.name}" reconnu par tolérance phonétique (${clientConfidence}% similarité).`);
            } else {
                learningInsights.push(`Client "${bestClient.name}" identifié dans la phrase.`);
            }
        }
    }

    // Si un client a été détecté et que la phrase n'est pas explicitement cash, par défaut c'est l'ardoise (habitude marché)
    if (detectedClient && !isCashMatch) {
        paymentType = 'credit';
        paymentConfidence = 90;
    }

    // C. DÉTECTION DES PRODUITS ET QUANTITÉS
    const detectedItems: CartItem[] = [];

    // Dictionnaire initial des mots-clés
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

    // Enrichir avec les alias appris
    learnedAliases.filter(a => a.type === 'product').forEach(alias => {
        if (!productKeywords[alias.targetId]) productKeywords[alias.targetId] = [];
        if (!productKeywords[alias.targetId].includes(alias.phrase)) {
            productKeywords[alias.targetId].unshift(alias.phrase);
        }
    });

    // Parcours de chaque produit pour détection
    products.forEach((product) => {
        const keywords = productKeywords[product.id] || [product.name.toLowerCase()];
        keywords.sort((a, b) => b.length - a.length); // Plus longs en premier

        let foundKeyword: string | null = null;
        let matchedByAlias = false;

        for (const kw of keywords) {
            const kwNorm = normalizeText(kw);
            const regex = new RegExp(`\\b${kwNorm}\\b`, 'i');

            if (regex.test(clean)) {
                foundKeyword = kwNorm;
                if (learnedAliases.some(a => a.type === 'product' && normalizeText(a.phrase) === kwNorm)) {
                    matchedByAlias = true;
                }
                break;
            }

            // Fuzzy matching phonétique si mot de 4 lettres ou plus
            if (kwNorm.length >= 4) {
                for (const t of tokens) {
                    if (t.length >= 4 && similarityScore(t, kwNorm) >= 0.82) {
                        foundKeyword = kwNorm;
                        break;
                    }
                }
                if (foundKeyword) break;
            }
        }

        if (foundKeyword) {
            // Extraction de la quantité précédant le mot
            let qty = 1;
            const regexBefore = new RegExp(
                `(?:(\\d+)|(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quinze|vingt|benn|naar|natt))\\s*(?:de\\s+)?(?:sachets?|boites?|morceaux?|kilos?|sacs?|bouteilles?|baguettes?|miches?)?\\s*(?:d['\\s]|de\\s+)?${foundKeyword}`,
                'i'
            );
            const match = clean.match(regexBefore);

            if (match) {
                if (match[1]) qty = parseInt(match[1], 10);
                else if (match[2]) qty = WORDS_TO_NUMBERS[match[2].toLowerCase()] || 1;
            }

            if (matchedByAlias) {
                learningInsights.push(`Article "${product.name}" identifié via le terme appris "${foundKeyword}".`);
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

    // D. SUGGESTIONS INTELLIGENTES BASÉES SUR LES HABITUDES DU CLIENT
    const smartSuggestions: AIParseResult['smartSuggestions'] = [];
    if (detectedClient) {
        const habit = clientHabits.find(h => h.clientId === detectedClient?.id);
        if (habit && habit.frequentProducts.length > 0) {
            // Trouver le produit le plus fréquent qui n'a pas déjà été détecté dans le panier
            const unselectedFavorite = habit.frequentProducts.find(
                fp => !detectedItems.some(it => it.productId === fp.productId)
            );
            if (unselectedFavorite) {
                const favProd = products.find(p => p.id === unselectedFavorite.productId);
                if (favProd && favProd.stock > 0) {
                    smartSuggestions.push({
                        text: `${detectedClient.name} prend souvent "${favProd.name}". Ajouter ?`,
                        item: {
                            productId: favProd.id,
                            productName: favProd.name,
                            emoji: favProd.emoji,
                            unitPrice: favProd.price,
                            cost: favProd.cost,
                            quantity: 1,
                        },
                    });
                }
            }
        }
    }

    const totalAmount = detectedItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

    // Calcul de la confiance globale
    let overallConfidence = 50;
    if (detectedItems.length > 0) overallConfidence += 30;
    if (detectedClient) overallConfidence += 15;
    if (matchedAliasSource) overallConfidence += 5;
    overallConfidence = Math.min(99, overallConfidence);

    return {
        clientId: detectedClient?.id,
        clientName: detectedClient?.name,
        clientConfidence,
        paymentType,
        paymentConfidence,
        items: detectedItems,
        totalAmount,
        rawText,
        overallConfidence,
        learningInsights,
        smartSuggestions: smartSuggestions.length > 0 ? smartSuggestions : undefined,
    };
}
