// pokerEvaluator.js

const rankValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function rankValue(rank) {
    return rankValues[rank];
}

function isFlush(cards) {
    const suits = cards.map(c => c.suit);
    return suits.every(s => s === suits[0]);
}

function isStraight(ranks) {
    ranks.sort((a, b) => a - b);

    if (ranks.join(',') === [2, 3, 4, 5, 14].join(',')) {
        return true; // A-2-3-4-5
    }

    for (let i = 1; i < ranks.length; i++) {
        if (ranks[i] !== ranks[i - 1] + 1) return false;
    }
    return true;
}

function evaluatePokerHand(cards) {
    const ranks = cards.map(c => rankValue(c.rank));
    const suits = cards.map(c => c.suit);
    const rankCount = {};
    ranks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1);

    const counts = Object.entries(rankCount).map(([rank, count]) => ({ rank: +rank, count }));
    counts.sort((a, b) => b.count * 100 + b.rank - (a.count * 100 + a.rank));

    let handStrength = 0;

    if (counts[0].count === 4) handStrength = 7; // Каре
    else if (counts[0].count === 3 && counts[1]?.count === 2) handStrength = 6; // Фул-хаус
    else if (isFlush(cards)) handStrength = 5; // Флеш
    else if (isStraight(ranks)) handStrength = 4; // Стрит
    else if (counts[0].count === 3) handStrength = 3; // Сет
    else if (counts[0].count === 2 && counts[1]?.count === 2) handStrength = 2; // Две пары
    else if (counts[0].count === 2) handStrength = 1; // Пара
    else handStrength = 0; // Старшая карта

    return { strength: handStrength, kicker: counts };
}

module.exports = { evaluatePokerHand, rankValue };
