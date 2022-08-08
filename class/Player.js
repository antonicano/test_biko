class Player {
  constructor(id, name, socketId) {
    this.socketId = socketId;
    this.id = id;
    this.name = name;
    this.starter = false;
    this.sets = 0;
    this.points = 0;
    this.score = 0;
    this.turn = false;
    this.lastHitter = false;
  }
}

module.exports = Player;