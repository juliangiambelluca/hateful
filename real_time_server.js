let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);
http.listen(3000, () => {
	console.log('listening on *:3000');
});

//An array of arrays acting as in-memory data structure store.
//Structure: Column 0 : gameHash, Column 1 : userID, Column 2 : fullname, Column 3 : isMaster
let connectedPlayersTable = [];
/////////////////////////////////////////////////////////////


let notify = io.on('connection', (socket) => {
	console.log('a user connected');
	let gameHash = "";
	let userID = "";
	let isMaster = "";
	let clientSession = [];
	//join users own 'room'
	socket.on('join', function (preClientSession) {
		preClientSession = JSON.parse(preClientSession);
		socket.join(preClientSession.gameHash);
		clientSession = preClientSession;
		userID = clientSession.userID;
		gameHash = clientSession.gameHash;
		isMaster = clientSession.isMaster;


		//if this user is roundmaster, clear all other roundmasters.
		if(isMaster === true ){
		let indexOfPlayersInGame = indexOfInColumn(connectedPlayersTable, 0, gameHash, false);
		for (let i = 0; i < indexOfPlayersInGame.length; i++) {
			let currentRow = indexOfPlayersInGame[i];
			//make nobody in room master
			connectedPlayersTable[currentRow][3] = false;
		}
		}

		//If new player isn't already in the table, add them
		//Column 1 is "userID"
		if(indexOfInColumn(connectedPlayersTable, 1, userID) === -1){
			connectedPlayersTable.push([gameHash, userID, clientSession.fullname, clientSession.isMaster]);
		}
		emitPlayersInLobby(gameHash);

		if(indexOfInColumn(connectedPlayersTable, 0, gameHash, false, false).length >1){
			io.to(gameHash).emit('enableGameStart');
		} else {
			io.to(gameHash).emit('disableGameStart');
		}



		console.log(clientSession.fullname + ' joining ' + gameHash) 
		var joinMsg = ` joined lobby: ` + gameHash;
		io.to(gameHash).emit('user_join', joinMsg);
	});





	socket.on('disconnect', () => {
		//Delete disconnected user from table
		disconnectedUserIndex = indexOfInColumn(connectedPlayersTable, 1, userID);
		connectedPlayersTable.splice(disconnectedUserIndex, 1);
	
		if(isMaster === true){


			//ensure there's no host masters and choose again
			let indexOfPlayersInGame = indexOfInColumn(connectedPlayersTable, 0, gameHash, false);
			for (let i = 0; i < indexOfPlayersInGame.length; i++) {
				let currentRow = indexOfPlayersInGame[i];
				//make nobody in game master
				connectedPlayersTable[currentRow][3] = false;
			}

			//assign someone to become host
			newHost = indexOfInColumn(connectedPlayersTable, 0, gameHash);
			//get their user ID
			//they may not exist!!! add checks for this!.
			if (newHost !== -1){
				newHost = connectedPlayersTable[newHost][1];
			} else {
				//nobody else left in game.
			}

			console.log("requestSender=(" + newHost + ")");

			//Tell request sender to send request and everyone else to refresh.
			io.to(gameHash).emit('newHost', newHost);

		}


		//Clear these variables just in case.
		userID = null;
		isMaster = null;
		gameHash = null;

		//Check if there's still enough players to start the game
		if(indexOfInColumn(connectedPlayersTable, 0, gameHash, false, false).length < 2){
			io.to(gameHash).emit('disableGameStart');
		}

		//Update front-end player list.
		emitPlayersInLobby(gameHash);
	});










});









function emitPlayersInLobby(gameHash){
	console.table(connectedPlayersTable);
//Get names of players in lobby to update who's there.
	//Column 0 is gamehash
	let indexOfPlayersInGame = indexOfInColumn(connectedPlayersTable, 0, gameHash, false);
	let fullnamesInGame = [];
	let playerIDsInGame = [];
	for (let i = 0; i < indexOfPlayersInGame.length; i++) {
		let currentRow = indexOfPlayersInGame[i];
		//Column 2 is player fullnames.
		fullnamesInGame.push(connectedPlayersTable[currentRow][2]);
		playerIDsInGame.push(connectedPlayersTable[currentRow][1]);
	}
	io.to(gameHash).emit('playersInLobby', [playerIDsInGame, fullnamesInGame]);
}
	
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
