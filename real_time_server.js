/////////////////////////
//Setup MySQL
/////////////////////////
const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit : 100, //important
    host     : '127.0.0.1',
    database : 'hateful',
    user     : 'root',
    password : 'rrfKa-dd6-sCX7F',
    debug    :  false
});
//Custom DB Access helper functions
async function mysqlSelect(select, from, where, equals) {
    let selectQuery = 'SELECT ?? FROM ?? WHERE ?? = ?';    
    let query = mysql.format(selectQuery,[select,from,where,equals]);
    return new Promise( (resolve) => {
        pool.query(query, (error, data) => {
			if(error) {
				console.error(error);
				return false;
			}
              resolve (data);
            });
        }); 
	} 

async function mysqlUpdate(update, set, setEquals, where, equals) {
	let selectQuery = 'UPDATE ?? SET ?? = ? WHERE ?? = ?';    
	let query = mysql.format(selectQuery,[update,set,setEquals,where,equals]);
	return new Promise( (resolve) => {
		pool.query(query, (error, data) => {
			if(error) {
				console.error(error);
				return false;
			}
				resolve (data);
			});
		}); 
	} 

async function mysqlCustom(customQuery = "", values = []) {
	let query = mysql.format(customQuery,values);
	return new Promise( (resolve) => {
		pool.query(query, (error, data) => {
			if(error) {
				console.error(error);
				return false;
			}
				resolve (data);
			});
		}); 
	} 
/////////////////////////

/////////////////////////
//Setup Socket.IO
/////////////////////////
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
http.listen(3000, () => {
	console.log('listening on *:3000');
});
/////////////////////////


let notify = io.on('connection', (socket) => {
	console.log('A user connected.');
	
	//Initialise variables in connection scope
	let gameID = "";
	let userID = "";

	socket.on('join', function (dirtyUserID) {
		//Never use the dirty user ID in SQL queries!
		//Sanitise Input
		userID = dirtyUserID.replace(/[^0-9]/g, '');
		//if userID is more than 9.9... Billion, it's defintely invalid.
		if(userID.length > 10){userID = null};

		(async () => {
			gameID = await mysqlSelect("game_id", "players", "id", userID);
			//Returns array of objects
			//First result (row); attribute: game_id
			gameID = gameID[0].game_id;
			if(gameID === false){
				//Reject bad input
				socket.join("dodgyID");
				io.to("dodgyID").emit('needsRefresh');
				console.log("Dodgy User ID denied:" + dirtyUserID)
			} else {
				socket.join(gameID);
				//User joined their room. Mark them as connected in DB
				mysqlUpdate("players", "connected", "1", "id", userID);

				//Let user know they connected and output this to console.
				console.log(userID + ' Joined room:' + gameID) 
				io.to(gameHash).emit('joinRoomSuccess');

				//Let everyone in room know the updated connected users list.
				emitPlayersInLobby(gameID);
			}

			(async () => {
				const queryValues = ["id", "players", "game_id", gameID, "connected", 1];
				const connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ?? AND ?? = ??", queryValues);
				//Returns array of objects
				if(connectedPlayers.length > 1){
					io.to(gameHash).emit('enableGameStart');
				} else {
					io.to(gameHash).emit('disableGameStart');
				}
			 })();
			
		 })();

	});

	
	socket.on('disconnect', () => {
		(async () => {
			isMaster = await mysqlSelect("ismaster", "players", "id", userID);
			//Returns array of objects
			isMaster = isMaster[0].ismaster

			if (ismaster===1){
				//user is round master

				//SELECT NEW USER FROM DATABASE AND MAKE THEM MASTER
				//EMIT TO THEM THAT THEY ARE HOST MASTER
			}
		})();

		(async () => {
			//Mark them as disconnected in DB.
			await mysqlUpdate("players", "connected", "0", "id", userID);
			
			//Update front-end player list.
			emitPlayersInLobby(gameHash);

			//Check if there's still enough players to start the game.
			(async () => {
				const queryValues = ["id", "players", "game_id", gameID, "connected", 1];
				const connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ?? AND ?? = ??", queryValues);
				//Returns array of objects
				if(connectedPlayers.length > 1){
					io.to(gameHash).emit('enableGameStart');
				} else {
					io.to(gameHash).emit('disableGameStart');
				}
			})(); //End of connected player db count async
		})(); //End of disconnect db update async

	}); // End of disconnect function

}); //End of connection scope.



//Custom Functions area

function emitPlayersInLobby(gameID){

	gameID = mysqlQuery("SELECT `fullname` FROM `players` WHERE `game_id`=" + $gameID + ";");

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
