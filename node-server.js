const fs = require('fs');
const path = require("path");

// Setup MySQL
const mysql = require('mysql');
const { Console } = require('console');
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


				socket.gameID = gameID;
				socket.userID = userID;
				// socket.handshake.session.save();

				console.log("Node Session data says - Game ID:" + socket.gameID + " User ID:" + socket.userID)
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
		if(socket.userID != null){
			const gameID = socket.gameID;
			const userID = socket.userID;

			isMaster = await mysqlSelect("ismaster", "players", "id", userID);
			//Returns array of objects
			//First row, ismaster attribute.
			isMaster = isMaster[0].ismaster;		

			//Make sure this user is actually master otherwise request refresh.
			if (isMaster==1){
				console.log("Is Master, Starting Game!")
				startGame(gameID);
			} else {
				//This shouldn't happen. Make user refresh page because something is up.
				requestRefresh();
			}
		}
			
		async function startGame(gameID){

			//Start round
			const queryValues = ["rounds", "game_id", gameID];
			await mysqlCustom("INSERT INTO ?? (??) VALUES (??)", queryValues);
			
			await mysqlUpdate("games", "started", 1, "id", gameID);
			
			//For each player, set their new game state.
			//updatePlayerState(gameID, masterState, playerState)
			updatePlayerStates(gameID, "needs-questions", "waiting-for-question")

			//Tell everyone to refresh so laravel loads the game view.
			setTimeout(() => {
				requestRefresh(gameID);
			}, 1000);
		}
	});

	socket.on('what-is-my-state', async function(){
		if(socket.userID != null){
			userStateResult = await mysqlSelect("state", "players", "id", socket.userID);
			userState = userStateResult[0].state;
			
			console.log(socket.userID + "'s state is: " + userState);

			switch (userState) {
				case "waiting-for-question":
					try {
						var data = fs.readFileSync(path.resolve(__dirname, "game-states/player-wait-for-question.html"), 'utf8');
						console.log("File read")
						setTimeout(() => {
							socket.emit("load-new-state", data);
						}, 500);
					} catch(e) {
						alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
						console.log('Error:', e.stack);
					}
					break;
				case "needs-questions":
					getMasterQuestions(socket);
					break;
				case "choosing-question":
					getMasterQuestions(socket);
					
					break;
				// case value:
					
				// 	break;
			
				default:
					break;
			}
		} else {
			alertSocket("Something went wrong. Please refresh the page.")
		}
		


	});

	socket.on('picked-question', (dirtyQuestionID) => {
		
		//If question id has more than 10 digits it's definetely invalid!
		if (dirtyQuestionID.length < 10){
			try {
				//If it can't be parsed into an integer it's also definetely invalid!
				const questionID = parseInt(dirtyQuestionID);
			  }
			  catch(err) {
				console.log("Invalid picked question ID!")
				return;
			  }
		} else {
			return;
		}

		if (socket.userID == null) {
			return;
		}

		//Update round with chosen question
		mysqlUpdate("rounds", "question_id", questionID, "game_id", socket.gameID)
		
				//Score question against offered questions

		//Select latest round
		const queryValues = ["id", "rounds", "game_id", socket.gameID, "created_at"];
		const roundID = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);

		//Select all offered questions data
		queryValues = ["id", "score", "round_question", "round_id", roundID[0].id];
		const offeredQuestions = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);

		//Select winning question data
		queryValues = ["id", "score", "questions", "id", questionID];
		const chosenQuestion = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ?", queryValues);

		scoreCard(chosenQuestion, offeredQuestions, "questions");


	});


	socket.on('disconnect', () => {
		if (socket.userID != null) {
			console.log("There is a session: UserID:" + socket.userID + " GameID:" + socket.gameID);
			console.log("A user (" + socket.userID + ") is disconnecting");

			//Create set timeout to disconnect after a few seconds
			const disconnectTimer = setTimeout(async function(userID, gameID){

				console.log("disconnectTimer triggered");
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

				delete socket.userID;
				delete socket.gameID;
				// socket.handshake.session.save();
				console.log("Session deleted");
		
			}, 10000, socket.userID, socket.gameID);
			// Important to pass the user data to the timer function!

			timeouts.push(disconnectTimer);
			timeoutUserIDPivot.push(socket.userID);
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

function alertSocket(socket, message){
	setTimeout(function (socket) {
		socket.emit('alert-socket', message);
	}, 3000, socket);
}


async function updatePlayerStates(gameID, masterState = null, playerState = null){

	const queryValues = ["id", "ismaster", "players", "game_id", gameID, "connected", 1, ];
	const queryResult = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ", queryValues);
	//Returns array of objects
	
	let currentPlayerID;
	let currentPlayerMaster;
	for(i=0;i<queryResult.length;i++){
		currentPlayerID = queryResult[i].id;
		currentPlayerMaster = queryResult[i].ismaster;
		if (currentPlayerMaster == 1 && masterState !== null){
			await mysqlUpdate("players", "state", masterState, "id", currentPlayerID);
		} 
		if (playerState !== null) {
			await mysqlUpdate("players", "state", playerState, "id", currentPlayerID);
		}
	}
}


async function getMasterQuestions(socket) {
	//Select 3 from questions table where score 

	let queryValues = ["score", "questions"];
	let averageScore = await mysqlCustom("SELECT AVG(??) FROM ??", queryValues);
	//Returns array of objects

	averageScore = Object.values(averageScore[0]);
	averageScore = parseInt(averageScore);

	//Select latest round
	const queryValues = ["id", "rounds", "game_id", socket.gameID, "created_at"];
	const roundID = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
	

	queryValues = ["id", "question", "questions", "score", averageScore];
	let topRandonQuestions = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? >= ? ORDER BY RAND() LIMIT 5", queryValues);
	let lowRandomQuestions = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? <= ? ORDER BY RAND() LIMIT 3", queryValues);
	let questions = topRandonQuestions;
	questions = questions.concat(lowRandomQuestions);

	//Make data for new game state
	let questionsInsert = "";
	for(i=0;i<questions.length;i++){
		//Log offered questions for question card scoring later.
		const queryValues = ["round_question", "round_id", "question_id", roundID[0].id, questions[i].id];
		mysqlCustom("INSERT INTO ?? (??, ??) VALUES (??, ??)", queryValues);

		questionsInsert += `
		<a onclick="pickQuestion(${questions[i].id})" href="#">
		<div class="card game-card answer-card  ">
		   <div class="card-body game-card-body p-2">
			  <div class="card-text-answer">
				  ${questions[i].question}
			  </div>
		   </div>
		 </div>
		</a>
		`
	}

	let data = `
	<div class="row mt-2">
    <div class="col-12 p-0">
        <div class="x-scrolling-wrapper pl-4">
            ${questionsInsert}
        </div>
    </div>
	</div>
	`

	updatePlayerStates(socket.gameID, "choosing-question")

	socket.emit("load-new-state", data);




}





async function scoreCard(winnerCard, offeredCards, table) {
	
	
		let offeredQuestionsTotalScore = 0;
		let winProbability = 0;
		let newRating = 0;
		for(i=0;i<offeredCards.length;i++){
			offeredQuestionsTotalScore += offeredCards[i].score;
			//calculate score for each losing card against chose card
			//Calculate Probability of current card winning against winner:
			winProbability = 1 / ( 1 + 10^((winnerCard[0].score - offeredCards[i].score)/400));
			newRating = offeredCards[i].score + (32*(0 - winProbability));
			mysqlUpdate(table, "score", newRating, "id", offeredCards[i].id);
		}

		//Calculate average score, excluding the chosen card.
		offeredCardsScoreAVG = (offeredQuestionsTotalScore - winnerCard[0].score) / (offeredCards.length - 1);
		//calculate chosen card score against average of cards offered.

		winProbability = 1 / ( 1 + 10^((offeredCardsScoreAVG - winnerCard[0].score)/400));
		newRating = offeredCards[i].score + (32*(1 - winProbability));
		mysqlUpdate(table, "score", newRating, "id", winnerCard[0].id);


}