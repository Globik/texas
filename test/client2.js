// public/client.js

const socket = new WebSocket('ws://localhost:3000');

let currentHand = [];

function allowDrop(e) {
    e.preventDefault();
}

function drag(e) {
    e.dataTransfer.setData("text", e.target.dataset.card);
}

function drop(e) {
    e.preventDefault();
    const cardJSON = e.dataTransfer.getData("text");
    const card = JSON.parse(cardJSON);

    const target = e.currentTarget;

    if (target.id === 'top-hand' && target.children.length >= 3) return alert("Максимум 3 карты в верхней!");
    if ((target.id === 'middle-hand' || target.id === 'bottom-hand') && target.children.length >= 5) return alert("Максимум 5 карт!");

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.draggable = true;
    cardDiv.ondragstart = drag;
    cardDiv.dataset.card = cardJSON;
    cardDiv.innerText = `${card.rank}${card.suit}`;
    target.appendChild(cardDiv);

    const handZone = document.getElementById('player-hand');
    for (let i = 0; i < handZone.children.length; i++) {
        const child = handZone.children[i];
        if (child.dataset.card === cardJSON) {
            handZone.removeChild(child);
            break;
        }
    }
}

socket.onopen = () => {
    console.log('Подключён к серверу');
};

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);

    if (data.type === 'full') {
        document.getElementById('status').innerText = 'Игра заполнена.';
        return;
    }

    if (data.type === 'start') {
        document.getElementById('status').innerText = 'Игра началась!';
        currentHand = data.hand;

        const handDiv = document.getElementById('player-hand');
        handDiv.innerHTML = '';

        data.hand.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.draggable = true;
            cardDiv.ondragstart = drag;
            cardDiv.dataset.card = JSON.stringify(card);
            cardDiv.innerText = `${card.rank}${card.suit}`;
            handDiv.appendChild(cardDiv);
        });
    }

    if (data.type === 'compare') {
        const score = data.score || 0;
        document.getElementById('total-score').textContent = `Общий результат: ${score}`;

        // Можно добавить детали по линиям позже
    }
};

function submitHand() {
    const top = getCardsFromZone('top-hand', 3);
    const middle = getCardsFromZone('middle-hand', 5);
    const bottom = getCardsFromZone('bottom-hand', 5);

    if (!top || !middle || !bottom) {
        document.getElementById('status').textContent = 'Заполните все руки правильно!';
        return;
    }

    const hand = { top, middle, bottom };
    socket.send(JSON.stringify({ type: 'submit_hand', hand }));
    document.getElementById('status').textContent = 'Рука отправлена!';
}

function resetHand() {
    window.location.reload();
}

function getCardsFromZone(zoneId, maxCount) {
    const zone = document.getElementById(zoneId);
    if (zone.children.length !== maxCount) return null;
    return Array.from(zone.children).map(el => JSON.parse(el.dataset.card));
}
