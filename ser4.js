const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'test')));//apple.html

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

const game = {
  players: {},
  deck: [],
  currentPlayer: null,
  phase: 'waiting', // waiting -> dealing -> placing -> discarding -> scoring
  round: 0,
  dealSequence: [5, 5, 3, 3, 3, 3,3,3,3,3],
  currentDealIndex: 0,
  cardsToPlace: 0,
  discardPhase: false
};

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return shuffle(deck);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCardValue(rank) {
  const values = { 
    '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, 
    '9':9, '10':10, 'J':11, 'Q':12, 'K':13, 'A':14 
  };
  return values[rank];
}

wss.on('connection', (ws) => {
  console.log('New connection');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch (data.action) {
      case 'join':
        handleJoin(ws, data);
        break;
      case 'placeCard':
        handlePlaceCard(ws, data);
        break;
      case 'discard':
        handleDiscard(ws, data);
        break;
      case 'ready':
        handleReady(ws);
        break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    removePlayer(ws);
  });
});

function handleJoin(ws, data) {
  if (Object.keys(game.players).length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
    return;
  }

  const playerId = `player_${Date.now()}`;
  game.players[playerId] = {
    ws,
    name: data.name || `Player ${Object.keys(game.players).length + 1}`,
    hand: [],
    board: {
      top: Array(3).fill(null),
      middle: Array(5).fill(null),
      bottom: Array(5).fill(null)
    },
    discards: [],
    ready: true,
    score: 0,
    combinations: null,
    hasFoul: false
  };

  ws.send(JSON.stringify({
    type: 'joined',
    playerId,
    gameState: getPlayerGameState(playerId)
  }));

  broadcastLobbyStatus();
}

function handleReady(ws) {
  const player = findPlayerByWS(ws);
  if (player) {
    player.ready = true;
    broadcastLobbyStatus();
    
    if (Object.values(game.players).every(p => p.ready) && 
        Object.keys(game.players).length === 2) {
      startGame();
    }
  }
}

function startGame() {
  game.phase = 'dealing';
  game.deck = createDeck();
  game.round = 0;
  game.currentDealIndex = 0;
  game.discardPhase = false;
  dealCards();
}

function dealCards() {
  if (game.currentDealIndex >= game.dealSequence.length) {
    game.phase = 'scoring';
    calculateScores();
    broadcastGameState();
    setTimeout(resetGame, 5000);
    return;
  }

  const cardsToDeal = game.dealSequence[game.currentDealIndex];
  const playerId = Object.keys(game.players)[game.round % 2];
  
  game.players[playerId].hand = game.deck.splice(0, cardsToDeal);
  game.currentPlayer = playerId;
  game.phase = 'placing';
  game.cardsToPlace = cardsToDeal;
  
  // Для раундов с 3 картами активируем фазу сброса после размещения 2 карт
  game.discardPhase = cardsToDeal === 3;
  
  broadcastGameState();
  game.currentDealIndex++;
}

function handlePlaceCard(ws, data) {
  const player = findPlayerByWS(ws);
  if (!player || game.phase !== 'placing' || game.currentPlayer !== player.id) return;

  const { cardId, row, position } = data;
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  
  if (cardIndex === -1 || player.board[row][position] !== null) return;

  player.board[row][position] = player.hand[cardIndex];
  player.hand.splice(cardIndex, 1);
  game.cardsToPlace--;

  // Проверяем, нужно ли переходить в фазу сброса
  if (game.discardPhase && game.cardsToPlace === 1) {
    game.phase = 'discarding';
    broadcastGameState();
    return;
  }

  // Если все карты размещены, переходим к следующему игроку
  if (game.cardsToPlace === 0) {
    game.round++;
    dealCards();
  } else {
    broadcastGameState();
  }
}

function handleDiscard(ws, data) {
  const player = findPlayerByWS(ws);
  if (!player || game.phase !== 'discarding' || game.currentPlayer !== player.id) return;

  const { cardId } = data;
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  
  if (cardIndex === -1) return;

  player.discards.push(player.hand[cardIndex]);
  player.hand.splice(cardIndex, 1);
  
  game.round++;
  dealCards();
}

function calculateScores() {
  Object.values(game.players).forEach(player => {
    const errors = validateRowOrder(player.board);
    player.hasFoul = errors.length > 0;
    
    if (player.hasFoul) {
      player.score = 0;
      player.foulMessage = 'Фол! Нарушена иерархия рядов';
    } else {
      player.score = evaluateBoard(player.board);
    }
    
    player.combinations = checkCombinations(player.board);
  });
}

function validateRowOrder(board) {
  const errors = [];
  const topStr = Math.max(...board.top.map(c => c ? getCardValue(c.rank) : 0));
  const midStr = Math.max(...board.middle.map(c => c ? getCardValue(c.rank) : 0));
  const botStr = Math.max(...board.bottom.map(c => c ? getCardValue(c.rank) : 0));

  if (botStr > 0 && midStr > 0 && botStr <= midStr) {
    errors.push({ row: 'bottom', message: 'Bottom must be stronger than middle' });
  }
  if (midStr > 0 && topStr > 0 && midStr <= topStr) {
    errors.push({ row: 'middle', message: 'Middle must be stronger than top' });
  }

  return errors;
}

function evaluateBoard(board) {
  let score = 0;
  const combos = checkCombinations(board);

  // Бонусы за комбинации
  if (combos.top.strength >= 1) score += combos.top.strength * 5;
  if (combos.middle.strength >= 1) score += combos.middle.strength * 10;
  if (combos.bottom.strength >= 1) score += combos.bottom.strength * 15;

  // Штраф за пустые ячейки
  const emptyCells = [...board.top, ...board.middle, ...board.bottom].filter(c => !c).length;
  score -= emptyCells * 2;

  return Math.max(0, score);
}

function checkCombinations(board) {
  const results = {
    top: { name: 'No combination', strength: 0 },
    middle: { name: 'No combination', strength: 0 },
    bottom: { name: 'No combination', strength: 0 }
  };

  // Проверка верхнего ряда (3 карты)
  if (board.top.every(c => c)) {
    const rankCounts = countRanks(board.top);
    const ranks = Object.keys(rankCounts);
    
    if (ranks.length === 1) {
      results.top = { name: 'Three of a Kind', strength: 4 };
    } 
    else if (Object.values(rankCounts).includes(2)) {
      results.top = { name: 'Pair', strength: 2 };
    }
    else {
      const high = Math.max(...board.top.map(c => getCardValue(c.rank)));
      results.top = { name: `High Card: ${high}`, strength: 1 };
    }
  }

  // Проверка среднего и нижнего рядов (5 карт)
  ;['middle', 'bottom'].forEach(row => {
    if (board[row].every(c => c)) {
      const values = board[row].map(c => getCardValue(c.rank)).sort((a,b) => a-b);
      const suits = board[row].map(c => c.suit);
      const rankCounts = countRanks(board[row]);
      const isFlush = new Set(suits).size === 1;
      const isStraight = values[4] - values[0] === 4 && new Set(values).size === 5;
      
      if (isFlush && isStraight && values[4] === 14) {
        results[row] = { name: 'Royal Flush', strength: 10 };
      }
      else if (isFlush && isStraight) {
        results[row] = { name: 'Straight Flush', strength: 9 };
      }
      else if (Object.values(rankCounts).includes(4)) {
        results[row] = { name: 'Four of a Kind', strength: 8 };
      }
      else if (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2)) {
        results[row] = { name: 'Full House', strength: 7 };
      }
      else if (isFlush) {
        results[row] = { name: 'Flush', strength: 6 };
      }
      else if (isStraight) {
        results[row] = { name: 'Straight', strength: 5 };
      }
      else if (Object.values(rankCounts).includes(3)) {
        results[row] = { name: 'Three of a Kind', strength: 4 };
      }
      else if (Object.values(rankCounts).filter(v => v === 2).length === 2) {
        results[row] = { name: 'Two Pairs', strength: 3 };
      }
      else if (Object.values(rankCounts).includes(2)) {
        results[row] = { name: 'Pair', strength: 2 };
      }
      else {
        const high = values[4];
        results[row] = { name: `High Card: ${high}`, strength: 1 };
      }
    }
  });

  return results;
}

function countRanks(cards) {
  const counts = {};
  cards.forEach(card => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  });
  return counts;
}

function resetGame() {
  Object.values(game.players).forEach(player => {
    player.hand = [];
    player.board = {
      top: Array(3).fill(null),
      middle: Array(5).fill(null),
      bottom: Array(5).fill(null)
    };
    player.discards = [];
    player.score = 0;
    player.combinations = null;
    player.hasFoul = false;
    player.ready = false;
  });

  game.phase = 'waiting';
  game.deck = [];
  game.currentPlayer = null;
  game.round = 0;
  game.currentDealIndex = 0;

  broadcastLobbyStatus();
}

function findPlayerByWS(ws) {
  const entry = Object.entries(game.players).find(([id, p]) => p.ws === ws);
  return entry ? { id: entry[0], ...entry[1] } : null;
}

function removePlayer(ws) {
  const playerId = Object.keys(game.players).find(id => game.players[id].ws === ws);
  if (playerId) {
    delete game.players[playerId];
    broadcastLobbyStatus();
  }
}

function broadcastLobbyStatus() {
  const lobbyState = {
    type: 'lobby',
    players: Object.values(game.players).map(p => ({ name: p.name, ready: p.ready })),
    canStart: Object.values(game.players).every(p => p.ready) && Object.keys(game.players).length === 2
  };

  broadcast(JSON.stringify(lobbyState));
}

function broadcastGameState() {
  Object.keys(game.players).forEach(playerId => {
    game.players[playerId].ws.send(JSON.stringify({
      type: 'gameState',
      ...getPlayerGameState(playerId)
    }));
  });
}

function getPlayerGameState(playerId) {
  const opponentId = Object.keys(game.players).find(id => id !== playerId);
  return {
    phase: game.phase,
    currentPlayer: game.currentPlayer,
    round: game.round,
    cardsToPlace: game.cardsToPlace,
    player: sanitizePlayerState(game.players[playerId], true),
    opponent: opponentId ? sanitizePlayerState(game.players[opponentId], false) : null,
    deckSize: game.deck.length,
    isDiscarding: game.phase === 'discarding'
  };
}

function sanitizePlayerState(player, isSelf) {
  return {
    id: isSelf ? player.id : null,
    name: player.name,
    hand: isSelf ? player.hand : null,
    board: player.board,
    discards: player.discards,
    score: player.score,
    combinations: player.combinations,
    hasFoul: player.hasFoul,
    ready: isSelf ? player.ready : null
  };
}

function broadcast(message) {
  Object.values(game.players).forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  });
}
