const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const Player = require('./class/Player.js');
const TennisGame = require('./class/TennisGame.js');

players = [];
tennisGame = null;
let timeout = null;


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/game', (req, res) => {
    res.sendFile(__dirname + '/tennisGame.html');
});

app.get('/tennisGame.css', (req, res) => {
  res.sendFile(__dirname + '/tennisGame.css');
});

app.get('/images/tennis_ball.png', (req, res) => {
  res.sendFile(__dirname + '/images/tennis_ball.png');
});


io.on('connection', (socket) => {

    socket.on('join', (name) => {
      const gameInfo = generatePlayer(name, socket.id);
      socket.emit('join', gameInfo);
      if(gameInfo.gameReady){
        io.emit('game:ready', 'Game ready');
        tennisGame = new TennisGame(players[0], players[1]);

        players[0].starter = true;

        io.to(players[0].socketId).emit('starter:player', {
          player: 1,
          socketId: players[0].socketId,
          info: {
            player1:{
              name: players[0].name,
              score: players[0].score
            },
            player2:{
              name: players[1].name,
              score: players[1].score
            }
          },
          starter: true
        });
        io.to(players[1].socketId).emit('starter:player', {
          player: 2,
          socketId: players[1].socketId,
          info:{
            player1:{
              name: players[0].name,
              sets: players[0].sets,
              points: players[0].points,
              score: players[0].score
            },
            player2:{
              name: players[1].name,
              sets: players[1].sets,
              points: players[1].points,
              score: players[1].score
            }
          },
          starter:false
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log('id jugador desconectado '+ socket.id);
      const indexDisconnectedPlayer = players.findIndex(player => player.socketId === socket.id);
      players.splice(indexDisconnectedPlayer, 1);
      checkPlayerList();
      players.forEach(player => {
        io.to(player.socketId).emit('player:disconnected');
      });
    });

    socket.on('smash', (socketId) => {

      deactivateTimeOut();
      if(tennisGame.player1.socketId === socketId){
        tennisGame.player2.turn = true;
        tennisGame.player1.lastHitter = true;
        tennisGame.player1.turn = false;
        tennisGame.player2.lastHitter = false;

        tennisGame.turn = 'player2';
        tennisGame.lastHitter = 'player1';

        io.to(tennisGame.player1.socketId).emit('game:rally', {turn: false});
        io.to(tennisGame.player2.socketId).emit('game:rally', {turn: true});
      }else{
        tennisGame.player2.turn = false;
        tennisGame.player1.lastHitter = false;
        tennisGame.player1.turn = true;
        tennisGame.player2.lastHitter = true;

        io.to(tennisGame.player1.socketId).emit('game:rally', {turn: true});
        io.to(tennisGame.player2.socketId).emit('game:rally', {turn: false});
      }

      activateTimeOut();

    });

});

server.listen(3000, () => {
  console.log('listening on *:3000');
});


function generatePlayerId(){
    return '_' + Math.random().toString(36).substr(2, 9);
}

function generatePlayer(name, socketId){
  const player = new Player(generatePlayerId(), name, socketId);
  let error = false;
  let msg = 'spots available';
  let gameReady = false;
  if(players.length < 2){
    players.push(player);
    if(players.length === 2){
      error = true;
      msg = 'no hay huecos para jugar';
      gameReady = true;
    }
  }
  checkPlayerList();
  const response = {
    'num_players': players.length,
    'players': players,
    'error': error,
    'message': msg,
    'gameReady': gameReady
  };
  return response;
}

function checkPlayerList(){
  console.log('list of players: ');
  console.log(players);
}


function activateTimeOut(){
  timeout = setTimeout(() => {
    distributePoints();
  }, getRandomArbitrary(500,1500));
}

function deactivateTimeOut(){
  if(timeout){
    clearTimeout(timeout);
  }
}

function distributePoints(){
  if(tennisGame.player1.lastHitter){
    if(tennisGame.player1.score === 0){
      tennisGame.player1.score = 15;
    }else if(tennisGame.player1.score === 15){
      tennisGame.player1.score = 30;
    }else if(tennisGame.player1.score === 30){
      tennisGame.player1.score = 40;
    }else if(tennisGame.player1.score === 40 && tennisGame.player2.score === 40){
      tennisGame.player1.score = 'ADV'
    }else if(tennisGame.player1.score === 40 && tennisGame.player2.score === 'ADV'){
      tennisGame.player2.score = 40;
    }else if(tennisGame.player1.score === 'ADV' && tennisGame.player2.score === 40 || 
             tennisGame.player1.score === 40 && tennisGame.player2.score !== 'ADV' ||
             tennisGame.player1.score === 40 && tennisGame.player2.score !== 40){
      tennisGame.player1.points = 1;
      tennisGame.player1.score = 0;
      tennisGame.player2.score = 0;

      wonPoint(tennisGame.player1.name);

      //jugaremos el set a 2 puntos
      if(tennisGame.player1.points === 2){
        tennisGame.player1.sets += 1;
        /**
         * En este caso jugaremos a 1 set pero comprobamos el número por si quisieramos cambiarlo
         */
        if(sets === 1){
          //Acaba el partido
        }
      }
    }
  }else{
    if(tennisGame.player2.score === 0){
      tennisGame.player2.score = 15;
    }else if(tennisGame.player2.score === 15){
      tennisGame.player2.score = 30;
    }else if(tennisGame.player2.score === 30){
      tennisGame.player2.score = 40;
    }else if(tennisGame.player2.score === 40 && tennisGame.player1.score === 40){
      tennisGame.player2.score = 'ADV'
    }else if(tennisGame.player2.score === 40 && tennisGame.player1.score === 'ADV'){
      tennisGame.player1.score = 40;
    }else if(tennisGame.player2.score === 'ADV' && tennisGame.player1.score === 40 || 
             tennisGame.player2.score === 40 && tennisGame.player1.score !== 'ADV' ||
             tennisGame.player2.score === 40 && tennisGame.player1.score !== 40){
      tennisGame.player2.points = 1;
      tennisGame.player2.score = 0;
      tennisGame.player1.score = 0;
      
      wonPoint(tennisGame.player2.name);

      //jugaremos el set a 2 puntos
      if(tennisGame.player2.points === 2){
        tennisGame.player2.sets += 1;
        /**
         * En este caso jugaremos a 1 set pero comprobamos el número por si quisieramos cambiarlo
         */
        if(sets === 1){
          //Acaba el partido
        }
      }
    }
  }

  getScore();
}

function getScore(){
  setsPlayer1 = tennisGame.player1.sets;
  setsPlayer2 = tennisGame.player2.sets;
  pointsPlayer1 = tennisGame.player1.points;
  pointsPlayer2 = tennisGame.player2.points;
  scorePlayer1 = tennisGame.player1.score;
  scorePlayer2 = tennisGame.player2.score;

  msg = '';

  if(scorePlayer1 === 0 && scorePlayer2 === 0){
    msg = 'Love all';
  }else if(scorePlayer1 === 15 && scorePlayer2 === 0){
    msg = 'Fifteen - Love';
  }else if(scorePlayer1 === 0 && scorePlayer2 === 15){
    msg = 'Love - Fifteen';
  }else if(scorePlayer1 === 15 && scorePlayer2 === 15){
    msg = 'Fifteen all';
  }else if(scorePlayer1 === 30 && scorePlayer2 === 0){
    msg = 'Thirty - Love';
  }else if(scorePlayer1 === 30 && scorePlayer2 === 15){
    msg = 'Thirty - Fifteen';
  }else if(scorePlayer1 === 0 && scorePlayer2 === 30){
    msg = 'Love - Thirty';
  }else if(scorePlayer1 === 15 && scorePlayer2 === 30){
    msg = 'Fifteen - Thirty';
  }else if(scorePlayer1 === 30 && scorePlayer2 === 30){
    msg = 'Thirty - All';
  }else if(scorePlayer1 === 40 && scorePlayer2 === 0){
    msg = 'Forty - Love';
  }else if(scorePlayer1 === 40 && scorePlayer2 === 15){
    msg = 'Forty - Fifteen';
  }else if(scorePlayer1 === 40 && scorePlayer2 === 30){
    msg = 'Forty - Thirty';
  }else if(scorePlayer1 === 0 && scorePlayer2 === 40){
    msg = 'Love - Forty';
  }else if(scorePlayer1 === 15 && scorePlayer2 === 40){
    msg = 'Fifteen - Forty';
  }else if(scorePlayer1 === 30 && scorePlayer2 === 40){
    msg = 'Thirty - Forty';
  }else if(scorePlayer1 === 40 && scorePlayer2 === 40){
    msg = 'Deuce';
  }else if(scorePlayer1 === 'ADV' && scorePlayer2 === 40){
    msg = 'Advantage Player1';
  }else if(scorePlayer1 === 40 && scorePlayer2 === 'ADV'){
    msg = 'Advantage Player2';
  }
  
  score = {
    player1: {
      sets: setsPlayer1,
      points : pointsPlayer1,
      score:scorePlayer1,
    },
    player2: {
      sets: setsPlayer2,
      points : pointsPlayer2,
      score:scorePlayer2,
    },
    msg : msg
  };
  io.emit('score', score);
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function wonPoint(playerName){
  io.emit('point:scored', 'Punto para: '+ playerName);
}