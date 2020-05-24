var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);


http.listen(3000, () => {
	console.log('listening on *:3000');
});


//An array of arrays acting as in-memory data structure store.
//Structure: Column 0 : gameHash, Column 1 : userID, Column 2 : fullname
let connectedPlayersTable = [];


function indexOfInColumn(parent, column, item, firstOnly = true, distinct = false) {
  //Find the index(es) of item in outer most array in a 2D array.
  //DATATYPE SENSITIVE

  let parentIndexes = [];

  //Optimisation; if only first occurence is needed, then value will be distinct anyway.
  if(firstOnly){distinct=true;}

  for (let p = 0; p < parent.length; p++) {
      if (parent[p][column] === item){

          if(distinct){
              if(firstOnly){
                  return p;
              }
              if(parentIndexes.indexOf(p)===-1){
                  parentIndexes.push(p);
              }
          } else {
              parentIndexes.push(p);
          }
      }
  }
  if (parentIndexes.length === 0 ){
      return -1;   // Not found
  } else {
      return parentIndexes;
  }
}




let notify = io.on('connection', (socket) => {
  console.log('a user connected');



    //join users own 'room'
    socket.on('join', function (clientSession) {

      clientSession  = JSON.parse(clientSession);
      gameHash = clientSession.gameHash;
      socket.join(gameHash);
      
      //If new player isn't already in the table, add them
      //Column 1 is "userID"
      if(indexOfInColumn(connectedPlayersTable, 1, clientSession.userID) === -1){
        connectedPlayersTable.push([clientSession.gameHash, clientSession.userID, clientSession.fullname]);
      }
    
      //Get names of players in lobby to update who's there.
      let indexOfPlayersInGame = indexOfInColumn(connectedPlayersTable, 0, gameHash, false);
      let fullnamesInGame = [];
      for (let i = 0; i < indexOfPlayersInGame.length; i++) {
        let currentRow = indexOfPlayersInGame[i];
        //Column 2 is player fullnames.
        fullnamesInGame.push(connectedPlayersTable[currentRow][2]);
      }

    	console.log(clientSession.fullname + ' joining ' + gameHash)
        
      var joinMsg = ` joined lobby: ` + gameHash;

      io.to(gameHash).emit('playersInLobby', fullnamesInGame);
      io.to(gameHash).emit('user_join', joinMsg);



    });

});
