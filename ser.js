const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Игровая логика
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const deck = [];

// Создаем колоду
for (let suit of suits) {
  for (let rank of ranks) {
    deck.push({ suit, rank });
  }
}

// Состояние игры
let gameState = {
  players: {},
  deck: [],
  currentPlayer: null,
  gameStarted: false,
  hands: {},
  scores: {}
};

// Перемешиваем колоду
function shuffleDeck() {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

// Раздаем карты
function dealCards() {
  gameState.deck = shuffleDeck();
  gameState.hands = {};
  
  const players = Object.keys(gameState.players);
  players.forEach(playerId => {
    gameState.hands[playerId] = {
      front: [],
      middle: [],
      back: [],
      remaining: []
    };
  });
  
  // Раздаем по 13 карт каждому игроку
  for (let i = 0; i < 13; i++) {
    players.forEach(playerId => {
      gameState.hands[playerId].remaining.push(gameState.deck.pop());
    });
  }
}

// Проверяем, все ли игроки разложили карты
function allPlayersReady() {
  const players = Object.keys(gameState.players);
  return players.every(playerId => {
    const hand = gameState.hands[playerId];
    return hand.front.length > 0 && hand.middle.length > 0 && hand.back.length > 0;
  });
}

// Подсчет очков
function calculateScores() {
  const players = Object.keys(gameState.players);
  const scores = {};
  
  // Инициализируем счет для каждого игрока
  players.forEach(playerId => {
    scores[playerId] = 0;
  });
  
  // Сравниваем комбинации между игроками
  for (let position of ['front', 'middle', 'back']) {
    const playerCombinations = {};
    
    // Получаем комбинации для текущей позиции
    players.forEach(playerId => {
      playerCombinations[playerId] = gameState.hands[playerId][position];
    });
    
    // Сравниваем каждого игрока с каждым
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const player1 = players[i];
        const player2 = players[j];
        
        const result = compareCombinations(
          playerCombinations[player1], 
          playerCombinations[player2],
          position
        );
        
        if (result === 1) {
          scores[player1] += 1;
          scores[player2] -= 1;
        } else if (result === -1) {
          scores[player1] -= 1;
          scores[player2] += 1;
        }
      }
    }
  }
  
  return scores;
}

// Сравниваем две комбинации карт
function compareCombinations(comb1, comb2, position) {
  // Упрощенная логика сравнения (в реальной игре нужно учитывать силу комбинаций)
  const strength1 = combinationStrength(comb1, position);
  const strength2 = combinationStrength(comb2, position);
  
  if (strength1 > strength2) return 1;
  if (strength1 < strength2) return -1;
  return 0;
}

// Определяем силу комбинации
function combinationStrength(combination, position) {
  // Упрощенный расчет силы комбинации
  let strength = 0;
  
  // Для фронта (3 карты) - проверяем пары, тройки и т.д.
  if (position === 'front') {
    const rankCounts = {};
    combination.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts);
    if (counts.includes(3)) strength = 30; // Тройка
    else if (counts.includes(2)) strength = 20; // Пара
    else strength = 10; // Нет комбинации
  }
  // Для середины (5 карт) - проверяем пары, стриты и т.д.
  else if (position === 'middle') {
    const rankCounts = {};
    combination.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts);
    if (counts.includes(3) && counts.includes(2)) strength = 50; // Фулл хаус
    else if (counts.includes(3)) strength = 40; // Тройка
    else if (counts.filter(c => c === 2).length === 2) strength = 30; // Две пары
    else if (counts.includes(2)) strength = 20; // Пара
    else strength = 10; // Нет комбинации
  }
  // Для бэка (5 карт) - как для середины, но с большими весами
  else if (position === 'back') {
    const rankCounts = {};
    combination.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts);
    if (counts.includes(4)) strength = 80; // Каре
    else if (counts.includes(3) && counts.includes(2)) strength = 70; // Фулл хаус
    else if (counts.includes(3)) strength = 60; // Тройка
    else if (counts.filter(c => c === 2).length === 2) strength = 50; // Две пары
    else if (counts.includes(2)) strength = 40; // Пара
    else strength = 30; // Нет комбинации
  }
  
  // Добавляем силу по старшинству карт
  const cardValues = combination.map(card => {
    const rankIndex = ranks.indexOf(card.rank);
    return rankIndex >= 0 ? rankIndex : 0;
  });
  
  strength += cardValues.reduce((sum, val) => sum + val, 0) / combination.length;
  
  return strength;
}

// Обработка подключений WebSocket
wss.on('connection', (ws) => {
  console.log('Новое подключение');
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Получено сообщение:', data);
    
    switch (data.type) {
      case 'register':
        handleRegister(ws, data);
        break;
      case 'start-game':
        handleStartGame();
        break;
      case 'arrange-cards':
        handleArrangeCards(data);
        break;
      case 'move-card':
        handleMoveCard(data);
        break;
      default:
        console.log('Неизвестный тип сообщения:', data.type);
    }
  });
  
  ws.on('close', () => {
    console.log('Подключение закрыто');
    // Удаляем игрока из игры при отключении
    for (let playerId in gameState.players) {
      if (gameState.players[playerId].ws === ws) {
        delete gameState.players[playerId];
        broadcastGameState();
        break;
      }
    }
  });
});

// Регистрация игрока
function handleRegister(ws, data) {
  const playerId = `player_${Object.keys(gameState.players).length + 1}`;
  gameState.players[playerId] = {
    ws,
    name: data.name || `Игрок ${Object.keys(gameState.players).length + 1}`,
    ready: false
  };
  
  ws.send(JSON.stringify({
    type: 'registered',
    playerId,
    players: Object.values(gameState.players).map(p => p.name)
  }));
  
  broadcastGameState();
}

// Начало игры
function handleStartGame() {
  if (Object.keys(gameState.players).length === 3) {
    gameState.gameStarted = true;
    dealCards();
    broadcastGameState();
  }
}

// Раскладка карт
function handleArrangeCards(data) {
  const { playerId, front, middle, back } = data;
  
  if (gameState.hands[playerId]) {
    gameState.hands[playerId] = {
      front,
      middle,
      back,
      remaining: []
    };
    
    if (allPlayersReady()) {
      gameState.scores = calculateScores();
      broadcastGameState();
      
      // Через 5 секунд начинаем новую раздачу
      setTimeout(() => {
        dealCards();
        broadcastGameState();
      }, 5000);
    } else {
      broadcastGameState();
    }
  }
}

// Перемещение карты между стопками
function handleMoveCard(data) {
  const { playerId, card, from, to } = data;
  
  if (gameState.hands[playerId]) {
    const hand = gameState.hands[playerId];
    
    // Удаляем карту из исходной стопки
    let cardIndex = -1;
    if (from === 'remaining') {
      cardIndex = hand.remaining.findIndex(c => 
        c.rank === card.rank && c.suit === card.suit);
      if (cardIndex !== -1) hand.remaining.splice(cardIndex, 1);
    } else {
      cardIndex = hand[from].findIndex(c => 
        c.rank === card.rank && c.suit === card.suit);
      if (cardIndex !== -1) hand[from].splice(cardIndex, 1);
    }
    
    // Добавляем карту в целевую стопку
    if (cardIndex !== -1) {
      if (to === 'remaining') {
        hand.remaining.push(card);
      } else {
        hand[to].push(card);
      }
    }
    
    broadcastGameState();
  }
}

// Рассылка состояния игры всем клиентам
function broadcastGameState() {
  const stateToSend = {
    ...gameState,
    players: Object.entries(gameState.players).reduce((acc, [id, player]) => {
      acc[id] = { name: player.name, ready: player.ready };
      return acc;
    }, {})
  };
  
  // Удаляем WebSocket объекты из рассылаемого состояния
  delete stateToSend.wss;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'game-state',
        state: stateToSend
      }));
    }
  });
}

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
