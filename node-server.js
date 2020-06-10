
// Setup MySQL
const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit : 100, //important
    host     : '127.0.0.1',
    database : 'hateful',
    user     : 'root',
    password : 'rrfKa-dd6-sCX7F',
    debug    :  false
});
	
// Setup Socket.IO
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
http.listen(3000, () => {
	console.log('listening on *:3000');
});



//Store Disconnect timeouts & their users.
let timeouts = [];
let timeoutUserIDPivot = [];


let notify = io.on('connection', (socket) => {
	console.log('A user connected.');

	socket.on('join', function (dirtyUserID) {
		//Never use the dirty user ID in SQL queries!
		//Sanitise Input
		userID = dirtyUserID.replace(/[^0-9]/g, '');
		//if userID is more than 9.9... Billion, it's defintely invalid.
		if(userID.length > 10){userID = null};

		userID = parseInt(userID, 10);
		(async () => {
			gameID = await mysqlSelect("game_id", "players", "id", userID);
			//Returns array of objects
			//First result (row); attribute: game_id
			gameID = gameID[0].game_id;
			gameID = parseInt(gameID, 10);

			if(gameID === false){
				//Reject bad input
				socket.join("dodgyID");
				io.to("dodgyID").emit('dodgyID');
				console.log("Dodgy User ID denied:" + dirtyUserID)
			} else {

				socket.join(gameID);
				//Every user will have their own room as session scope seems to be room-based.


				socket.userdata = [gameID, userID];
				// socket.handshake.session.save();

				console.log("socket user data says " + socket.userdata)
				//if they return after leaving within 10 seconds, stop db from updating them to disconnected.
				if (timeoutUserIDPivot.includes(userID)) {
					const timeoutRow = timeoutUserIDPivot.indexOf(userID);
					clearTimeout(timeouts[timeoutRow]);
					timeoutUserIDPivot.splice(timeoutRow, 1);
					timeouts.splice(timeoutRow, 1);
					console.log("Timeout cleared & deleted from array.");
				}
				
				//User joined their room. Mark them as connected in DB
				await mysqlUpdate("players", "connected", 1, "id", userID);

				//Let user know they connected and output this to console.
				console.log(userID + ' Joined room:' + gameID);
				io.to(gameID).emit('joinRoomSuccess');

				//Let everyone in room know the updated connected users list.
				emitPlayersInLobby(gameID);
			}

			(async () => {
				const queryValues = ["id", "players", "game_id", gameID, "connected", 1];
				const connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
				//Returns array of objects
				if(connectedPlayers.length > 1){
					io.to(gameID).emit('enableGameStart');
				} else {
					io.to(gameID).emit('disableGameStart');
					
				}
			 })();
			
		 })();
  
	});
	
	socket.on('start-game', async function(){
		if(socket.userdata){
			const gameID = socket.userdata[0];
			const userID = socket.userdata[1];

			isMaster = await mysqlSelect("ismaster", "players", "id", userID);
			//Returns array of objects
			//First row, ismaster attribute.
			isMaster = isMaster[0].ismaster;		

			//Make sure this user is actually master otherwise request refresh.
			if (isMaster==1){
				startGame(gameID, userID);
			} else {
				//This shouldn't happen. Make user refresh page because something is up.
				requestRefresh();
			}
		}
			
		async function startGame(gameID, userID){

			//Apply appropiate game states
			await mysqlUpdate("games", "started", 1, "id", gameID);
			
			//For each player, set their new game state.
			let queryResult = await mysqlSelect("ismaster", "players", "id", userID);
			//Returns array of objects
			
			let currentConnectedPlayerID;
			for(i=0;i<queryResult.length;i++){
				currentConnectedPlayerID = queryResult[i].id;

				if (currentConnectedPlayerID === userID){
					//This user is host/master
					await mysqlUpdate("players", "state", "choosing-question", "id", userID);
				} else {
					await mysqlUpdate("players", "state", "waiting-for-question", "id", currentConnectedPlayerID);
				}
			}

			//Tell everyone to refresh so laravel loads the game view.
			requestRefresh(gameID);
		}
	});





	socket.on('disconnect', () => {
		if (socket.userdata) {
			console.log("There is a session: " + JSON.stringify(socket.userdata));
			console.log("A user (" + socket.userdata[1] + ") is disconnecting");

			//Create set timeout to disconnect after a few seconds
			const disconnectTimer = setTimeout(async function(userData){

				console.log("disconnectTimer triggered");
				const gameID = userData[0];
				const userID = userData[1];
				isMaster = await mysqlSelect("ismaster", "players", "id", userID);
				//Returns array of objects
				//First row, ismaster attribute.
				isMaster = isMaster[0].ismaster;

				console.log(userID + "'s Master status: '" + isMaster + "'");

				if (isMaster==1){
					console.log("isMaster==1");

					const queryValues = ["id", "fullname", "players", "game_id", gameID, "connected", 1, "ismaster", 0, "created_at"];
					const playersLeft = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
					
					console.log("Players Left obj: " + JSON.stringify(playersLeft));
				
					if(playersLeft.length!==0){
						//LAST EXCEPTION CAUGHT HERE. CANNOT READ PROPERTY ON UNDEFINED. fixed?
						const newHost = [playersLeft[0].id, playersLeft[0].fullname];
						console.log("newHostArr=" + JSON.stringify(newHost))

						await mysqlUpdate("players", "ismaster", 1, "id", newHost[0]);
						await mysqlUpdate("players", "ismaster", 0, "id", userID);
						console.log(userID + " lost Host privilege to " + newHost[0]);
						io.to(gameID).emit('newHost', newHost);
					} else {
						console.log("Everyone left!")

						//Delete everything related to this game!


					}
				}
				
				//Mark them as disconnected in DB.
				await mysqlUpdate("players", "connected", 0, "id", userID);
				
				//Update front-end player list.
				emitPlayersInLobby(gameID);

				const queryValues = ["id", "players", "game_id", gameID, "connected", 1];
				const connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
				//Returns array of objects
				if(connectedPlayers.length > 1){
					io.to(gameID).emit('enableGameStart');
				} else {
					io.to(gameID).emit('disableGameStart');
				}

				//Clear this timer from the timeouts table
				const timeoutRow = timeoutUserIDPivot.indexOf(userID);
				//Important to delete both to keep timeouts and user ID's indexes aligned.
				timeoutUserIDPivot.splice(timeoutRow, 1);
				timeouts.splice(timeoutRow, 1);
				console.log("Deleted timeout from array as it's no longer needed.");

				delete socket.userdata;
				// socket.handshake.session.save();
				console.log("Session deleted");
		
			}, 10000, socket.userdata);
			// Important to pass the userdata to the timer function!

			timeouts.push(disconnectTimer);
			timeoutUserIDPivot.push(socket.userdata[1]);
			console.log("Timer pushed.");

		} else {
			console.log("There was no session. Exiting disconnectTimer function.");
			return;
		}

	}); // End of disconnect function

}); //End of connection scope.



//Custom Functions area

// Custom DB Access helper functions
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

async function emitPlayersInLobby(gameID){
		const queryValues = ["id", "fullname", "players", "game_id", gameID, "connected", 1];
		const connectedPlayers = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
		//Returns array of objects
		let connFullnamesArr = [];
		let connUserIDsArr = [];
		for(i=0;i<connectedPlayers.length;i++){
			connFullnamesArr.push(connectedPlayers[i].fullname);
			connUserIDsArr.push(connectedPlayers[i].id);
		}
		// emitToLobby(gameID, 'playersInLobby', [connUserIDsArr, connFullnamesArr])
		io.to(gameID).emit('playersInLobby', [connUserIDsArr, connFullnamesArr]);

}

function requestRefresh(gameID = null){
	if(gameID === null){
		//emit refresh to socket.
		socket.emit('refresh');
	} else {
		//emit refresh to room.
		io.to(gameID).emit('refresh');
	}
}


// async function emitToLobby(gameID, event, data = null){
// 	//replacing emiting to a room to experiment with scope

// 	//Get Players connected to this game
// 	const queryValues = ["id", "fullname", "players", "game_id", gameID, "connected", 1];
// 	const connectedPlayers = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
// 	//Returns array of objects

// 	//For each player connected, emit information.
// 	let connFullnamesArr = [];
// 	let connUserIDsArr = [];
// 	for(i=0;i<connectedPlayers.length;i++){
// 		connFullnamesArr.push(connectedPlayers[i].fullname);
// 		connUserIDsArr.push(connectedPlayers[i].id);
// 	}
// 	for(i=0;i<connectedPlayers.length;i++){
// 		io.to(connUserIDsArr[i]).emit(event, data);
// 	}
// }