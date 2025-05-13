const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let communityCards = [];
let playerHands = [];
let currentTurn = 0;
let pot = 0;
let bets = [0, 0, 0, 0];
let activePlayers = [true, true, true, true];
let balances = [100, 100, 100, 100];
let round = 0;

let gameMode = 'single';
let tournamentLevel = 1;
const blindsSchedule = [
  { small: 10, big: 20 },
  { small: 20, big: 40 },
  { small: 50, big: 100 },
  { small: 100, big: 200 },
];

// Позиции игроков
const positions = [
  { x: 500, y: 550 }, // Игрок 1 (внизу)
  { x: 50, y: 250 },  // Игрок 2 (слева)
  { x: 500, y: 50 },  // Игрок 3 (сверху)
  { x: 900, y: 250 }, // Игрок 4 (справа)
];

// Статистика по игрокам (для обучения ИИ)
const playerStats = {
  0: { aggression: 0, folds: 0, calls: 0, raises: 0 },
  1: { aggression: 0, folds: 0, calls: 0, raises: 0 },
  2: { aggression: 0, folds: 0, calls: 0, raises: 0 },
  3: { aggression: 0, folds: 0, calls: 0, raises: 0 }
};

// Глобальный объект для хранения графиков
const playerCharts = {};

function resizeCanvas() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * scale;
  canvas.height = window.innerHeight * 0.7 * scale;
  ctx.scale(scale, scale);
  drawTable();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createDeck() {
  deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function dealHands(players) {
  const hands = [];
  for (let i = 0; i < players; i++) {
    hands.push([deck.pop(), deck.pop()]);
  }
  return hands;
}

function drawCard(x, y, card, faceUp = true) {
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, 60, 90);
  ctx.strokeStyle = "black";
  ctx.strokeRect(x, y, 60, 90);

  if (!card || !faceUp) return;

  ctx.fillStyle = card.suit === '♥' || card.suit === '♦' ? "red" : "black";
  ctx.font = "bold 16px Arial";
  ctx.fillText(card.rank, x + 5, y + 20);
  ctx.fillText(card.suit, x + 20, y + 50);
}

function animateCardFlip(x, y, card, delay) {
  setTimeout(() => {
    let step = 0;
    const interval = setInterval(() => {
      ctx.clearRect(x, y, 60, 90);
      ctx.save();
      ctx.translate(x + 30, y + 45);
      ctx.rotate(step * Math.PI / 180);
      ctx.fillStyle = "white";
      ctx.fillRect(-30, -45, 60, 90);
      if (step >= 60) {
        clearInterval(interval);
        drawCard(x, y, card, true);
      }
      step += 10;
      ctx.restore();
    }, 30);
  }, delay);
}

function drawCommunityCards() {
	if (!communityCards) return;
  communityCards.forEach((card, i) => {
    animateCardFlip(400 + i * 70, 250, card, i * 500);
  });
}

function drawPlayers() {
  for (let i = 0; i < 4; i++) {
    const pos = positions[i];
    console.log(pos);
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`Игрок ${i + 1}`, pos.x - 20, pos.y - 60);
    ctx.fillText(`$${balances[i]}`, pos.x - 20, pos.y - 40);
    ctx.fillText(`Ставка: $${bets[i]}`, pos.x - 20, pos.y - 20);

    if (activePlayers[i]) {
		
		
		
		
	/*	
      if (i === 0 || i === 2) {
        drawCard(pos.x - 35, pos.y, playerHands[i][0], true);
        drawCard(pos.x + 35, pos.y, playerHands[i][1], true);
      } else {
        drawCard(pos.x - 35, pos.y, playerHands[i][0], false);
        drawCard(pos.x + 35, pos.y, playerHands[i][1], false);
      }
      */
      
      const hand = playerHands[i];
  if (hand && hand[0] && hand[1]) {
    drawCard(pos.x - 35, pos.y, hand[0], i === 0 || i === 2);
    drawCard(pos.x + 35, pos.y, hand[1], i === 0 || i === 2);
  } else {
    drawCard(pos.x - 35, pos.y, { suit: '?', rank: '?' }, i === 0 || i === 2);
    drawCard(pos.x + 35, pos.y, { suit: '?', rank: '?' }, i === 0 || i === 2);
  }
      
      
      
    }
  }
}

function drawTable() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayers();
  drawCommunityCards();

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Банк: $${pot}`, 450, 50);

  updateBotStats();
}

function startGame() {
  createDeck();
  communityCards = [];

  playerHands = dealHands(4);
  pot = 0;
  bets = [0, 0, 0, 0];
  activePlayers = [true, true, true, true];
  currentTurn = 0;
  round = 0;

  applyBlinds();
  drawTable();

  // Инициализируем визуализацию
  initStyleVisualization();

  setTimeout(() => {
    communityCards.push(deck.pop());
    communityCards.push(deck.pop());
    communityCards.push(deck.pop());
    round++;
    drawTable();
    simulateBots();
  }, 1000);
}

function applyBlinds() {
  const level = blindsSchedule[Math.min(tournamentLevel - 1, blindsSchedule.length - 1)];
  const sbIndex = currentTurn;
  const bbIndex = (currentTurn + 1) % 4;

  placeBet(sbIndex, level.small);
  placeBet(bbIndex, level.big);
}

function callBet(player) {
  const toCall = Math.max(...bets) - bets[player];
  if (balances[player] >= toCall) {
    balances[player] -= toCall;
    pot += toCall;
    bets[player] += toCall;
  } else {
    pot += balances[player];
    bets[player] += balances[player];
    balances[player] = 0;
  }
  drawTable();
}

function placeBet(player, amount) {
  if (balances[player] >= amount) {
    balances[player] -= amount;
    pot += amount;
    bets[player] += amount;
  }
  drawTable();
}

function foldPlayer(player) {
  activePlayers[player] = false;
  drawTable();
}

function recordPlayerAction(playerIndex, action) {
  if (!activePlayers[playerIndex]) return;

  const stats = playerStats[playerIndex];
  stats.folds += action === 'fold' ? 1 : 0;
  stats.calls += action === 'call' ? 1 : 0;
  stats.raises += action === 'raise' ? 1 : 0;
  stats.aggression = stats.raises / (stats.raises + stats.calls + stats.folds + 1);

  updateStyleVisualization();
}

function playerAction(player, action) {
  const raiseInput = document.getElementById(player === 0 ? "raiseAmount" : "raiseAmountP3");
  const amount = parseInt(raiseInput.value);

  if (!activePlayers[player]) return;

  switch (action) {
    case "check":
      callBet(player);
      recordPlayerAction(player, "call");
      break;
    case "raise":
      if (amount > 0 && balances[player] >= amount) {
        placeBet(player, amount);
        recordPlayerAction(player, "raise");
      }
      break;
    case "fold":
      foldPlayer(player);
      recordPlayerAction(player, "fold");
      break;
  }

  raiseInput.value = "";
  nextTurn();
}

function nextTurn() {
  currentTurn = (currentTurn + 1) % 4;
  if (!activePlayers[currentTurn]) {
    if (activePlayers.filter(Boolean).length === 1) {
      determineWinner();
      return;
    }
    nextTurn();
  } else {
    drawTable();
  }
}

function determineWinner() {
  let winner = -1;
  let bestScore = -1;

  for (let i = 0; i < 4; i++) {
    if (!activePlayers[i]) continue;
    const score = evaluateHand([...playerHands[i], ...communityCards]);
    if (score > bestScore) {
      bestScore = score;
      winner = i;
    }
  }

  if (winner !== -1) {
    balances[winner] += pot;
    updateLeaderboard(winner);
    document.getElementById("message").textContent = `Победитель: Игрок ${winner + 1}! Получает банк: $${pot}`;
  } else {
    document.getElementById("message").textContent = "Ничья!";
  }

  pot = 0;
  drawTable();
}

function updateLeaderboard(winnerIndex) {
  const wins = JSON.parse(localStorage.getItem('pokerWins') || '[0,0,0,0]');
  wins[winnerIndex]++;
  localStorage.setItem('pokerWins', JSON.stringify(wins));

  const lb = document.getElementById('leaderboard');
  lb.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const li = document.createElement('li');
    li.textContent = `Игрок ${i + 1}: ${wins[i]} побед`;
    lb.appendChild(li);
  }
}

function showLeaderboard() {
  updateLeaderboard(0); // обновляем без победителя
  document.getElementById("leaderboard-screen").style.display = "flex";
  document.getElementById("menu-screen").style.display = "none";
}

function backToMenu() {
  document.getElementById("leaderboard-screen").style.display = "none";
  document.getElementById("menu-screen").style.display = "flex";
}

function switchToGameScreen() {
  document.getElementById("menu-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "flex";
}

function startSinglePlayer() {
  gameMode = 'single';
  activePlayers[2] = false;
  startGame();
  switchToGameScreen();
}

function startMultiplayer() {
  gameMode = 'multi';
  activePlayers[2] = true;
  startGame();
  switchToGameScreen();
}

function startTournament() {
  gameMode = 'tournament';
  tournamentLevel = 1;
  balances = [1000, 1000, 1000, 1000];
  startGame();
  switchToGameScreen();
}

function saveGame() {
  const state = { deck, communityCards, playerHands, pot, bets, activePlayers, balances };
  localStorage.setItem("pokerGameState", JSON.stringify(state, (key, value) =>
    typeof value === "object" && value !== null ? value.map(c => c ? ({ suit: c.suit, rank: c.rank }) : null) : value
  ));
  alert("Игра сохранена!");
}

function loadGame() {
  const saved = localStorage.getItem("pokerGameState");
  if (!saved) return;

  const state = JSON.parse(saved);
  deck = state.deck;
  communityCards = state.communityCards;
  playerHands = state.playerHands;
  pot = state.pot;
  bets = state.bets;
  activePlayers = state.activePlayers;
  balances = state.balances;

  drawTable();
}

// Комбинации покера
function evaluateHand(cards) {
  const rankValues = ranks.reduce((acc, r, i) => { acc[r] = i; return acc; }, {});

  const byRank = {};
  const bySuit = {};
  for (let card of cards) {
    byRank[card.rank] = byRank[card.rank] || [];
    byRank[card.rank].push(card);
    bySuit[card.suit] = bySuit[card.suit] || [];
    bySuit[card.suit].push(card);
  }

  const rankGroups = Object.values(byRank).sort((a, b) =>
    b.length - a.length || rankValues[b[0].rank] - rankValues[a[0].rank]
  );
  const suitGroups = Object.values(bySuit);

  // Каре
  if (rankGroups[0].length === 4) {
    return 7 + kickerScore(rankGroups.slice(1));
  }

  // Фул-хаус
  if (rankGroups[0].length === 3 && rankGroups[1].length >= 2) {
    return 6 + kickerScore([rankGroups[0], rankGroups[1]]);
  }

  // Флеш
  const flushGroup = suitGroups.find(g => g.length >= 5);
  if (flushGroup) {
    const sorted = flushGroup.map(c => rankValues[c.rank]).sort((a, b) => b - a);
    return 5 + scoreKickers(sorted);
  }

  // Стрит
  const uniqueRanks = [...new Set(cards.map(c => rankValues[c.rank]))].sort((a, b) => a - b);
  for (let i = uniqueRanks.length - 1; i >= 4; i--) {
    if (
      uniqueRanks[i] - uniqueRanks[i - 4] === 4 ||
      (uniqueRanks.includes(12) && uniqueRanks.includes(0) && uniqueRanks.includes(1) && uniqueRanks.includes(2) && uniqueRanks.includes(3))
    ) {
      const straightHigh = uniqueRanks[i] === 12 && uniqueRanks.includes(3) ? 3 : uniqueRanks[i];
      if (flushGroup) return 8 + straightHigh / 100;
      else return 4 + straightHigh / 100;
    }
  }

  // Сет
  if (rankGroups[0].length === 3) {
    return 3 + kickerScore(rankGroups.slice(1));
  }

  // Две пары
  if (rankGroups[0].length === 2 && rankGroups[1].length === 2) {
    return 2 + kickerScore([...rankGroups.slice(0, 2), ...rankGroups.slice(2)]);
  }

  // Пара
  if (rankGroups[0].length === 2) {
    return 1 + kickerScore(rankGroups.slice(1));
  }

  // Старшая карта
  return kickerScore(rankGroups);
}

function kickerScore(groups) {
  let result = 0;
  for (let i = 0; i < groups.length && i < 5; i++) {
    const values = groups[i].map(c => ranks.indexOf(c.rank)).sort((a, b) => b - a);
    for (let v of values) {
      result += v / Math.pow(100, i + 1);
      if (i === 0) break;
    }
  }
  return result;
}

function scoreKickers(ranks) {
  let score = 0;
  for (let i = 0; i < ranks.length && i < 5; i++) {
    score += ranks[i] / Math.pow(100, i + 1);
  }
  return score;
}

// ИИ ботов
function simulateBots() {
  for (let i = 1; i < 4; i++) {
    if (!activePlayers[i]) continue;
    simulateAdvancedBot(i);
  }
}

function simulateAdvancedBot(player) {
  if (!activePlayers[player]) return;

  const handStrength = evaluateHand([...playerHands[player], ...communityCards]);
  const winChance = handStrength / 9;
  const currentPotOdds = pot / (Math.max(...bets) - bets[player] + 1);

  let avgAggression = 0;
  let opponentCount = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== player && activePlayers[i]) {
      avgAggression += playerStats[i].aggression;
      opponentCount++;
    }
  }
  avgAggression /= Math.max(1, opponentCount);

  let decision = "call";
  if (winChance > 0.7 || (winChance > 0.5 && avgAggression < 0.3)) {
    decision = "raise";
  } else if (winChance < 0.3 && Math.random() < 0.4) {
    decision = "fold";
  }

  if (winChance < 0.4 && avgAggression > 0.6 && Math.random() < 0.25) {
    decision = "raise"; // Блеф
  }

  executeBotAction(player, decision);
}

function executeBotAction(player, decision) {
  switch (decision) {
    case "call":
      callBet(player);
      recordPlayerAction(player, "call");
      break;
    case "raise":
      const raiseAmount = Math.min(balances[player], Math.floor(pot * 0.3));
      placeBet(player, raiseAmount);
      recordPlayerAction(player, "raise");
      break;
    case "fold":
      foldPlayer(player);
      recordPlayerAction(player, "fold");
      break;
  }

  nextTurn();
}

function updateBotStats() {
  const container = document.getElementById("bot-stats");
  container.innerHTML = "<h3>Статистика игроков:</h3>";
  for (let i = 0; i < 4; i++) {
    const s = playerStats[i];
    container.innerHTML += `
      Игрок ${i + 1} | 
      Агрессия: ${(s.aggression * 100).toFixed(1)}% |
      Фолды: ${s.folds}, Коллы: ${s.calls}, Рейзы: ${s.raises}
      <br/>
    `;
  }
}

// Визуализация стиля игры
function initStyleVisualization() {
  const container = document.getElementById("style-visualization");
  container.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "player-chart";
    const canvas = document.createElement("canvas");
    canvas.id = `chart-player-${i}`;
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    const ctx = canvas.getContext("2d");

    playerCharts[i] = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Фолд", "Колл", "Рейз"],
        datasets: [{
          label: `Игрок ${i + 1}`,
          data: [0, 0, 0],
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)"
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)"
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Игрок ${i + 1}`
          }
        }
      }
    });
  }

  updateStyleVisualization();
}

function updateStyleVisualization() {
  for (let i = 0; i < 4; i++) {
    const stats = playerStats[i];
    const total = stats.folds + stats.calls + stats.raises;

    if (total === 0) continue;

    const data = [
      ((stats.folds / total) * 100).toFixed(1),
      ((stats.calls / total) * 100).toFixed(1),
      ((stats.raises / total) * 100).toFixed(1)
    ];

    playerCharts[i].data.datasets[0].data = data.map(Number);
    playerCharts[i].update();
  }
}
