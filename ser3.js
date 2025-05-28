const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;

// Static files
app.use(express.static(path.join(__dirname, 'test')));

// HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
const game = {
  players: {},
  deck: [],
  currentPlayer: null,
  phase: 'waiting', // waiting -> dealing -> playing -> scoring
  round: 0,
  maxRounds: 4,
  cardsPerRound: [5, 3, 3, 2] // Pineapple OFC deal sequence
};

// Card utilities
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
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
  const values = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'J':11, 'Q':12, 'K':13, 'A':14 };
  return values[rank];
}

// WebSocket handlers
wss.on('connection', (ws) => {
  console.log('New connection');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);

    switch (data.action) {
      case 'join':
        handleJoin(ws, data);
        break;
      case 'placeCard':
        handlePlaceCard(ws, data);
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

// Game logic
function handleJoin(ws, data) {
  if (Object.keys(game.players).length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
    return;
  }

  const playerId = `player_${Date.now()}`;
  ws.id = playerId;
  game.players[playerId] = {
    ws,
    id: ws.id,
    name: data.name || `Player ${Object.keys(game.players).length + 1}`,
    hand: [],
    board: {
      top: Array(3).fill(null),
      middle: Array(5).fill(null),
      bottom: Array(5).fill(null)
    },
    ready: true
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
  console.log('player ', player);
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
  dealCards();
}

function dealCards() {
  if (game.round >= game.maxRounds) {
    game.phase = 'scoring';
    calculateScores();
    broadcastGameState();
    setTimeout(resetGame, 5000);
    return;
  }

  const cardsToDeal = game.cardsPerRound[game.round];
  Object.keys(game.players).forEach(playerId => {
    game.players[playerId].hand = game.deck.splice(0, cardsToDeal);
  });

  game.round++;
  game.phase = 'playing';
  game.currentPlayer = Object.keys(game.players)[0]; // First player starts

  broadcastGameState();
}

function handlePlaceCard(ws, data) {
  const player = findPlayerByWS(ws);
  if (!player || game.phase !== 'playing' || game.currentPlayer !== player.id) return;

  const { cardId, row, position } = data;
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return;

  // Validate placement
  if (row === 'top' && position >= 3) return;
  if ((row === 'middle' || row === 'bottom') && position >= 5) return;
  if (player.board[row][position] !== null) return;

  // Place card
  player.board[row][position] = player.hand[cardIndex];
  player.hand.splice(cardIndex, 1);

  // Switch player or proceed to next deal
  if (Object.values(game.players).every(p => p.hand.length === 0)) {
    dealCards();
  } else {
    game.currentPlayer = Object.keys(game.players).find(id => id !== game.currentPlayer);
    broadcastGameState();
  }
}

function calculateScores() {
  Object.values(game.players).forEach(player => {
    player.score = evaluateBoard(player.board);
  });
}

function evaluateBoard(board) {
  // Simplified scoring
  let score = 0;

  // Top: Set of 3
  if (board.top.every(c => c !== null)) {
    const ranks = board.top.map(c => c.rank);
    if (new Set(ranks).size === 1) score += 10;
  }

  // Middle: Straight/Flush
  if (board.middle.every(c => c !== null)) {
    const values = board.middle.map(c => getCardValue(c.rank)).sort((a,b) => a-b);
    if (values[4] - values[0] === 4) score += 20; // Straight
    if (new Set(board.middle.map(c => c.suit)).size === 1) score += 20; // Flush
  }

  // Bottom: Strong hand
  if (board.bottom.every(c => c !== null)) {
    const values = board.bottom.map(c => getCardValue(c.rank)).sort((a,b) => a-b);
    if (values[4] - values[0] === 4) score += 30; // Straight
    if (new Set(board.bottom.map(c => c.suit)).size === 1) score += 30; // Flush
  }

  return score;
}

// Helper functions
function findPlayerByWS(ws) {
  const entry = Object.entries(game.players).find(([id, p]) =>{ 
	  console.log('id ', id, ' game players ', p.id);
	  return p.ws === ws
	  });
	  console.log('entry ', entry[0]);
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
    player: sanitizePlayerState(game.players[playerId], true),
    opponent: opponentId ? sanitizePlayerState(game.players[opponentId], false) : null,
    deckSize: game.deck.length
  };
}

function sanitizePlayerState(player, isSelf) {
  return {
    id: isSelf ? player.id : null,
    name: player.name,
    hand: isSelf ? player.hand : null,
    board: player.board,
    score: player.score,
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

function resetGame() {
  Object.values(game.players).forEach(player => {
    player.hand = [];
    player.board = {
      top: Array(3).fill(null),
      middle: Array(5).fill(null),
      bottom: Array(5).fill(null)
    };
    player.score = null;
    player.ready = false;
  });

  game.phase = 'waiting';
  game.deck = [];
  game.currentPlayer = null;
  game.round = 0;

  broadcastLobbyStatus();
}
