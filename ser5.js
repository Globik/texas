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
  phase: 'waiting', // waiting -> dealing -> placing -> discarding -> scoring -> fantasyDiscard
  turn: 0,
  round: 0,
  dealSequence: [5, 5, 3, 3, 3, 3,3,3,3,3],
  nextindex:[5,3,3,3,3],
  currentnextindex:0,
  currentDealIndex: 0,
  cardsToPlace: 0,
  discardPhase: false,
  fantasy: {
    activePlayer: null,
    cardsDealt: false,
    nextFantasyCandidate: null
  },
 currentPlayer: null
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
    console.log(data);
    switch (data.action) {
      case 'join':
        handleJoin(ws, data);
        break;
      case 'placeCard':
      if(game.phase==='fantasyPlacing'){
		  if(data.subtype && data.subtype ==='trueFantasy'){
		  handleFantasyPlaceCard(ws,data);
	  }else{
		  handlePlaceCard(ws, data);
	  }
	  }else{
        handlePlaceCard(ws, data);
	}
        break;
      case 'discard':
        handleDiscard(ws, data);
        break;
        case 'fantasyDiscard':
        handleFantasyDiscard(ws, data);
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
 // game.turn=0;
  game.players[playerId] = {
	  id:playerId,
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
    hasFoul: false,
    lineWins: {},
    dopochko: 0,
    foulMessage: '',
    royalties : {
	top: { amount: 0, description: '', dohodscore: 0 },
    middle: { amount: 0, description: '' , dohodscore: 0 },
    bottom: { amount: 0, description: '' , dohodscore: 0 },
    total: 0
    },
        fantasyCandidate: false
  };








  ws.send(JSON.stringify({
    type: 'joined',
    playerId,
    gameState: getPlayerGameState(playerId)
  }));

  broadcastLobbyStatus();
}
console.log('pravda 0%2 ', 0%2)
console.log('pravda  1%2 ', 1%2)
console.log('pravda  2%2 ', 2%2)
function handleReady(ws) {
	console.log('suech en player');
  const player = findPlayerByWS(ws);
  console.log('player ', player.ready)
  if (player) {
	  console.log("hier auch player ", player.ready);
    player.ready = true;
    broadcastLobbyStatus();
    console.log('must player');
    console.log('length ', Object.keys(game.players).length);
    Object.values(game.players).every(p => { console.log('nu redy', p.ready)}) 
    if (Object.values(game.players).every(p => p.ready) && 
        Object.keys(game.players).length === 2) {
			console.log('must start game');
      startGame(ws);
    }
  }
}
var k =0;
function startGame(ws) {
	console.log('startGame, suka');
  game.phase = 'dealing';
  game.deck = createDeck();
  game.round = game.turn;
  game.currentDealIndex = 0;
  game.discardPhase = false;
  dealCards(ws);
  game.currentPlayer=null;
  game.fantasy = {
    activePlayer: game.fantasy.nextFantasyCandidate,
    cardsDealt: false,
    nextFantasyCandidate: null
  };
  //const playerIds = Object.keys(game.players);
  //game.firstPlayerToken = playerIds[Math.floor(Math.random() * playerIds.length)];
  //console.log('fishka' ,game.players[game.firstPlayerToken].name);
   const playerId = Object.keys(game.players)[game.turn % 2];
   console.warn('turn ', game.turn);
  console.log('playerId ', playerId);
  const opponentid = Object.keys(game.players)[(game.turn+1) % 2];
  console.log('oppontentId ', opponentid);
  if(game.turn == 0){
//  if(k == 0){
	  broadcast(JSON.stringify({type:'fucker', fishka: opponentid}));// if turn o ; opp=1
	//  k++;
 // }
  //console.log('game.players ', game.players);
}else{
	
	//if(k==1) {
		
broadcast(JSON.stringify({type:'fucker', fishka: opponentid }));
//k=0;
//}
}
}

var u=4;
var i=0;
const suka=[5,3,3,3,3];
function dealCards(ws) {
	console.log('dealCards ',game.currentPlayer);
	game.fantasy.activePlayer=Object.keys(game.players)[1];
	console.log('id ', game.fantasy.activePlayer, ' game.fantasy.cardsDealt ',game.fantasy.cardsDealt);
	if (game.fantasy.activePlayer && !game.fantasy.cardsDealt) {
	//game.fantasy.activePlayer=Object.keys(game.players)[1];
	console.log('id ', game.fantasy.activePlayer, ' game.fantasy.cardsDealt ',game.fantasy.cardsDealt);
    const fantasyPlayer = game.players[game.fantasy.activePlayer];
    const normalPlayerId = Object.keys(game.players).find(id => id !== game.fantasy.activePlayer);
    
    // Раздача 14 карт для фантазии
    fantasyPlayer.hand = game.deck.splice(0, 14);
    fantasyPlayer.cardstodeal = 14;
    // Обычная раздача для другого игрока
    game.players[normalPlayerId].hand = game.deck.splice(0, 5);
    console.log("current PLayer ", game.currentPlayer);
    game.phase = 'fantasyPlacing';
    game.currentPlayer = game.fantasy.activePlayer;
    game.fantasy.cardsDealt = true;
    
    broadcastGameState();
    broadcast(JSON.stringify({
      type: 'fantasyStart',
      playerId: game.fantasy.activePlayer
    }));
    return;
  }
 // return;
  if (game.currentDealIndex >= game.dealSequence.length) {
    game.phase = 'scoring';
    calculateScores();
    broadcastGameState();
    setTimeout(resetGame, 5000);
    return;
  }
  
   console.log('Если у кого-то активна фантазия aktivePlayer cardsDealt ', game.fantasy.activePlayer,' ', game.fantasy.cardsDealt,' ',game.phase)
   console.warn("*** U **** ", u);
 if (game.fantasy.activePlayer && game.fantasy.cardsDealt) {
 console.log('soll normal player deal cards');
 game.phase='fantasyPlacing';
 if(game.phase=='fantasyPlacing'){
	 console.warn('soll phase fantasyPlacing');
    const fantasyPlayer = game.players[game.fantasy.activePlayer];
    
    // Игрок с фантазией получает 14 карт
    //fantasyPlayer.hand = game.deck.splice(0, 14);
    //game.phase = 'fantasyDiscard';
   // game.currentPlayer = game.fantasy.activePlayer;
    //game.fantasy.cardsDealt = true;
    
    // Обычный игрок получает стандартные 5 карт
    const normalPlayerId = Object.keys(game.players).find(id => id !== game.fantasy.activePlayer);
    game.players[normalPlayerId].hand = game.deck.splice(0, u);
    game.discardPhase = u === 3;
    if(game.discardPhase){
		console.warn("DISCARDING NORMAL ");
		//game.phase='discarding';
	}
	console.log("***** I and suka.length", i,' ', suka.length);
    if(i==suka.length-1){
		console.warn('i=',i);
		
	}
	console.log("************* hand length", game.players[normalPlayerId].hand);
	if(game.players[normalPlayerId].hand.length==0){
		checkFantasyCompletion();
		}
		    broadcastGameState();
    return;
  }
  return
}
  console.log('Стандартная логика раздачи...')
  console.log('Если у кого-то активна фантазия aktivePlayer cardsDealt ', game.fantasy.activePlayer,' ', game.fantasy.cardsDealt,' ',game.phase)
  const cardsToDeal = game.dealSequence[game.currentDealIndex];
  /*if(game.currentDealIndex ===0){
	  game.currentPlayer = getPlayerWithoutToken();
  }else{
	  const playerIds = Object.keys(game.players);
	  game.currentPlayer = playerIds[game.round % 2];
  }*/
  const playerId = Object.keys(game.players)[game.round % 2];
  console.log('playerId ', playerId);
  const opponentid = Object.keys(game.players)[1];
  /*
  if(game.turn == 0){
 // if(k == 0){
	  broadcast(JSON.stringify({type:'fucker', fishka: opponentid}));
	 // k++;
  //}
  //console.log('game.players ', game.players);
}else{
	 broadcast(JSON.stringify({type:'fucker', fishka: playerId }));
}
*/ 
  game.players[playerId].hand = game.deck.splice(0, cardsToDeal);
  game.currentPlayer = playerId;
  game.phase = 'placing';
  game.cardsToPlace = cardsToDeal;
  game.discardPhase = cardsToDeal === 3;
  
  broadcastGameState();
  
  game.currentDealIndex++;
}

function getPlayerWithoutToken(){
	const playerIds = Object.keys(game.players);
	return playerIds.find(id => id !== game.firstPlayerToken);
}

function passFirstPlayerToken(){
	const playerIds = Object.keys(game.players);
	game.firstPlayerToken = playerIds.find(id => id !== game.firstPlayerToken);
	console.log('fishka u ', game.players[game.firstPlayerToken].name);
}

function checkFantasy(player) {
	return true;
  if (player.hasFoul) return false;
  
  const topRow = player.board.top;
  if (!topRow.every(c => c)) return false;
  
  const rankCounts = countRanks(topRow);
  const hasPair = Object.values(rankCounts).includes(2);
  
  if (hasPair) {
    const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
    return getCardValue(pairRank) >= getCardValue('Q'); // Дама или выше
  }
  
  return false;
}
function checkFantasyRepeat(player) {
	return true;
  if (player.hasFoul) return false;

  // Проверка верхнего ряда (сет)
  const topRow = player.board.top;
  if (topRow.every(c => c)) {
    const rankCounts = countRanks(topRow);
    if (Object.values(rankCounts).includes(3)) return true;
  }

  // Проверка нижнего ряда
  const bottomRow = player.board.bottom;
  if (bottomRow.every(c => c)) {
    const values = bottomRow.map(c => getCardValue(c.rank));
    const suits = bottomRow.map(c => c.suit);
    const rankCounts = countRanks(bottomRow);
    
    return isFourOfAKind(rankCounts) || 
           isStraightFlush(values, suits) || 
           isRoyalFlush(values, suits);
  }

  return false;
}
//var u=4;
//var i=0;
function handlePlaceCard(ws, data) {
  const player = findPlayerByWS(ws);
  console.warn("**** game.phase ********** ", game.phase);
  game.phase='fantasyPlacing'
  if(game.phase=='fantasyPlacing'){
	  /*
	   console.warn('Проверяем, нужно ли переходить в фазу сброса');
 if (game.discardPhase && game.cardsToPlace === 2) {
    game.phase = 'discarding';
    broadcastGameState();
    return;
  }*/
	  console.log('is current Player? ',game.currentPlayer !== player.id);
	  const normalPlayerId=Object.keys(game.players).find(id=> id!==game.fantasy.activePlayer);
	  const normalPlayer=game.players[normalPlayerId]
	  console.log('activePlayer == player id ', game.fantasy.activePlayer,' ',normalPlayerId, ' player.id ', player.id);
	  const { cardId, row, position } = data;
	  console.log('cardId, row, position ',cardId,' ',row,' ',position);
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  
  if (cardIndex === -1 || player.board[row][position] !== null){
	  console.error('cardIndex=-1 or player.board[row][position] !== null');
	   return;}

  player.board[row][position] = player.hand[cardIndex];
  player.hand.splice(cardIndex, 1);
  var nextindex=game.nextindex[game.currentnextindex];//5
  
  //const suka=[5,3,3,3,3];
  var luka=suka[i]
  game.cardsToPlace=nextindex;//]game.nextindex[game.currentnextindex];
  game.cardsToPlace=u;
  u--;
 
  nextindex++;
   console.warn('Проверяем, нужно ли переходить в фазу сброса');
  if (game.discardPhase && game.cardsToPlace === 2) {
	  i++;
	  u=suka[i];
    game.phase = 'discarding';
    broadcastGameState();
    //game.phase='fantasyPlacing'
    return;
  }
  console.log('game.cardsToPlace-- ', game.cardsToPlace, ' ',nextindex);
  if (game.cardsToPlace === 0) {
	  console.log('game.cardsToPlace=0');
	  i++;
	  u=suka[i];
	  game.fantasy.cardsDealt = true;
	  console.warn("u ", u, ' i ', i);
	  dealCards();
	  checkFantasyCompletion();
  }
   broadcastGameState();
   return;
  }
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
var l=14;
function handleFantasyPlaceCard(ws, data){
	console.warn("handleFantasyPlaceCard");
	const player = findPlayerByWS(ws);
	if(!player || game.phase !== 'fantasyPlacing') {
		console.error('somthing wrong');
		return;
	}
	const { cardId, row, position } = data;
	const cardIndex=player.hand.findIndex(c=> c.id === cardId);
	if(cardIndex===-1 || player.board[row][position !==null]){
		console.error('no index');
		 return;
	 }
	player.board[row][position]=player.hand[cardIndex];
	player.hand.splice(cardIndex, 1);
	console.warn("cardstodeal ", l);

		
		if(l==2){
			console.log('ura cardstodeal ', l);
			game.phase='fantasyFinalDiscard';
			game.currentPlayer=game.fantasy.activePlayer;
		//	broadcastGameState();
		//l=0;
		}
	l--;
	broadcastGameState();
}
function handleDiscard(ws, data) {
	console.warn('handle discard');
  const player = findPlayerByWS(ws);
  if (!player || game.phase !== 'discarding'/* || game.currentPlayer !== player.id*/){
	  console.error(game.currentPlayer ,'!== ',player.id , " **** HANDLEDISCARD***",);
	   return;
}
console.warn("HALI HALLO")
  const { cardId } = data;
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  
  if (cardIndex === -1) {
	  console.error('cardIndex=-1');
	  return;
  }

  player.discards.push(player.hand[cardIndex]);
  player.hand.splice(cardIndex, 1);
    game.round++;
   if(player.hand.length==0){
		//checkFantasyCompletion();
	}
	//}else{
  dealCards();
//}
  //checkFantasyCompletion();
}
function handleFantasyDiscard(ws, data) {
	 const player = findPlayerByWS(ws);
  if (!player || game.phase !== 'fantasyFinalDiscard' /*|| game.currentPlayer !== player.id*/) {
	  console.error('wrong');
	  console.log('hier player ', player);
	  return;
}
  const { cardId } = data;
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  
  if (cardIndex === -1) {
	  console.error('no index');
	  return;
}
  player.discards.push(player.hand[cardIndex]);
  player.hand.splice(cardIndex, 1);
  
  // Переход к обычной игре
  
  game.phase = 'fantasyPlacing';
  game.currentPlayer = Object.keys(game.players)[0];
  //game.fantasy.cardsDealt = false;
  //game.cardsToPlace = 13; // 14 - 1 сброшенная
  
  broadcastGameState();
	checkFantasyCompletion();
}
function checkFantasyCompletion(){
	const fantasyPlayer=game.players[game.fantasy.activePlayer];
	const normalPlayerId=Object.keys(game.players).find(id=> id !== game.fantasy.activePlayer);
	const normalPlayer=game.players[normalPlayerId];
	const fantasyFinished = l ===1;
	const normalFinished=!normalPlayer.hand || normalPlayer.hand.length===0;
	console.log("**** L ****",l);
	console.log('fantasyFinished && normalFinished ', fantasyFinished , normalFinished);
	if(fantasyFinished && normalFinished){
		game.phase='scoring';
		calculateScores();
		broadcastGameState();
		//game.phase='fantasyPlacing'
		setTimeout(resetGame,5000);
	}else{
		//game.phase='fantasyPlacing'
	}
}

function validateRowOrder(board) {
 
  
  const errors = [];
  const topStr = getRowAbsoluteStrength(board.top);//Math.max(...board.top.map(c => c ? getCardValue(c.rank) : 0));
  const midStr = getRowAbsoluteStrength(board.middle);//Math.max(...board.middle.map(c => c ? getCardValue(c.rank) : 0));
  const botStr = getRowAbsoluteStrength(board.bottom);//Math.max(...board.bottom.map(c => c ? getCardValue(c.rank) : 0));
console.log(`Row strhengths - Top: ${topStr}, Middle: ${midStr}, Bottom: ${botStr}`)
  if (botStr > 0 && midStr > 0 && botStr <= midStr) {
	  console.log('Bottom must be stronger than middle', JSON.stringify(board));
    errors.push({ row: 'bottom', message: 'Bottom must be stronger than middle' });
  }
  if (midStr > 0 && topStr > 0 && midStr <= topStr) {
	  console.log('Middle must be stronger than top');
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
		const rankName = getRankName(ranks[0]);
      results.top = { name: 'Three of a Kind '+rankName, strength: 4 };
    } 
    else if (Object.values(rankCounts).includes(2)) {
		const pairRank = ranks.find(r=> rankCounts[r]===2);
		const kicker = ranks.find(r=> rankCounts[r]===1);
		const rankName  = getRankName(pairRank);
		const kickerName = getRankName(kicker);
      results.top = { name: 'Pair '+rankName, strength: 2 };
    }
    else {
      const high = Math.max(...board.top.map(c => getCardValue(c.rank)));
      const sorted = board.top.map(c => getCardValue(c.rank)).sort((a,b) => b-a);
      const highCard = getRankName(board.top.find(c => getCardValue(c.rank) === sorted[0]).rank);
      results.top = { name: `High Card: ${highCard}`, strength: 1 };
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
		   const highCard = getRankName(board[row].find(c => getCardValue(c.rank) === values[4]).rank);
        results[row] = { name: 'Straight Flush '+ highCard, strength: 9 };
      }
      else if (Object.values(rankCounts).includes(4)) {
		  const fourRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
      const kicker = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
        results[row] = { name: `Four of a Kind ${getRankName(fourRank)}`, strength: 8 };
      }
      else if (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2)) {
		  const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
      const twoRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        results[row] = { name: `Full House ${getRankName(threeRank)} `, strength: 7 };
      }
      else if (isFlush) {
		  const highCard = getRankName(board[row].find(c => getCardValue(c.rank) === Math.max(...values)).rank);
        results[row] = { name: 'Flush '+ highCard, strength: 6 };
      }
      else if (isStraight) {
		  const highCard = getRankName(board[row].find(c => getCardValue(c.rank) === values[4]).rank);
        results[row] = { name: 'Straight '+ highCard, strength: 5 };
      }
      else if (Object.values(rankCounts).includes(3)) {
		  const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
      const kickers = Object.keys(rankCounts).filter(r => rankCounts[r] === 1);
        results[row] = { name: `Three of a Kind ${getRankName(threeRank)}`, strength: 4 };
      }
      else if (Object.values(rankCounts).filter(v => v === 2).length === 2) {
		  const pairs = Object.keys(rankCounts).filter(r => rankCounts[r] === 2);
      const kicker = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
      const pairNames = pairs.map(getRankName).join(' и ');
        results[row] = { name: `Two Pairs ${pairNames} `, strength: 3 };
      }
      else if (Object.values(rankCounts).includes(2)) {
		   const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
      const kickers = Object.keys(rankCounts).filter(r => rankCounts[r] === 1);
        results[row] = { name: `Pair ${getRankName(pairRank)} `, strength: 2 };
      }
      else {
        const high = values[4];
        const highCard = getRankName(board[row].find(c => getCardValue(c.rank) === Math.max(...values)).rank);
        results[row] = { name: `High Card: ${highCard}`, strength: 1 };
      }
    }
  });

  return results;
}
function getRankName(rank) {
  const names = {
    '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9',
    '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };
  return names[rank] || rank;
}
function countRanks(cards) {
  const counts = {};
  cards.forEach(card => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  });
  return counts;
}

function resetGame() {
	console.log('resetGame');
  Object.values(game.players).forEach(player => {
    player.hand = [];
    player.board = {
      top: Array(3).fill(null),
      middle: Array(5).fill(null),
      bottom: Array(5).fill(null)
    };
    player.discards = [];
    player.score = 0;
    //player.ochko = 0;
    player.dopochko = 0;
    player.lineWins = {};
    player.royalties = {top:{amount:0, description:'',dohodscore:0},middle:{amount:0, description:'',dohodscore:0}, bottom:{amount:0, description:'',dohodscore:0}};
    player.combinations = null;
    player.hasFoul = false;
    player.ready = true;
    player.foulMessage = '';
  });

  game.phase = 'waiting';
  game.deck = [];
  game.currentPlayer = null;
  game.turn =(game.turn == 0?1:0)
  game.round = 0;
  game.currentDealIndex = 0;
  game.fantasy.cardsDealt = false;

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
    isDiscarding: game.phase === 'discarding',
    isFantasyPlacing:game.phase==='fantasyPlacing',
    isFantasyFinalDiscard:game.phase==='fantasyFinalDiscard',
    isTrueFantasyPlayer:game.phase==='trueFantasy'
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
    ready: isSelf ? player.ready : null,
    lineWins: player.lineWins,
   // ochko: player.ochko,
    dopochko: player.dopochko,
    royalties:player.royalties,
    foulMessage: player.foulMessage
  };
}

function broadcast(message) {
  Object.values(game.players).forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  });
}

/* UPDATED */

 
function calculateScores() {

  const players = Object.values(game.players);
  
  const [player1, player2] = players;
console.log("***** PLAYERS ****** ", player1, player2);
  // Сбрасываем очки перед расчетом
  players.forEach(p => {
    p.score = 0;
    //p.ochko = 0;
    p.lineWins = { top: {iswin: false, ochko: 0}, middle: {iswin: false, ochko: 0}, bottom: {iswin: false, ochko: 0} };
    p.royalties = {
	top: { amount: 0, description: '', dohodscore: 0 },
    middle: { amount: 0, description: '' , dohodscore: 0 },
    bottom: { amount: 0, description: '' , dohodscore: 0 },
    total: 0
	},
	 p.fantasyCandidate = false;
  });
   [player1, player2].forEach(player => {
    if (!player.hasFoul) {
      player.fantasyCandidate = checkFantasy(player);
      console.log("player.fantasyCandidate ", player.fantasyCandidate);
      game.fantasy.activePlayer = player.id;
    }
  });

  // Проверяем фолы (нарушение иерархии рядов)
  players.forEach(player => {
   /* const errors = validateRowOrder(player.board);
    player.hasFoul = errors.length > 0;
    if (player.hasFoul) {
      player.foulMessage = 'Фол! Нарушена иерархия рядов';
    }*/
  });
   [player1, player2].forEach(player => {
    if (!player.hasFoul) {
      // Проверка верхнего ряда (сет)
      const topRow = player.board.top;
      if (topRow.every(c => c)) {
        const rankCounts = countRanks(topRow);
        if (Object.values(rankCounts).includes(3)) { // Сет
          game.fantasy.activePlayer = player.id;
        }
      }
      
      // Проверка нижнего ряда
      const bottomRow = player.board.bottom;
      if (bottomRow.every(c => c)) {
        const values = bottomRow.map(c => getCardValue(c.rank));
        const suits = bottomRow.map(c => c.suit);
        const rankCounts = countRanks(bottomRow);
        
        if (isFourOfAKind(rankCounts) || 
            isStraightFlush(values, suits) || 
            isRoyalFlush(values, suits)) {
          game.fantasy.activePlayer = player.id;
        }
      }
    }
  });
  /*
if(player1.hasFoul == true && player2.hasFoul == true){
	console.log(player1.hasFoul,'==',player2.hasFoul);
	return;
}*/
  // Если у одного игрока фол, другой автоматически побеждает
  if (player1.hasFoul !== player2.hasFoul) {
     const winner = player1.hasFoul ? player2 : player1;
     const loser = player1.hasFoul ? player1 : player2;
    //winner.score = 6; // 3 линии × 2 способа подсчета
  loser.lineWins = { top: { iswin: false, ochko: -1 }, middle: { iswin: false, ochko: -1 }, bottom: { iswin: false, ochko: -1 } };
  winner.lineWins = { top: { iswin: true, ochko: 1 }, middle: { iswin: true, ochko: 1 }, bottom: { iswin: true, ochko: 1 } };
  winner.dopochko = 3;
  loser.dopochko = -3;
  winner.score = 6;
  loser.score = -6;
  
  players.forEach(player => {
    if (!player.hasFoul) {
	 player.royalties = calculateRoyalties(player.board);
  }});
  if(winner.royalties.top.amount > 0){
	loser.royalties.top.dohodscore =  - winner.royalties.top.amount; 
	winner.royalties.top.dohodscore = winner.royalties.top.amount - 0;
	loser.score += loser.royalties.top.dohodscore;
	winner.score += winner.royalties.top.dohodscore;
}

if(winner.royalties.middle.amount > 0){
	loser.royalties.middle.dohodscore = loser.royalties.middle.amount - winner.royalties.middle.amount; 
	winner.royalties.middle.dohodscore = winner.royalties.middle.amount - loser.royalties.middle.amount;
	loser.score += loser.royalties.middle.dohodscore;
	winner.score += winner.royalties.middle.dohodscore;
}

  
if(winner.royalties.bottom.amount > 0){
	loser.royalties.bottom.dohodscore = loser.royalties.bottom.amount - winner.royalties.bottom.amount; 
	winner.royalties.bottom.dohodscore = winner.royalties.bottom.amount - loser.royalties.bottom.amount;
	loser.score += loser.royalties.bottom.dohodscore;
	winner.score += winner.royalties.bottom.dohodscore;
}
players.forEach(player => {
    player.combinations = checkCombinations(player.board);
  });
if (!winner.hasFoul && checkFantasyRepeat(winner)) {
      game.fantasy.nextFantasyCandidate = winner.id;
    }

  return;
  }

  // 1. Подсчет очков за линии (победа в ряду = 1 очко)
  compareLines('top');
  compareLines('middle');
  compareLines('bottom');

  // 2. Бонус за победу во всех трех линиях (+3 очка)
  
  players.forEach(player => {
    if (player.lineWins.top.iswin && player.lineWins.middle.iswin && player.lineWins.bottom.iswin) {
     // player.score += 3;//13+3+3=19
     // player.dopochko = "+3";
      const opponent = player === player1 ? player2 : player1;
      const you = player === player2 ? player1 : player2;
     opponent.dopochko = "-3";
     player.dopochko = "+3";
     //opponent.score = Math.max(0, opponent.score - 3);//-16=math.max(0,-16-3
     
     opponent.score -= 3;
     player.score+=3;
     console.error('opponent.score ', opponent.score);
    }
    if (!player.lineWins.top.iswin && !player.lineWins.middle.iswin && !player.lineWins.bottom.iswin){
		if(player.lineWins.top.ochko === '-1' /*|| player.lineWins.top.ochko !='-1' */ && 
    player.lineWins.middle.ochko === '-1' /*|| player.lineWins.middle.ochko !='-1'*/  && 
    player.lineWins.bottom.ochko === '-1' /*|| player.lineWins.bottom.ochko !='-1' */) {
		 const opponent = player === player1 ? player2 : player1;
     //opponent.dopochko = "-3";
    // opponent.score -= 3;
     console.error('*********** GENAU **** opponent.score2 ', opponent.score);
	}
}
  });

  // 3. Бонусы за комбинации (роялти)
  players.forEach(player => {
    if (!player.hasFoul) {
	 player.royalties = calculateRoyalties(player.board);
     // player.score += player.royalties.total;
      //const opponent = player === player1 ? player2 : player1;
  }});
  /*
  -1 1 -1  1 -1 1
  0-4=-4 4-0=4
  -1-4=-5 1+4=5
  4-12=-8 12-4=8
  -1+(-8)=-9 1_+ 8=9
  */
 // if(!player2.hasFoul || !player1.hasFoul)
if(player2.royalties.top.amount > player1.royalties.top.amount){
	// 4-12=-8
	player1.royalties.top.dohodscore = player1.royalties.top.amount - player2.royalties.top.amount; 
	player2.royalties.top.dohodscore = player2.royalties.top.amount - player1.royalties.top.amount;
	player1.score += player1.royalties.top.dohodscore;
	player2.score += player2.royalties.top.dohodscore;
}
else{
//if(player1.royalties.top.amount > 0){
	player2.royalties.top.dohodscore = player2.royalties.top.amount - player1.royalties.top.amount; 
	player1.royalties.top.dohodscore = player1.royalties.top.amount - player2.royalties.top.amount; 
	player2.score += player2.royalties.top.dohodscore;
	player1.score += player1.royalties.top.dohodscore;
}
  
if(player2.royalties.middle.amount > player1.royalties.middle.amount){
	player1.royalties.middle.dohodscore = player1.royalties.middle.amount - player2.royalties.middle.amount; 
	player2.royalties.middle.dohodscore = player2.royalties.middle.amount - player1.royalties.middle.amount;
	player1.score += player1.royalties.middle.dohodscore;
	player2.score += player2.royalties.middle.dohodscore;
}else{

//if(player1.royalties.middle.amount > 0){
	player2.royalties.middle.dohodscore = player2.royalties.middle.amount - player1.royalties.middle.amount; //0-12=-12
	player1.royalties.middle.dohodscore = player1.royalties.middle.amount - player2.royalties.middle.amount; 
	player2.score += player2.royalties.middle.dohodscore;// -12
	player1.score += player1.royalties.middle.dohodscore;
}

 // if pl2.r.middle==0 p 
if(player2.royalties.bottom.amount > player1.royalties.bottom.amount){
	player1.royalties.bottom.dohodscore = player1.royalties.bottom.amount - player2.royalties.bottom.amount; 
	player2.royalties.bottom.dohodscore = player2.royalties.bottom.amount - player1.royalties.bottom.amount;
	player1.score += player1.royalties.bottom.dohodscore;
	player2.score += player2.royalties.bottom.dohodscore;
}else{

//if(player1.royalties.bottom.amount > 0){
	player2.royalties.bottom.dohodscore = player2.royalties.bottom.amount - player1.royalties.bottom.amount; 
	player1.royalties.bottom.dohodscore = player1.royalties.bottom.amount - player2.royalties.bottom.amount; 
	player2.score += player2.royalties.bottom.dohodscore;
	player1.score += player1.royalties.bottom.dohodscore;
}

  // Обновляем комбинации для отображения
  players.forEach(player => {
    player.combinations = checkCombinations(player.board);
  });
 [player1, player2].forEach(player => {
    if (player.fantasyCandidate /*|| (!player.hasFoul && checkFantasyRepeat(player))*/) {
      game.fantasy.nextFantasyCandidate = player.id;
    }
  });
}

function compareLines(line) {
	console.log('line ', line);
  const [player1, player2] = Object.values(game.players);
  
  const p1Strength = getRowAbsoluteStrength(player1.board[line]);
  const p2Strength = getRowAbsoluteStrength(player2.board[line]);
 console.log('p1Strength  p2Strength ',p1Strength , p2Strength);
  if (p1Strength > p2Strength) {
	  console.log('p1Strength > p2Strength ',p1Strength , p2Strength);
    player1.score += 1;
    player2.score -= 1;
    console.log('player1.lineWins ', player1.lineWins);
    console.log('player1.lineWins ', player1.lineWins[line]);
    player1.lineWins[line].ochko = 1;
    player2.lineWins[line].ochko = '-1';
    player1.lineWins[line].iswin = true;
  } else if (p2Strength > p1Strength) {
	  console.log('p2Strength > p1Strength ', p2Strength , p1Strength);
	  console.log('player2.lineWins ', player2.lineWins);
    console.log('player2.lineWins ', player2.lineWins[line]);
    player2.score += 1;
    player1.score -= 1;
    player2.lineWins[line].ochko = 1;
    player1.lineWins[line].ochko = '-1';
    player2.lineWins[line].iswin = true;
     
  }
  // При равенстве очков никто не получает очков за линию
}

function calculateRoyalties(board) {
  const royalties = {
    top: { amount: 0, description: '' },
    middle: { amount: 0, description: '' },
    bottom: { amount: 0, description: '' },
    total: 0
  };

  // Верхний ряд (3 карты)
  if (board.top.every(c => c)) {
    const rankCounts = countRanks(board.top);
    const ranks = Object.keys(rankCounts);
    
    if (ranks.length === 1) { // Сет
      const rankValue = getCardValue(ranks[0]);
      const bonus = 10 + rankValue;
      royalties.top.amount = bonus;
      royalties.top.description = `Set ${ranks[0]} = ${bonus}`;
    } 
    else if (Object.values(rankCounts).includes(2)) { // Пара
      const pairRank = ranks.find(r => rankCounts[r] === 2);
      const rankValue = getCardValue(pairRank);
      const bonus = Math.max(0, rankValue - 5);
      if (bonus > 0) {
        royalties.top.amount = bonus;
        royalties.top.description = `Pair ${pairRank} = ${bonus}`;
      }
    }
  }

  // Средний ряд (5 карт)
  if (board.middle.every(c => c)) {
    const values = board.middle.map(c => getCardValue(c.rank));
    const suits = board.middle.map(c => c.suit);
    const rankCounts = countRanks(board.middle);
    
    if (isRoyalFlush(values, suits)) {
      royalties.middle.amount = 50;
      royalties.middle.description = 'Royal Flush = 50';
    }
    else if (isStraightFlush(values, suits)) {
      royalties.middle.amount = 30;
      royalties.middle.description = 'Straight Flush = 30';
    }
    else if (isFourOfAKind(rankCounts)) {
      royalties.middle.amount = 20;
      royalties.middle.description = 'Four of a Kind = 20';
    }
    else if (isFullHouse(rankCounts)) {
      royalties.middle.amount = 12;
      royalties.middle.description = 'Full House = 12';
    }
    else if (isFlush(suits)) {
      royalties.middle.amount = 8;
      royalties.middle.description = 'Flush = 8';
    }
    else if (isStraight(values)) {
      royalties.middle.amount = 4;
      royalties.middle.description = 'Straight = 4';
    }
    else if (isThreeOfAKind(rankCounts)) {
      royalties.middle.amount = 2;
      royalties.middle.description = 'Three of a Kind = 2';
    }
  }

  // Нижний ряд (5 карт)
  if (board.bottom.every(c => c)) {
    const values = board.bottom.map(c => getCardValue(c.rank));
    const suits = board.bottom.map(c => c.suit);
    const rankCounts = countRanks(board.bottom);
    
    if (isRoyalFlush(values, suits)) {
      royalties.bottom.amount = 25;
      royalties.bottom.description = 'Royal Flush = 25';
    }
    else if (isStraightFlush(values, suits)) {
      royalties.bottom.amount = 15;
      royalties.bottom.description = 'Straight Flush = 15';
    }
    else if (isFourOfAKind(rankCounts)) {
      royalties.bottom.amount = 10;
      royalties.bottom.description = 'Four of a Kind = 10';
    }
    else if (isFullHouse(rankCounts)) {
      royalties.bottom.amount = 6;
      royalties.bottom.description = 'Full House = 6';
    }
    else if (isFlush(suits)) {
      royalties.bottom.amount = 4;
      royalties.bottom.description = 'Flush = 4';
    }
    else if (isStraight(values)) {
      royalties.bottom.amount = 2;
      royalties.bottom.description = 'Straight = 2';
    }
  }

  royalties.total = royalties.top.amount + royalties.middle.amount + royalties.bottom.amount;
  console.log('royalties ', royalties);
  return royalties;
}



// Вспомогательные функции для проверки комбинаций
function isRoyalFlush(values, suits) {
  return isStraightFlush(values, suits) && Math.max(...values) === 14; // A-high
}

function isStraightFlush(values, suits) {
  return isFlush(suits) && isStraight(values);
}

function isFourOfAKind(rankCounts) {
  return Object.values(rankCounts).includes(4);
}

function isFullHouse(rankCounts) {
  return Object.values(rankCounts).includes(3) && 
         Object.values(rankCounts).includes(2);
}

function isFlush(suits) {
	//console.log('isFlush', suits);
  return new Set(suits).size === 1;
}

function isStraight(values) {
  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length !== 5) return false;
  
  const sorted = uniqueValues.sort((a,b) => a-b);
  return (sorted[4] - sorted[0] === 4) || 
         (sorted.join(',') === '2,3,4,5,14'); // Стрит от туза до 5
}

function isThreeOfAKind(rankCounts) {
  return Object.values(rankCounts).includes(3);
}

function isTwoPairs(rankCounts) {
  return Object.values(rankCounts).filter(v => v === 2).length === 2;
}

function isPair(rankCounts) {
  return Object.values(rankCounts).includes(2);
}



function getRowAbsoluteStrength(cards) {
	//console.log('getLineStrength');
  if (!cards.every(c => c)) return 0; // Неполные ряды слабее
  
  const values = cards.map(c => {
	  console.log('c.rank: ',c.rank);
	  return getCardValue(c.rank);
	  }).sort((a,b)=>a-b);
  console.log("******** VALUES ! ***** ", values);
  const suits = cards.map(c => c.suit);
  const rankCounts = countRanks(cards);
  
  // Определяем силу комбинации (чем выше число, тем сильнее комбинация)
  if(cards.length === 3){
	  if (isThreeOfAKind(rankCounts)){
		  return 300 + Math.max(...values);
	  }else if(isPair(rankCounts)){
		  const pairRank = Object.keys(rankCounts).find(r=> rankCounts[r] ===2);
		  return 100 + getCardValue(pairRank);
	  }else{
		  return Math.max(...values);
	  }
  }else if(cards.length === 5){
	  
  
  if (isRoyalFlush(values, suits)) {return 900;
	  }else if (isStraightFlush(values, suits)){ return 800+values[4];
	  }else if (isFourOfAKind(rankCounts)) {
	  const fourRank = Object.keys(rankCounts).find(r=> rankCounts[r]===4);
 return 700+getCardValue(fourRank);
 }
  else if (isFullHouse(rankCounts)){
	  const threeRank = Object.keys(rankCounts).find(r=>rankCounts[r]===3);
	   return 600+getCardValue(threeRank);
   }
  else if (isFlush(suits)) {return 500+Math.max(...values);
  }
  else if (isStraight(values)){
	   return 400+values[4];
}else  if (isThreeOfAKind(rankCounts)){
	  const threeRank = Object.keys(rankCounts).find(r=>rankCounts[r]===3);
	   return 300+getCardValue(threeRank);
   }
 else if (isTwoPairs(rankCounts)) {
	  const pairs=Object.keys(rankCounts).filter(r=>rankCounts[r]===2);
	  const highPair=Math.max(...pairs.map(getCardValue));
	  return 200+highPair;
  }
  else if (isPair(rankCounts)){
	  const pairRank = Object.keys(rankCounts).find(r=> rankCounts[r] ===2);
	   return 100+getCardValue(pairRank);
   }else{
  
  return Math.max(...values); // Старшая карта
}
}
}

