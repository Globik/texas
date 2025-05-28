const socket = new WebSocket(`ws://${location.host}`);

let myCards = [];
let opponentId = null;
let isMyTurn = false;
let myid = null;
console.log("Подключение установлено");

socket.addEventListener('message', function(event) {
    const data = JSON.parse(event.data);
    console.log("Получено:", data);
if(data.type === 'halloserver'){
	myid = data.myid;
	yrid.textContent = myid;
}else if (data.type === 'start') {
        myCards = data.cards;
        opponentId = data.opponent;
        updateScore(data.score, data.wins);
        renderCards();

        if (opponentId === 2) {
            isMyTurn = true;
            document.getElementById('status').innerText = 'Ваш ход!';
        } else {
            isMyTurn = false;
            document.getElementById('status').innerText = 'Ход противника...';
        }
    } else if (data.type === 'play') {
		//l0ert(JSON.stringify(data.card));
        addToPot(data.card);
//alert('socket.id '+ socket.id)
        if (data.nextTurn === myid /*socket.id*/) {
            isMyTurn = true;
            document.getElementById('status').innerText = 'Ваш ход!';
        } else {
            isMyTurn = false;
            document.getElementById('status').innerText = 'Ход противника...';
        }
    } else if (data.type === 'skip') {
        if (data.both) {
            clearPot();
            document.getElementById('status').innerText = 'Стопка сгорела.';
            isMyTurn = true;
        } else {
			if(data.player === myid){
            document.getElementById('status').innerText = 'Вы пропустили. Ждем ход противника!';
            isMyTurn = false;
            }else{
				document.getElementById('status').innerText = "Противник пропустил. Ваш ход."
				isMyTurn = true;
			}
        }
    } else if (data.type === 'take') {
		//alert(data.type);
        clearPot();
        //.getElementBdocumentyId('status').innerText = 'Противник забрал стопку. Ваш ход!';
        
        if(myid === data.player){
			document.getElementById('status').innerText ="Вы забрали стопку. Ваш ход." 
			myCards = data.cards;
			isMyTurn = true;
			renderCards();
		
		}else{
			document.getElementById('status').innerText = "Противник забрал стопку. Его ход."
			isMyTurn = false;
		}
    } else if (data.type === 'win') {
        clearPot();
        document.getElementById('status').innerText = `Вы получили ${data.points} очков! Ваш ход!`;
        updateScore(data.scores[myid], data.wins);
       // alert(data.fucker);
        document.getElementById('opponent-score').innerText = data.fucker;
        isMyTurn = true;
    } else if(data.type === "updatescore"){
		//alert(data.type);
		clearPot();
		 document.getElementById('opponent-score').innerText = data.score;
	}else if (data.type === 'game-over') {
        alert(`Игра окончена! Победитель: Игрок ${data.winner}`);
        updateScore(null, data.wins);
        myCards = [];
        renderCards();
        document.getElementById('status').innerText = 'Ждём новый раунд...';
    }
});

function updateScore(myScore, wins) {
    if (myScore !== null) {
        document.getElementById('score-value').innerText = myScore;
      //  alert('wins[2]' + wins);
        const opponentScore = wins ? (myid === 1 ? wins[2] : wins[1]) : 0;
        document.getElementById('opponent-score').innerText = opponentScore;
    }
    if (wins) {
        document.getElementById('wins-1').innerText = wins[1];
        document.getElementById('wins-2').innerText = wins[2];
    }
}

function playCard(card, index) {
    if (!isMyTurn) {
       alert('Сейчас не ваш ход!');
       return;
    }
console.log("Card ", card)
    socket.send(JSON.stringify({ type: 'play', card }));
    myCards.splice(index, 1);
    renderCards();
    isMyTurn = false;
    document.getElementById('status').innerText = 'Ждём ход противника...';
}

function skipTurn() {
    if (!isMyTurn) {
        //alert('Сейчас не ваш ход!');
        return;
    }

    socket.send(JSON.stringify({ type: 'skip' }));
    isMyTurn = false;
    document.getElementById('status').innerText = 'Ждём ход противника...';
}

function renderCards() {
    const container = document.getElementById('my-cards');
    container.innerHTML = '';
    myCards.forEach((card, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerText = `${card.value}${card.suit}`;
        div.onclick = () => playCard(card, index);
        container.appendChild(div);
    });
}

function addToPot(card) {
    const pot = document.getElementById('pot');
    const div = document.createElement('div');
    div.className = 'card';
    div.innerText = `${card.value}${card.suit}`;
    pot.appendChild(div);
}

function clearPot() {
    document.getElementById('pot').innerHTML = '';
}
