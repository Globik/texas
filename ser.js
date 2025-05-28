// server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { evaluatePokerHand } = require('./pokerEvaluator');

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let playerHands = [];

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }

    return shuffle(deck);
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function startGame() {
    const deck = createDeck();

    players.forEach((player, index) => {
        const start = index * 13;
        const hand = deck.slice(start, start + 13);

        player.send(JSON.stringify({
            type: 'start',
            hand
        }));
    });

    playerHands = [];
}

wsServer.on('connection', (socket) => {
    if (players.length >= 4) {
        socket.send(JSON.stringify({ type: 'full' }));
        socket.close();
        return;
    }

    players.push(socket);
    console.log(`Игрок подключился. Всего игроков: ${players.length}`);

    if (players.length >= 2) {
        startGame();
    }

    socket.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'submit_hand') {
                playerHands.push({
                    socket,
                    hand: data.hand
                });

                if (playerHands.length === players.length) {
                    // Сравниваем все попарно
                    for (let i = 0; i < playerHands.length; i++) {
                        for (let j = i + 1; j < playerHands.length; j++) {
                            const result = compareHands(playerHands[i].hand, playerHands[j].hand);
                            playerHands[i].socket.send(JSON.stringify({ type: 'compare', opponent: j, score: result }));
                            playerHands[j].socket.send(JSON.stringify({ type: 'compare', opponent: i, score: -result }));
                        }
                    }

                    setTimeout(() => {
                        startGame(); // Новая игра
                    }, 5000);
                }
            }
        } catch (e) {
            console.error("Ошибка парсинга сообщения:", e);
        }
    });

    socket.on('close', () => {
        players = players.filter(p => p !== socket);
        console.log("Игрок отключён");
    });
});

function compareHands(hand1, hand2) {
    let score = 0;

    const top1 = evaluatePokerHand(hand1.top);
    const top2 = evaluatePokerHand(hand2.top);
    if (top1.strength > top2.strength) score += 1;
    else if (top1.strength < top2.strength) score -= 1;

    const mid1 = evaluatePokerHand(hand1.middle);
    const mid2 = evaluatePokerHand(hand2.middle);
    if (mid1.strength > mid2.strength) score += 1;
    else if (mid1.strength < mid2.strength) score -= 1;

    const bot1 = evaluatePokerHand(hand1.bottom);
    const bot2 = evaluatePokerHand(hand2.bottom);
    if (bot1.strength > bot2.strength) score += 1;
    else if (bot1.strength < bot2.strength) score -= 1;

    // Scoop
    if (score === 3) score += 1;
    if (score === -3) score -= 1;

    // Бонусы за верхнюю руку
    if (top1.strength >= 3) score += 2;
    if (top2.strength >= 3) score -= 2;

    return score;
}

server.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});
