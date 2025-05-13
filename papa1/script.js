const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let playerHands = { player1: [], player2: [], player3: [] };
let communityCards = [];
let currentRound = 0;

function createDeck() {
  deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  deck.sort(() => Math.random() - 0.5);
}

function dealCards() {
  for (let i = 0; i < 2; i++) {
    playerHands.player1.push(deck.pop());
    playerHands.player2.push(deck.pop());
    playerHands.player3.push(deck.pop());
  }
}

function showCards() {
  for (let i = 1; i <= 3; i++) {
    const cardsDiv = document.getElementById(`cards${i}`);
    cardsDiv.innerHTML = playerHands[`player${i}`].map(card => `${card.rank}${card.suit}`).join(' ');
  }
}

function nextRound() {
  createDeck();
  playerHands = { player1: [], player2: [], player3: [] };
  communityCards = [];

  dealCards();
  showCards();

  // Раздаём общие карты по этапам
  if (currentRound === 0) {
    // Flop
    communityCards = [deck.pop(), deck.pop(), deck.pop()];
  } else if (currentRound === 1) {
    // Turn
    communityCards.push(deck.pop());
  } else if (currentRound === 2) {
    // River
    communityCards.push(deck.pop());
  }

  const communityDiv = document.getElementById("community");
  communityDiv.innerHTML = communityCards.map(c => `${c.rank}${c.suit}`).join(' ');

  currentRound++;
  if (currentRound > 3) {
    determineWinner();
    currentRound = 0;
  }
}

function check(playerId) {
  alert(`${playerId} сделал чек`);
}

function raise(playerId) {
  const input = document.getElementById(`bet${playerId.slice(-1)}`);
  const amount = parseInt(input.value);
  if (!isNaN(amount) && amount > 0) {
    alert(`${playerId} повысил ставку на ${amount}`);
  } else {
    alert("Введите корректную сумму!");
  }
}

// Получить числовое значение ранга
function getRankValue(rank) {
  return ranks.indexOf(rank);
}

// Определение полной комбинации
function evaluateFullHand(hand, community) {
  const allCards = [...hand, ...community];
  const values = allCards.map(c => getRankValue(c.rank));
  const suits = allCards.map(c => c.suit);

  // Группируем карты по рангам
  const valueMap = {};
  for (let val of values) {
    valueMap[val] = (valueMap[val] || 0) + 1;
  }

  const sortedValues = Object.keys(valueMap).map(Number).sort((a, b) => b - a);
  const counts = sortedValues.map(v => ({ value: v, count: valueMap[v] }));

  // Проверка стрита
  function isStraight(values) {
    let unique = [...new Set(values)];
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) {
        return unique[i]; // Старшая карта стрита
      }
    }
    // A-5-4-3-2
    if (unique.includes(12) && unique.includes(0) && unique.includes(1) && unique.includes(2) && unique.includes(3)) {
      return 3;
    }
    return null;
  }

  // Проверка флеша
  function isFlush(suits) {
    const suitCounts = {};
    for (let s of suits) {
      suitCounts[s] = (suitCounts[s] || 0) + 1;
    }
    for (let suit in suitCounts) {
      if (suitCounts[suit] >= 5) {
        return true;
      }
    }
    return false;
  }

  // Флеш-рояль
  const straightHigh = isStraight(values);
  const hasFlush = isFlush(suits);
  if (straightHigh !== null && hasFlush) {
    const flushCards = allCards.filter((_, i) => suits[i] === suits[0]);
    const flushValues = flushCards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
    const flushStraight = isStraight(flushValues);
    if (flushStraight !== null) {
      if (flushStraight === 12) {
        return { score: 9, kicker: [] }; // Флеш-рояль
      } else {
        return { score: 8, kicker: [flushStraight] }; // Стрит-флеш
      }
    }
  }

  // Каре
  const four = counts.find(c => c.count === 4);
  if (four) {
    const kickers = sortedValues.filter(v => v !== four.value).slice(0, 1);
    return { score: 7, kicker: [four.value, ...kickers] };
  }

  // Фулл-хаус
  const three = counts.find(c => c.count === 3);
  const pair = counts.find(c => c.count === 2 && c.value !== three?.value);
  if (three && pair) {
    return { score: 6, kicker: [three.value, pair.value] };
  }

  // Флеш
  if (hasFlush) {
    const flushCards = allCards.filter((_, i) => suits[i] === suits[0]).map(c => getRankValue(c.rank)).sort((a, b) => b - a);
    return { score: 5, kicker: flushCards.slice(0, 5) };
  }

  // Стрит
  if (straightHigh !== null) {
    return { score: 4, kicker: [straightHigh] };
  }

  // Тройка
  if (three) {
    const kickers = sortedValues.filter(v => v !== three.value).slice(0, 2);
    return { score: 3, kicker: [three.value, ...kickers] };
  }

  // Две пары
  const pairs = counts.filter(c => c.count === 2);
  if (pairs.length >= 2) {
    const topPair = pairs[0].value;
    const secondPair = pairs[1].value;
    const kicker = sortedValues.filter(v => v !== topPair && v !== secondPair)[0];
    return { score: 2, kicker: [topPair, secondPair, kicker] };
  }

  // Пара
  if (counts.some(c => c.count === 2)) {
    const pairVal = counts.find(c => c.count === 2).value;
    const kickers = sortedValues.filter(v => v !== pairVal).slice(0, 3);
    return { score: 1, kicker: [pairVal, ...kickers] };
  }

  // Старшая карта
  return { score: 0, kicker: sortedValues.slice(0, 5) };
}

function determineWinner() {
  const scores = {
    player1: evaluateFullHand(playerHands.player1, communityCards),
    player2: evaluateFullHand(playerHands.player2, communityCards),
    player3: evaluateFullHand(playerHands.player3, communityCards)
  };

  const combinations = [
    "Старшая карта",
    "Пара",
    "Две пары",
    "Тройка",
    "Стрит",
    "Флеш",
    "Фулл-хаус",
    "Каре",
    "Стрит-флеш",
    "Флеш-рояль"
  ];

  const winner = Object.keys(scores).reduce((prev, curr) => {
    const prevScore = scores[prev].score;
    const currScore = scores[curr].score;
    if (currScore > prevScore) return curr;
    if (currScore === prevScore) {
      for (let i = 0; i < Math.min(scores[prev].kicker.length, scores[curr].kicker.length); i++) {
        if (scores[curr].kicker[i] > scores[prev].kicker[i]) return curr;
        if (scores[curr].kicker[i] < scores[prev].kicker[i]) return prev;
      }
    }
    return prev;
  });

  const comboName = combinations[scores[winner].score];
  document.getElementById("message").innerText = `Победитель: ${winner} с комбинацией "${comboName}"`;
}
