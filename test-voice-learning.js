// Script de test amélioré du moteur vocal et de l'auto-apprentissage
// L'Ardoise Digitale - PROCESSINGENIERIE

const SEED_PRODUCTS = [
    { id: 'p1', name: 'Pain Baguette (Tapalapa)', price: 200, emoji: '🥖' },
    { id: 'p2', name: 'Sachet Lait en poudre (25g)', price: 150, emoji: '🥛' },
    { id: 'p3', name: 'Café Touba (sachet)', price: 100, emoji: '☕' },
    { id: 'p4', name: 'Sucre morceaux (morso)', price: 1000, emoji: '🧂' },
    { id: 'p5', name: 'Sucre en poudre (1kg)', price: 700, emoji: '🧂' },
    { id: 'p6', name: 'Huile de table (1L)', price: 1200, emoji: '🛢️' },
    { id: 'p8', name: 'Riz brisé parfumé (sac 5kg)', price: 3500, emoji: '🌾' },
    { id: 'p11', name: 'Cube Bouillon (Maggi)', price: 50, emoji: '🧊' },
    { id: 'p14', name: 'Savon de ménage Diarama (BF)', price: 300, emoji: '🧼' },
];

const SEED_CLIENTS = [
    { id: 'c1', name: 'Awa Sarr' },
    { id: 'c2', name: 'Ibrahima Ba' },
    { id: 'c3', name: 'Mariama Diallo' },
    { id: 'c4', name: 'Ousmane Fall' },
    { id: 'c5', name: 'Fatou Ndiaye' },
];

let learnedAliases = [
    { id: 'l1', phrase: 'mere awa', type: 'client', targetId: 'c1', targetName: 'Awa Sarr' },
    { id: 'l2', phrase: 'chauffeur', type: 'client', targetId: 'c2', targetName: 'Ibrahima Ba' },
    { id: 'l3', phrase: 'gloria', type: 'product', targetId: 'p2', targetName: 'Sachet Lait en poudre' },
    { id: 'l4', phrase: 'tapalapa chaud', type: 'product', targetId: 'p1', targetName: 'Pain Baguette' },
];

function parseVoiceInput(text) {
    const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Détection du mode de paiement
    const isCreditMatch = /\b(credit|ardoise|dette|carnet|kaye|bor|noter|mettre sur)\b/i.test(clean);
    const isCashMatch = /\b(cash|espece|especes|liquide|comptant|xalis|payer)\b/i.test(clean);
    let paymentType = isCreditMatch ? 'credit' : 'cash';

    // 2. Détection du client via les alias appris
    let detectedClient = null;
    let matchedAlias = null;

    for (const alias of learnedAliases.filter((a) => a.type === 'client')) {
        const aliasNorm = alias.phrase.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (clean.includes(aliasNorm)) {
            detectedClient = SEED_CLIENTS.find((c) => c.id === alias.targetId);
            matchedAlias = alias.phrase;
            break;
        }
    }

    if (!detectedClient) {
        for (const c of SEED_CLIENTS) {
            const clientNameNorm = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const parts = clientNameNorm.split(/[\s()]+/);
            for (const part of parts) {
                if (part.length >= 3) {
                    const regex = new RegExp(`\\b${part}\\b`, 'i');
                    if (regex.test(clean)) {
                        detectedClient = c;
                        break;
                    }
                }
            }
            if (detectedClient) break;
        }
    }

    if (detectedClient && !isCashMatch) {
        paymentType = 'credit';
    }

    // 3. Détection des produits & quantités
    const detectedItems = [];
    const productKeywords = {
        p1: ['pain', 'baguette', 'baguettes', 'tapalapa', 'mburu'],
        p2: ['lait', 'meew', 'sachet de lait', 'sachets de lait', 'poudre de lait'],
        p3: ['cafe', 'cafe touba', 'touba', 'kaafe'],
        p4: ['sucre morceaux', 'morceaux de sucre', 'sucre morso', 'suuker morso'],
        p5: ['sucre', 'sucre poudre', 'suuker', 'kilo de sucre'],
        p6: ['huile 1l', 'bouteille d huile', 'bouteilles d huile', 'huile', 'diwlin'],
        p8: ['sac de riz', 'sacs de riz', 'riz parfume', 'sac 5kg', 'ceb bu neex', 'riz'],
        p11: ['cube', 'cubes', 'maggi', 'jumbo', 'bouillon'],
        p14: ['savon', 'savon diarama', 'diarama', 'bf', 'saabu'],
    };

    learnedAliases.filter((a) => a.type === 'product').forEach((alias) => {
        if (!productKeywords[alias.targetId]) productKeywords[alias.targetId] = [];
        if (!productKeywords[alias.targetId].includes(alias.phrase)) {
            productKeywords[alias.targetId].unshift(alias.phrase);
        }
    });

    const wordsToNumbers = {
        un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
        quinze: 15, vingt: 20, trente: 30,
        benn: 1, naar: 2, natt: 3, nent: 4, juroom: 5,
    };

    // Trier les produits par longueur de mots-clés décroissante pour éviter que "riz" masque "sac de riz"
    SEED_PRODUCTS.forEach((product) => {
        const keywords = productKeywords[product.id] || [product.name.toLowerCase()];
        keywords.sort((a, b) => b.length - a.length);

        let foundKeyword = null;

        for (const kw of keywords) {
            const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const kwRegex = new RegExp(`\\b${kwNorm}\\b`, 'i');
            if (kwRegex.test(clean)) {
                foundKeyword = kwNorm;
                break;
            }
        }

        if (foundKeyword) {
            let qty = 1;
            const regexBefore = new RegExp(
                `(?:(\\d+)|(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|benn|naar|natt))\\s*(?:de\\s+)?(?:sachets?|boites?|morceaux?|kilos?|sacs?|bouteilles?|baguettes?|miches?)?\\s*(?:d['\\s]|de\\s+)?${foundKeyword}`,
                'i'
            );
            const match = clean.match(regexBefore);

            if (match) {
                if (match[1]) qty = parseInt(match[1], 10);
                else if (match[2]) qty = wordsToNumbers[match[2].toLowerCase()] || 1;
            }

            detectedItems.push({
                productId: product.id,
                productName: product.name,
                emoji: product.emoji,
                unitPrice: product.price,
                quantity: Math.max(1, qty),
            });
        }
    });

    const totalAmount = detectedItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

    return {
        client: detectedClient ? detectedClient.name : 'Client de passage',
        paymentType,
        items: detectedItems,
        totalAmount,
        matchedAlias,
    };
}

console.log("==================================================================");
console.log("   TESTS AUTOMATISÉS DU MOTEUR VOCAL & AUTO-APPRENTISSAGE");
console.log("==================================================================\n");

// Test 1: Vente à crédit en français standard
console.log("--- TEST 1 : Vente crédit classique ---");
const t1 = parseVoiceInput("Awa Sarr 2 baguettes de pain et 1 sachet de lait à crédit");
console.log("Phrase : 'Awa Sarr 2 baguettes de pain et 1 sachet de lait à crédit'");
console.log("Client détecté :", t1.client);
console.log("Articles détectés :", t1.items.map(i => `${i.quantity}x ${i.productName} (${i.unitPrice * i.quantity} FCFA)`).join(' + '));
console.log("Mode :", t1.paymentType === 'credit' ? '📒 Ardoise (Crédit)' : '💵 Cash');
console.log("Total :", t1.totalAmount, "FCFA");
const pass1 = t1.client === 'Awa Sarr' && t1.paymentType === 'credit' && t1.totalAmount === 550;
console.log("Résultat :", pass1 ? '✅ SUCCÈS' : '❌ ÉCHEC');
console.log("");

// Test 2: Vente cash
console.log("--- TEST 2 : Vente cash avec grand nombre ---");
const t2 = parseVoiceInput("Ibrahima Ba 1 sac de riz et 2 bouteilles d huile en espèces");
console.log("Phrase : 'Ibrahima Ba 1 sac de riz et 2 bouteilles d huile en espèces'");
console.log("Client détecté :", t2.client);
console.log("Articles détectés :", t2.items.map(i => `${i.quantity}x ${i.productName}`).join(' + '));
console.log("Mode :", t2.paymentType === 'cash' ? '💵 Cash' : '📒 Ardoise');
console.log("Total :", t2.totalAmount, "FCFA");
const pass2 = t2.client === 'Ibrahima Ba' && t2.paymentType === 'cash' && t2.totalAmount === 5900;
console.log("Résultat :", pass2 ? '✅ SUCCÈS' : '❌ ÉCHEC');
console.log("");

// Test 3: Auto-apprentissage d'alias (Surnom client + Marque locale)
console.log("--- TEST 3 : Détection via Auto-Apprentissage initial ---");
console.log("Règles mémorisées : 'mere awa' -> Awa Sarr, 'gloria' -> Sachet Lait");
const t3 = parseVoiceInput("Mère Awa 2 Gloria sur le carnet");
console.log("Phrase : 'Mère Awa 2 Gloria sur le carnet'");
console.log("Client détecté :", t3.client);
console.log("Articles détectés :", t3.items.map(i => `${i.quantity}x ${i.productName}`).join(' + '));
console.log("Mode :", t3.paymentType === 'credit' ? '📒 Ardoise' : '💵 Cash');
console.log("Total :", t3.totalAmount, "FCFA");
console.log("Alias déclenché :", t3.matchedAlias);
const pass3 = t3.client === 'Awa Sarr' && t3.items.length === 1 && t3.items[0].quantity === 2 && t3.totalAmount === 300;
console.log("Résultat :", pass3 ? '✅ SUCCÈS' : '❌ ÉCHEC');
console.log("");

// Test 4 : Simulation d'apprentissage d'un nouveau mot inconnu
console.log("--- TEST 4 : Apprentissage dynamique en direct ---");
console.log("1. Tentative avec une expression inconnue : 'Tonton Fall 3 morceaux de savon'");
let t4_before = parseVoiceInput("Tonton Fall 3 morceaux de savon");
console.log("Avant apprentissage -> Client détecté :", t4_before.client);

console.log("2. Enseignement de la règle : 'tonton fall' -> Ousmane Fall (c4)...");
learnedAliases.push({ id: 'l_new', phrase: 'tonton fall', type: 'client', targetId: 'c4', targetName: 'Ousmane Fall' });

console.log("3. Nouvelle tentative avec la même phrase :");
let t4_after = parseVoiceInput("Tonton Fall 3 morceaux de savon sur le carnet");
console.log("Après apprentissage -> Client détecté :", t4_after.client);
console.log("Articles détectés :", t4_after.items.map(i => `${i.quantity}x ${i.productName}`).join(' + '));
const pass4 = t4_after.client === 'Ousmane Fall' && t4_after.items[0].quantity === 3;
console.log("Résultat apprentissage :", pass4 ? '✅ AUTO-APPRENTISSAGE 100% VALIDE' : '❌ ÉCHEC');
console.log("");

if (pass1 && pass2 && pass3 && pass4) {
    console.log("==================================================================");
    console.log("   TOUS LES TESTS SONT À 100% SUCCÈS ! (4/4 PASS)");
    console.log("==================================================================");
} else {
    console.log("Des tests ont échoué.");
}
