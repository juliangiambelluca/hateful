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

/////////////////////////
//Setup Express session
/////////////////////////
session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
  }),
  sharedsession = require("express-socket.io-session");

// Share session with io sockets
io.use(sharedsession(session));
/////////////////////////


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

				socket.handshake.session.userdata = [gameID, userID];
				socket.handshake.session.save();


				//if they return after leaving within 10 seconds, stop db from updating them to disconnected.
				if (timeoutUserIDPivot.includes(userID)) {
					console.log("Trying to clear timer");
					const timeoutRow = timeoutUserIDPivot.indexOf(userID);
					clearTimeout(timeouts[timeoutRow]);
					timeoutUserIDPivot.splice(timeoutRow, 1);
					timeouts.splice(timeoutRow, 1);
				}
				
				//User joined their room. Mark them as connected in DB
				await mysqlUpdate("players", "connected", 1, "id", userID);

				//Let user know they connected and output this to console.
				console.log(userID + ' Joined room:' + gameID) 
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

	
	socket.on('disconnect', () => {
		console.log("A user is disconnecting");
		const disconnectTimer = setTimeout(function(){
			(async () => {
				
				if (socket.handshake.session.userdata) {
					const sessionData = socket.handshake.session.userdata;
					const gameID = sessionData[0];
					const userID = sessionData[1];
				} else {
					return;
				}

				console.log("User " + userID + "Is disconneted. Timer expired.");
				
				isMaster = await mysqlSelect("ismaster", "players", "id", userID);
				//Returns array of objects
				isMaster = isMaster[0].ismaster;
				(async () => {
				if (isMaster==1){
					const queryValues = ["id", "players", "game_id", gameID, "connected", 1, "ismaster", 0, "created_at"];
					const playersLeft = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
					
					//LAST EXCEPTION CAUGHT HERE. CANNOT READ PROPERTY ON UNDEFINED.
					newHost = playersLeft[0].id;
					
					io.to(gameID).emit('newHost', newHost);

					console.log(userID + " lost Host privilege to " + newHost)

					mysqlUpdate("players", "ismaster", 0, "id", userID);
					mysqlUpdate("players", "ismaster", 1, "id", newHost);
				}
			})();
				//Mark them as disconnected in DB.
				await mysqlUpdate("players", "connected", 0, "id", userID);
				
				//Update front-end player list.
				emitPlayersInLobby(gameID);
	
				//Check if there's still enough players to start the game.
				// (async () => {
					const queryValues = ["id", "players", "game_id", gameID, "connected", 1];
					const connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
					//Returns array of objects
					if(connectedPlayers.length > 1){
						io.to(gameID).emit('enableGameStart');
					} else {
						io.to(gameID).emit('disableGameStart');
					}
				// })(); //End of connected player db count async


				
				//Clear this value from the timeouts table
				const timeoutRow = timeoutUserIDPivot.indexOf(userID);
				timeoutUserIDPivot.splice(timeoutRow, 1);
				timeouts.splice(timeoutRow, 1);



				if (socket.handshake.session.userdata) {
					delete socket.handshake.session.userdata;
					socket.handshake.session.save();
				}

			})(); //End of disconnect db update async
		}, 5000);

		if (socket.handshake.session.userdata) {
		//Save the timer ID to timeout table.
		const sessionData = socket.handshake.session.userdata;
		const userID = sessionData[1];
		timeouts.push(disconnectTimer);
		timeoutUserIDPivot.push(userID);
		}





	}); // End of disconnect function

}); //End of connection scope.



//Custom Functions area

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
		io.to(gameID).emit('playersInLobby', [connUserIDsArr, connFullnamesArr]);
}

