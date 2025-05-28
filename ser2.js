const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('test'));

let players = [];
let game = null;

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];

    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }

    return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
    switch (card.value) {
        case '6': return 0;
        case '7':
        case '8':
        case '9':
        case '10':
        case 'J':
        case 'Q': return 10;
        case 'K': return 20;
        case 'A': return 25;
    }
}

wss.on('connection', (socket) => {
    if (players.length >= 2) {
        socket.send(JSON.stringify({ type: 'info', message: 'Игра уже начата' }));
        socket.close();
        return;
    }

    players.push(socket);
    socket.id = players.length;
socket.send(JSON.stringify({type:"halloserver", myid: socket.id }))
    console.log(`Игрок ${socket.id} подключился`);

    if (players.length === 2) {
        startGame();
    }

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'play') {
                handlePlay(data.card, socket, data.opi);
            } else if (data.type === 'skip') {
                handleSkip(socket);
            }
        } catch (e) {
            console.error("Ошибка обработки сообщения", e);
        }
    });

    socket.on('close', () => {
        players = players.filter(p => p.id !== socket.id);
        console.log(`Игрок ${socket.id} отключился`);
    });
});

function startGame() {
    const deck = createDeck();

    game = {
        pot: [],
        turn: 1,
        scores: { 1: 0, 2: 0 },
        wins: { 1: 0, 2: 0 },
        lastSkipped: false,
        player1Cards: deck.slice(0, 10),
        player2Cards: deck.slice(10, 20)
    };

    players[0].send(JSON.stringify({
        type: 'start',
        cards: game.player1Cards.map(c => ({ ...c })),
        opponent: 2,
        score: game.scores[1],
        wins: game.wins[1]
    }));
    players[1].send(JSON.stringify({
        type: 'start',
        cards: game.player2Cards.map(c => ({ ...c })),
        opponent: 1,
        score: game.scores[2],
        wins: game.wins[2]
    }));

    console.log('[SERVER] Игра началась. Ход игрока:', game.turn);
}

function handlePlay(card, socket, opi) {
	console.log('card ', card);
    const opponent = players.find(p => p.id !== socket.id);
    if (!opponent) {
		console.log('no opponent return');
		return;
	}

    const isMyTurn = game.turn === socket.id;
    if (!isMyTurn) {
		console.log("!isMyTurn return");
		return;
}
    const playerKey = `player${socket.id}Cards`;
    const index = game[playerKey].findIndex(c =>
        c.suit === card.suit && c.value === card.value
    );

    if (index === -1) {
		console.log('index =-1 return',game);
		return;
}
    game[playerKey].splice(index, 1);
    game.pot.push(card);
    console.log("SOCKET ID ", socket.id, card);
 //players[0].send(JSON.stringify({
    broadcast({
        type: 'play',
        card,
        player: socket.id,
        nextTurn: game.turn === 1 ? 2 : 1
    })
    //);

    game.turn = game.turn === 1 ? 2 : 1;
    console.log(`[SERVER] Ход перешёл к игроку ${game.turn}`);

    checkEndOfRound(socket, opponent, card);
}

function handleSkip(socket) {
    const opponent = players.find(p => p.id !== socket.id);
    if (!opponent) return;

    if (game.lastSkipped) {
        game.pot = [];
        game.lastSkipped = false;
        broadcast({ type: 'skip', both: true });
        game.turn = 1;
        console.log(`[SERVER] Стопка сгорела. Новый раунд начинает игрок 1`);
    } else {
        game.lastSkipped = true;
        broadcast({ type: 'skip', player: socket.id });
        game.turn = opponent.id;
        console.log(`[SERVER] Пропуск. Ход перешёл к игроку ${game.turn}`);
    }
}

function checkEndOfRound(socket, opponent, card) {
    if (game.pot.length < 2) return;

    const lastCard = game.pot[game.pot.length - 1];
    const prevCard = game.pot[game.pot.length - 2];

    const cardValues = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const lastVal = cardValues.indexOf(lastCard.value);
    const prevVal = cardValues.indexOf(prevCard.value);

    if (lastVal > prevVal) {
        const points = game.pot.reduce((sum, c) => sum + getCardValue(c), 0);
        game.scores[socket.id] += points;
        console.log('wins ', game.wins);
       // game.wins[socket.id] = game.scores;
  socket.send(JSON.stringify({
      //  broadcast({
            type: 'win',
            player: socket.id,
            points,
            scores: game.scores,
            wins: game.wins, 
            fucker: game.scores[opponent.id]
        })
        );
totarget(opponent.id, {type:"updatescore", score: game.scores[socket.id] })
        game.pot = [];
        game.lastSkipped = false;

        if (game.scores[socket.id] >= 100) {
            game.wins[socket.id]++;
            broadcast({ type: 'game-over', winner: socket.id, wins: game.wins });
            setTimeout(startGame, 3000); // Новый раунд через 3 секунды
        } else {
            game.turn = socket.id;
            console.log(`[SERVER] Победитель ходит первым: игрок ${game.turn}`);
        }
    } else {
        const playerKey = `player${socket.id}Cards`;
        game[playerKey] = [...game[playerKey], ...game.pot];
        game.pot = [];
   //socket.send(JSON.stringify({
       broadcast({
            type: 'take',
            player: socket.id,
            cards: game[playerKey].map(c =>({...c}))
        })
        //);

        game.turn = socket.id;
        console.log(`[SERVER] Игрок ${game.turn} забрал стопку и ходит снова`);
    }
}

function broadcast( message) {
	console.log('msg ', message);
    players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify(message));
        }
    });
}
function totarget(id,message) {
    players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
            if(p.id==id)p.send(JSON.stringify(message));
        }
    });
}

server.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});
