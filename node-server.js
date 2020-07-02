const fs = require('fs');
const path = require("path");

// Setup MySQL
const mysql = require('mysql');
const { Console } = require('console');
const { off } = require('process');
const { setWith, shuffle } = require('lodash');
const { start } = require('repl');
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
		joinUser(io, socket, dirtyUserID);  
	});
	
	socket.on('start-game', function(){
		startGame(io, socket);
	});

	socket.on('what-is-my-state', async function(){
		if(socket.userID != null){
			userStateResult = await mysqlSelect("state", "players", "id", socket.userID);
			userState = userStateResult[0].state;
			console.log(socket.userID + "'s state is: " + userState);

			switch (userState) {
				//STEP 1
				case "player-waiting-for-question":
					showPlayerQuestionWaitingScreen(socket);
					startTimer(io, socket, 60, function() {newMaster(io, socket, null, true)});
					break;
				case "master-needs-questions":
					//Reset staggering delay.
					io.in(socket.gameID).staggerDelay = 0;
					console.log("STAGGERING DELAY: 	" + io.in(socket.gameID).staggerDelay)
					getMasterQuestions(socket);

					//waiting on master to pick question
					//if master times out, change master - and if they're host, change host too.
					startTimer(io, socket, 60, function() {newMaster(io, socket, null, true)});

					// startTimer(50, change Master);
					break;

				//STEP 2
				case "master-waiting-for-answers":
					//Master waiting for players to answer
					showMasterAnswerWaitingScreen(socket);
					startTimer(io, socket, 60, function() {proceedWithMissingAnswers(io, socket)});
					break;
				case "player-needs-answers":

					showMainGameTemplate(socket);
					getRoundQuestion(socket);

					console.log(socket.userID + "Will Stagger By	" + io.in(socket.gameID).staggerDelay)

					//Stagger answer getting to avoid duplicates being offered.
					setTimeout(() => {
						getPlayerAnswers(socket);
					}, io.in(socket.gameID).staggerDelay);
					//add 500ms to stagger delay for next person
					io.in(socket.gameID).staggerDelay += 500;
					//getPlayerAnswers takes 500ms to execute. making each player wait multiple seconds is not ideal
					//but will have to do until further refactoring of get player answers.

					//If they don't answer in time they won't get a point
					startTimer(io, socket, 60, function() {proceedWithMissingAnswers(io, socket)});
					break;

				
				case "no-state":
					newPlayerWaitForNextRound(socket);
					break;

				//STEP 2.5
				case "player-has-answered":
					showMainGameTemplate(socket, "self");
					getRoundQuestion(socket, "self");
					showPlayerAnswerWaiting(socket);
					//If timer is already set (which it should be), they will just see a continuation of their previous countdown.
					startTimer(io, socket, 60);
					break;

				//STEP 3
				case "master-needs-answers":
					//Master needs to see everyones card's
					showMainGameTemplate(socket, "self");
					getRoundQuestion(socket, "self");
					getMasterAnswers(socket);

					//waiting on master to pick question
					//if master times out, change master - and if they're host, change host too.
					startTimer(io, socket, 60,  function() {newMaster(io, socket, null, true)});
					break;
				case "player-waiting-for-results":
					showResultsWaitingScreen(socket);
					//If timer is already set (which it should be), they will just see a continuation of their previous countdown.
					startTimer(io, socket, 60,  function() {newMaster(io, socket, null, true)});
					break;

				//STEP 4
				case "master-winner-chosen":
					//Display winner
					showMainGameTemplate(socket, "self");
					getRoundQuestion(socket, "self");
					showWinners(socket);
					startTimer(io, socket, 20, async function(io, socket) {
						await updatePlayerStates(socket, "new-round")
						requestStateUpdate(io, socket);
					});
					break;
				case "player-winner-chosen":
					//Display winner
					showMainGameTemplate(socket, "self");
					getRoundQuestion(socket, "self");
					showWinners(socket);
					//Emit dummy timer
					socket.emit('start-timer', 20);
					break;
				case "new-round":
					showLoader(io, socket);
					startNewRound(io, socket);
					break;
				default:
					alertSocket(socket, "Please refresh the page. Something went wrong.")
					//Set the user's state to no-state.
					break;
			}
		} else {
			alertSocket(socket, "Please refresh the page, something went wrong.")
		}
	});

	socket.on('master-picked-question', async (dirtyQuestionID) => {
		masterPickedQuestion(io, socket, dirtyQuestionID);
	});

	socket.on('player-confirmed-answers', async (dirtyAnswerIDS) => {
		console.log("in player-confirmed-answers");
		playerConfirmedAnswers(io, socket, dirtyAnswerIDS);
	});

	socket.on('master-confirmed-winner', async (dirtyWinnerID) => {
		masterConfirmedWinner(io, socket, dirtyWinnerID);
	});

	socket.on('disconnect', () => {
		disconnectUser(io, socket);
	}); 

}); //End of connection scope.



// Custom Functions area

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

async function joinUser(io, socket, dirtyUserID){
	//Never use the dirty user ID in SQL queries!
		//Sanitise Input
		let userID = dirtyUserID.replace(/[^0-9]/g, '');
		//if userID is more than 9.9... Billion, it's defintely invalid.
		if(userID.length > 10){userID = null};

		userID = parseInt(userID, 10);
		(async () => {
			gameID = await mysqlSelect("game_id", "players", "id", userID);
			//Returns array of objects
			//First result (row); attribute: game_id
			gameID = gameID[0].game_id;
			gameID = parseInt(gameID, 10);

			if(userID === NaN){
				//Reject bad input
				socket.join("dodgyID");
				io.in("dodgyID").emit('dodgyID');
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
				io.in(gameID).emit('joinRoomSuccess');

				//Let everyone in room know the updated connected users list.
				emitPlayersInLobby(io, gameID);
			}

			(async () => {
				const queryValues = ["id", "players", "game_id", gameID, "connected", 1];
				const connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
				//Returns array of objects
				if(connectedPlayers.length > 1){
					io.in(gameID).emit('enableGameStart');
				} else {
					io.in(gameID).emit('disableGameStart');
					
				}
			 })();
			
		 })();
}

async function disconnectUser(io, socket){
	if (socket.userID != null) {
		console.log("There is a session: UserID:" + socket.userID + " GameID:" + socket.gameID);
		console.log("A user (" + socket.userID + ") is disconnecting");

		//Create set timeout to disconnect after a few seconds
		const disconnectTimer = setTimeout(async function(io, userID, gameID){
			

			//Deal with host disconnects
			console.log("disconnectTimer triggered");
			isHost = await mysqlSelect("ishost", "players", "id", userID);
			//Returns array of objects
			//First row, isHost attribute.
			isHost = isHost[0].ishost;

			console.log(userID + "'s Host status: '" + isHost + "'");

			let queryValues;
			let playersLeft;

			if (isHost==1){
				console.log("isHost==1");

				queryValues = ["id", "fullname", "players", "game_id", gameID, "connected", 1, "ishost", 0, "created_at"];
				playersLeft = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
				
				console.log("Players Left obj: " + JSON.stringify(playersLeft));
			
				if(playersLeft.length!==0){
					const newHost = [playersLeft[0].id, playersLeft[0].fullname];
					console.log("newHostArr=" + JSON.stringify(newHost))

					await mysqlUpdate("players", "ishost", 1, "id", newHost[0]);
					await mysqlUpdate("players", "ishost", 0, "id", userID);
					console.log(userID + " lost Host privilege to " + newHost[0]);
					io.in(gameID).emit('newHost', newHost);
				} else {
					console.log("Everyone left!")

					//Delete everything related to this game!


				}
			}


			//Deal with question master disconnects

			isMaster = await mysqlSelect("ismaster", "players", "id", userID);
			//Returns array of objects
			//First row, isHost attribute.
			isMaster = isMaster[0].ismaster;

			console.log(userID + "'s Host status: '" + isMaster + "'");

			if (isMaster==1){
				console.log("isMaster==1");

				queryValues = ["id", "fullname", "players", "game_id", gameID, "connected", 1, "ismaster", 0, "created_at"];
				playersLeft = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
				
				console.log("Players Left obj: " + JSON.stringify(playersLeft));
			
				if(playersLeft.length!==0){
					const newMaster = [playersLeft[0].id, playersLeft[0].fullname];
					console.log("newMasterArr=" + JSON.stringify(newMaster));

					
					//Find this master's state.
					//Give the master no-state.
					const oldMasterState = await mysqlSelect("state", "players", "id", userID);
					updatePlayerStates(socket, "no-state");

					//Change masters
					await mysqlUpdate("players", "ismaster", 1, "id", newMaster[0]);
					await mysqlUpdate("players", "ismaster", 0, "id", userID);
					console.log(userID + " lost Master privilege to " + newMaster[0]);

					//Give the new master that state
					updatePlayerStates(socket, oldMasterState[0].state)

					io.in(gameID).emit('newMaster', newMaster);
				} else {
					console.log("Everyone left!")

					//Delete everything related to this game!


				}
			}





			//Mark them as disconnected in DB.
			await mysqlUpdate("players", "connected", 0, "id", userID);
			
			//Update front-end player list.
			emitPlayersInLobby(io, gameID);

			queryValues = ["id", "players", "game_id", gameID, "connected", 1];
			connectedPlayers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
			//Returns array of objects
			if(connectedPlayers.length > 1){
				io.in(gameID).emit('enableGameStart');
			} else {
				io.in(gameID).emit('disableGameStart');
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
	
		}, 60000, io, socket.userID, socket.gameID);
		// Important to pass the user data to the timer function!

		timeouts.push(disconnectTimer);
		timeoutUserIDPivot.push(socket.userID);
		console.log("Timer pushed.");

	} else {
		console.log("There was no session. Exiting disconnectTimer function.");
		return;
	}
}

async function masterPickedQuestion(io, socket, dirtyQuestionID){
	await updatePlayerStates(socket, "master-waiting-for-answers", "player-needs-answers");
	await calculateAndScoreQuestion(socket, dirtyQuestionID);

	requestStateUpdate(io, socket);
}

function requestStateUpdate(io, socket){
	//Timeout to let the dust settle and avoid errors due to incomplete database updates.
	setTimeout((socket, io) => {
		io.in(socket.gameID).emit('update-your-state');
	}, 2000, socket, io);
}

async function playerConfirmedAnswers(io, socket, dirtyAnswerIDS){
	console.log("in playerConfirmedAnswers");
	if(dirtyAnswerIDS.length === 2){
		dirtyAnswerIDS[0] = String(dirtyAnswerIDS[0]);
		dirtyAnswerIDS[1] = String(dirtyAnswerIDS[1]);
		if ((! dirtyAnswerIDS[0].match(/^[a-z0-9]+$/i)) || (! dirtyAnswerIDS[1].match(/^[a-z0-9]+$/i)) ) {
			return;
		}
	} else if(dirtyAnswerIDS.length === 1){
		dirtyAnswerIDS[0] = String(dirtyAnswerIDS[0]);
		if (!dirtyAnswerIDS[0].match(/^[a-z0-9]+$/i)) {
			return;
		}
	} else {
		return;
	}
	console.log("in playerConfirmedAnswers -MADE IT THROUGH CHECKS.");
	updatePlayerStates(socket, null, "player-has-answered", true);

	//Check if everyone has answered yet
	let queryValues = ["id", "players", "game_id", gameID, "connected", 1, "ismaster", 0, "state", "player-has-answered", "created_at"];
	let playersAnswered = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);

	queryValues = ["id", "players", "game_id", gameID, "connected", 1, "ismaster", 0, "created_at"];
	let playersConnected = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);

	if(playersConnected.length === playersAnswered.length){
		updatePlayerStates(socket, "master-needs-answers", "player-waiting-for-results");
		requestStateUpdate(io, socket);
	}

	//if we made it this far, input is clean
	const answerIDS = dirtyAnswerIDS;

	await processConfirmedPlayerAnswers(socket, answerIDS);
	console.log("finished processing confrimed answers");
	showCardBacks(io, socket, answerIDS.length);
	console.log("finished showing card Backs");
}

async function masterConfirmedWinner(io, socket, dirtyWinnerID){
	console.log("master-confirmed-winner");

	if(dirtyWinnerID.length > 10){
			return;
	} else if(dirtyWinnerID !== null){
		if (!String(dirtyWinnerID).match(/^[0-9]+$/i)) {
			return;
		}
	} else {
		return;
	}

	console.log("Dirty Winner Id PASSED");
	//if we made it this far, input is clean
	const winnerID = dirtyWinnerID;

	scoreWinner(socket, winnerID);

	await processConfirmedWinner(socket, winnerID);
	console.log("finished processing confrimed winners");

	await updatePlayerStates(socket, "master-winner-chosen", "player-winner-chosen");

	requestStateUpdate(io, socket);

}











async function emitPlayersInLobby(io, gameID){
		const queryValues = ["id", "fullname", "score", "ismaster", "players", "game_id", gameID, "connected", 1];
		const connectedPlayers = await mysqlCustom("SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY score DESC", queryValues);
	
		io.in(gameID).emit('playersInLobby', connectedPlayers);

}

function requestRefresh(io, socket, gameID = null){
	if(gameID === null){
		//emit refresh to socket.
		socket.emit('refresh');
	} else {
		//emit refresh to room.
		io.in(gameID).emit('refresh');
	}
}

function alertSocket(socket, message){
	// setTimeout(function (socket) {
		socket.emit('alert-socket', message);
	// }, 3000, socket);
}

async function updatePlayerStates(socket, masterState = null, playerState = null, justMe = false){
	if(justMe === true){
		await mysqlUpdate("players", "state", playerState, "id", socket.userID);
		return;
	}
	const queryValues = ["id", "ismaster", "players", "game_id", socket.gameID, "connected", 1 ];
	const playersInGame = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ", queryValues);
	//Returns array of objects
	
	for(i=0;i<playersInGame.length;i++){
		if (playersInGame[i].ismaster == 1 && masterState !== null){
			await mysqlUpdate("players", "state", masterState, "id", playersInGame[i].id);
		} 
		if (playersInGame[i].ismaster == 0 && playerState !== null) {
			await mysqlUpdate("players", "state", playerState, "id", playersInGame[i].id);
		}
	}

	//reset the timer
	resetTimer(io, socket);

}

//Game states logic

async function startGame(io, socket, masterID = null){
	console.log("In start game!!!");
	if(socket.userID == null){
		return;
	}
		const gameID = socket.gameID;

		let userID = socket.userID;

		if(masterID != null){userID = masterID};

		// isHost = await mysqlSelect("ishost", "players", "id", userID);
		// //Returns array of objects
		// //First row, ismaster attribute.
		// isHost = isHost[0].ishost;		

		// //Make sure this user is actually master otherwise request refresh.
		// if (isHost != 1){
		// 	return;
		// }
		isMaster = await mysqlSelect("ismaster", "players", "id", userID);
		//Returns array of objects
		//First row, ismaster attribute.
		isMaster = isMaster[0].ismaster;		

		//Make sure this user is actually master otherwise request refresh.
		if (isMaster != 1){
			return;
		}

		console.log("Is Host, Starting Game!")
		const queryValues = ["rounds", "game_id", gameID];
		await mysqlCustom("INSERT INTO ?? (??) VALUES (?);", queryValues);
		
		await mysqlUpdate("games", "started", 1, "id", gameID);
		
		//For each player, set their new game state.
		//updatePlayerState(gameID, masterState, playerState)
		await updatePlayerStates(socket, "master-needs-questions", "player-waiting-for-question")

		//Tell everyone to refresh so laravel loads the game view.
		setTimeout((io, gameID) => {
			requestRefresh(io, socket, gameID);
		}, 1000, io, gameID);
		
	
}

function showPlayerQuestionWaitingScreen(socket) {
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/player-wait-for-question.html"), 'utf8');
		console.log("File read");
		// setTimeout((socket) => {
		socket.emit("load-new-state", data);
		// }, 500, socket);
	} catch(e) {
		// alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
		console.log('Error:', e.stack);
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
	queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const roundID = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
	

	queryValues = ["id", "question", "blanks", "questions", "score", averageScore];
	let topRandonQuestions = await mysqlCustom("SELECT DISTINCT ??, ??, ?? FROM ?? WHERE ?? >= ? ORDER BY RAND() LIMIT 7", queryValues);
	let lowRandomQuestions = await mysqlCustom("SELECT DISTINCT ??, ??, ?? FROM ?? WHERE ?? <= ? ORDER BY RAND() LIMIT 3", queryValues);
	let questions = topRandonQuestions;
	questions = questions.concat(lowRandomQuestions);
	shuffle(questions);

	//Make data for new game state
	let questionsInsert = "";
	for(i=0;i<questions.length;i++){
		
		const queryValues = ["round_question", "round_id", "question_id", roundID[0].id, questions[i].id];
		mysqlCustom("INSERT INTO ?? (??, ??) VALUES (?, ?);", queryValues);
		
		
		// <div class="col-6 col-sm-4 col-lg-3">
		questionsInsert += `
		<a class="click-card" id="question-${questions[i].id}" onclick="pickQuestion(${questions[i].id})" href="#">
		<div class="card game-card question-card hover-effect-grow ">
		   <div class="card-body game-card-body p-2">
			  <div class="card-text-answer">
				  ${questions[i].question}
			  </div>
			  <div class="hateful-watermark">
			 	 hateful.io
		 	  </div>
			  <div class="pick-indicator">
				  (Pick ${questions[i].blanks})
			  </div>
		   </div>
		 </div>
		</a>
		`
		
		// </div>


	}

	let data = `
	<h1 class="mb-3">Pick a question</h1>
	<div id="answer-table" class="row mt-2 text-center">
    <div class="col-12">
			${questionsInsert}
    </div>
	</div>
	`

	socket.emit("load-new-state", data);
}

async function calculateAndScoreQuestion(socket, dirtyQuestionID){
	console.log("Dirty question ID: '" + dirtyQuestionID + "'");
	//Make sure user is indeed master!
	console.log("In master-picked-question")
	let questionID = 0;

	//If question id has more than 10 digits it's definetely invalid!
	if (dirtyQuestionID.toString().length < 10){
		// try {
			//If it can't be parsed into an integer it's also definetely invalid!
			 questionID = parseInt(dirtyQuestionID);
			console.log("Set Clean Question ID")

		//   }
		//   catch(err) {
		// 	console.log("Invalid picked question ID!")
		// 	return;
		//   }
	} else {
		console.log("Dirty Question ID too long!")

		return;
	}

	if (socket.userID == null) {
		console.log("Returned out of masterpickedquestion... no user session.")

		return;
	}

	//Update round with chosen question
	mysqlUpdate("rounds", "question_id", questionID, "game_id", socket.gameID)
	
			//Score question against offered questions

	//Select latest round
	let queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const roundID = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1;", queryValues);

	//Select all offered questions data
	queryValues = [roundID[0].id];
	const offeredQuestions = await mysqlCustom("SELECT questions.id, questions.score FROM questions INNER JOIN round_question ON questions.id = round_question.question_id WHERE round_question.round_id = ?", queryValues);

	//Select winning question data
	queryValues = ["id", "score", "questions", "id", questionID];
	const chosenQuestion = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ?;", queryValues);

	scoreCard(chosenQuestion, offeredQuestions, "questions");
}

async function scoreCard(winnerCard, offeredCards, table, questionID = null) {
	let offeredQuestionsTotalScore = 0;
	let winProbability = 0;
	let newRating = 0;
	let queryValues;
	let affectedRows;
	
	for (let index = 0; index < winnerCard.length; index++) {

		//Score losing cards
		for(let i=0;i<offeredCards.length;i++){
			//Skip the winning card from looser calculations.
			if(offeredCards[i].id !== winnerCard[index].id){
				offeredQuestionsTotalScore += offeredCards[i].score;
				//calculate score for each losing card against chose card
				//Calculate Probability of current card winning against winner:
				winProbability = 1 / ( 1 + (10**((winnerCard[index].score - offeredCards[i].score)/400)));
				newRating = offeredCards[i].score + (32*(0 - winProbability));
				console.log(offeredCards[i].score + " =lose=> " + newRating + " P=" + winProbability);

				
				if(questionID !== null){
					
					queryValues = [table, "score", newRating, "question_id", questionID, "answer_id", offeredCards[i].id];
					affectedRows = await mysqlCustom("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?;", queryValues);

					if(parseInt(affectedRows.affectedRows) == 0){
						queryValues = [table, "question_id", "answer_id", "score", questionID, offeredCards[i].id, newRating];
						mysqlCustom("INSERT INTO ??(??,??,??) VALUES(?,?,?);", queryValues);
					}
								
				} else {
					mysqlUpdate(table, "score", newRating, "id", offeredCards[i].id);
				}
			}
		}

	//Calculate average score of loosers
	offeredCardsScoreAVG = offeredQuestionsTotalScore / (offeredCards.length - 1);
	//calculate chosen card score against average of cards offered.
	
		winProbability = 1 / ( 1 + (10**((offeredCardsScoreAVG - winnerCard[index].score)/400)));
		newRating = winnerCard[index].score + (32*(1 - winProbability));
		console.log(winnerCard[index].score + " =win=> " + newRating  + " P=" + winProbability)

		if(questionID !== null){

			queryValues = [table, "score", newRating, "question_id", questionID, "answer_id", winnerCard[index].id];
			affectedRows = await mysqlCustom("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?;", queryValues);

			if(parseInt(affectedRows.affectedRows) == 0){
				queryValues = [table, "question_id", "answer_id", "score", questionID, winnerCard[index].id, newRating];
				mysqlCustom("INSERT INTO ??(??,??,??) VALUES(?,?,?);", queryValues);
			}
						

		} else {
			mysqlUpdate(table, "score", newRating, "id", winnerCard[index].id);
		}

	}
	
}

async function getPlayerAnswers(socket) {
	console.log(socket.userID + "GETTING ASNWERS START TIME=" + Date.now())

		//make sure theyre not master
		isMaster = await mysqlSelect("ismaster", "players", "id", socket.userID);
		//Returns array of objects
		//First row, ismaster attribute.
		isMaster = isMaster[0].ismaster;
		
		if(isMaster == 1){
			return;
		}

	let queryValues;

	//Get current question
	//Select latest round & question
	queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);


	//If player already has cards for this round. show those and exit
	queryValues = ["answer_id", "round_answer", "round_id", latestRound[0].id, "player_id", socket.userID];
	const alreadyOfferedAnswers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	 
	if(alreadyOfferedAnswers.length > 2){
		showPlayerAnswers(socket);
		return;
	}

	//Get average score for answers for this question
	queryValues = ["score", "question_answer", "question_id", latestRound[0].question_id];
	let averageScore = await mysqlCustom("SELECT AVG(??) FROM ?? WHERE ?? = ?", queryValues);
	averageScore = Object.values(averageScore[0]);
	averageScore = parseInt(averageScore);
	console.log("average score=" + averageScore);
	if(Number.isNaN(averageScore)){
		averageScore = 1000;
	}


	////////////////////////////
	// In future, you will need to do individual selects for each card
	// and write them into round_answer immediately after each select
	// in order to avoid players being given the same card
	////////////////////////////

	//Get best answers for that question from question_answers except answers already offered.
	queryValues = ["answer_id", "question_answer", "score", averageScore, "question_id", latestRound[0].question_id, "answer_id", "round_answer", "round_id", latestRound[0].id];
	const topRandomAnswers = await mysqlCustom("SELECT DISTINCT ?? AS id FROM ?? WHERE ?? >= ? AND ?? = ? EXCEPT SELECT ?? AS id FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT 3", queryValues);
	console.log("topRandomAnswers=" + topRandomAnswers.length)

	//Get Worst answers for that question to give them a chance except answers already offered.
	const lowRandomAnswers = await mysqlCustom("SELECT DISTINCT ?? AS id FROM ?? WHERE ?? <= ? AND ?? = ? EXCEPT SELECT ?? AS id FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT 2", queryValues);
	console.log("lowRandomAnswers=" + lowRandomAnswers.length)
	
	//Add a random player name from the game as an answer except answers already offered.
	queryValues = ["id", "players", "id", socket.userID, "game_id", socket.gameID, "player_roaster_id", "round_answer", "round_id", latestRound[0].id, "player_roaster_id"];
	const roasterNameAnswer = await mysqlCustom("SELECT DISTINCT ?? FROM ?? WHERE ?? <> ? AND ?? = ? EXCEPT SELECT ?? AS id FROM ?? WHERE ?? = ? AND ?? IS NOT NULL ORDER BY RAND() LIMIT 1", queryValues);
	console.log("roasterNameAnswer=" + roasterNameAnswer.length)
	
	//Pad out answers with random answers (except answers already offered) from "answers" in case that question has not enough scored answers.
	const answersMissing = 9 - (topRandomAnswers.length + lowRandomAnswers.length + 1);
	console.log("Answers Missing=" + answersMissing)

	queryValues = ["id", "answers", "answer_id", "round_answer", "round_id", latestRound[0].id, answersMissing];
	const randomPaddingAnswers = await mysqlCustom("SELECT DISTINCT ?? FROM ?? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT ?", queryValues);
	console.log("randomPaddingAnswers=" + randomPaddingAnswers.length)

	let answerIDS = topRandomAnswers;
	answerIDS = answerIDS.concat(lowRandomAnswers);
	answerIDS = answerIDS.concat(randomPaddingAnswers);
	console.log("answerIDS=" + JSON.stringify(answerIDS));


	//Add offered answers to round_answers to avoid repeats and score answer later
	queryValues = ["round_answer", "round_id", "player_roaster_id", "player_id", latestRound[0].id, roasterNameAnswer[0].id, socket.userID];
	await mysqlCustom("INSERT INTO ?? (??, ??, ??) VALUES (?, ?, ?);", queryValues);
	let debuggingAnswerInserts = 1;
	for(i=0; i<answerIDS.length; i++){
		console.log("answerIDS["+i+"]=" + JSON.stringify(answerIDS[i]));
		queryValues = ["round_answer", "round_id", "answer_id", "player_id", latestRound[0].id, answerIDS[i].id, socket.userID];
		mysqlCustom("INSERT INTO ?? (??, ??, ??) VALUES (?, ?, ?);", queryValues);
		debuggingAnswerInserts += 1;
	}
	console.log("answerInserts=" + debuggingAnswerInserts)

	//Timeout to allow inserts to finish inserting
	setTimeout((socket) => {
		showPlayerAnswers(socket);
	}, 1500, socket);

	console.log(socket.userID + "GETTING ASNWERS END TIME=" + Date.now())

	return;
}

async function showPlayerAnswers(socket){
		//make sure theyre not master
	// isMaster = await mysqlSelect("ismaster", "players", "id", socket.userID);
	// //Returns array of objects
	// //First row, ismaster attribute.
	// isMaster = isMaster[0].ismaster;
	
	// if(isMaster == 1){
	// 	return;
	// }

	//Get answers from round_answer from latest round where user = socket.userID

	//Get latest round
	let queryValues;

	//Get current question
	//Select latest round & question
	queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);

	//get round_answer rows for this round and user.
	queryValues = ["answer_id", "player_roaster_id", "round_answer", "round_id", latestRound[0].id, "player_id", socket.userID];
	const playerAnswers = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY RAND()", queryValues);
	console.log("playerAnswers=" + playerAnswers.length)

	//Create cards insert
	let answersInsert = "";
	let currentAnswerText = "";
	for (let i = 0; i < playerAnswers.length; i++) {
		//Check if roaster card or not.
		if(playerAnswers[i].answer_id != null){
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await mysqlSelect("answer", "answers", "id", playerAnswers[i].answer_id);
			currentAnswerText = currentAnswerText[0].answer;
			answersInsert += `<a class="click-card answer-not-selected" id="answer-${playerAnswers[i].answer_id}" onclick="pickAnswer(${playerAnswers[i].answer_id})" href="#">`
		} else {
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await mysqlSelect("fullname", "players", "id", playerAnswers[i].player_roaster_id);
			currentAnswerText = "<span class='text-capitalize'>" + currentAnswerText[0].fullname + ". </span>";
			answersInsert += `<a class="click-card answer-not-selected" id="roaster-answer-${playerAnswers[i].player_roaster_id}" onclick="pickAnswer(${playerAnswers[i].player_roaster_id}, 'player-name-roaster')" href="#">`
		}
		answersInsert += `
		<div class="card game-card answer-card hover-effect-grow">
		   <div class="card-body game-card-body p-2">
			  <div class="card-text-answer">
				  ${currentAnswerText}
			  </div>
			  <div class="hateful-watermark">
			  hateful.io
		 	  </div>
		   </div>
		 </div>
		</a>
		`
	}

	const answerCards = `

				<a onclick="$('#myModal').modal(true)" id="answer-custom" class="click-card answer-not-selected" href="#">
					<div class="card game-card answer-card hover-effect-grow ">
						<div class="card-body game-card-body p-2">
							<div class="card-text-answer text-center" >
								<br>
								<div style="font-size: 2.5rem; font-weight: 300;"><i class="fas fa-plus"></i></div>
								Write your own.
							</div>
							<div class="hateful-watermark">
							hateful.io
							 </div>
						</div>
					</div>
				</a>
				${answersInsert}
	`;

	socket.emit('show-player-answers', answerCards);

}

async function emitToPlayers(socket, event, data){
	isMaster = await mysqlSelect("ismaster", "players", "id", socket.userID);
	//Returns array of objects
	//First row, ismaster attribute.
	isMaster = isMaster[0].ismaster;
	
	if(isMaster == 1){
		socket.broadcast.emit(event, data);
	} else {
		socket.emit(event, data);
	}
}

async function getRoundQuestion(socket, self = null){
//Get current question
	//Select latest round & question
	queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);

	//Get round question text
	queryValues = ["id", "question", "blanks", "questions", "id", latestRound[0].question_id];
	const roundQuestion = await mysqlCustom("SELECT ??, ??, ?? FROM ?? WHERE ?? = ? LIMIT 1", queryValues);

	console.log(JSON.stringify(roundQuestion));

	const questionCard = `
	<div id="question-blanks" class="d-none">${roundQuestion[0].blanks}</div>
	<div class="card game-card question-card">
	   <div class="card-body game-card-body p-2">
		  <div class="card-text-answer">
			  ${roundQuestion[0].question}
		  </div>
		  <div class="hateful-watermark">
		  hateful.io
		   </div>
		   <div class="pick-indicator">
		   (Pick ${roundQuestion[0].blanks})
	   </div>
	   </div>
	 </div>
	`
	if(self === "self"){
		socket.emit('show-player-question', questionCard);
	} else {
		emitToPlayers(socket, "show-player-question", questionCard);
	}


}

function showMainGameTemplate(socket, toSelf = null){
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/player-main-game.html"), 'utf8');
		console.log("File read");
		// setTimeout((socket) => 
		if(toSelf === "self"){
			socket.emit('load-new-state', data);
		} else {
			emitToPlayers(socket, "load-new-state", data);
		}
		// }, 500, socket);
	} catch(e) {
		alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
		console.log('Error:', e.stack);
	}
}


function showMasterAnswerWaitingScreen(socket){
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/master-wait-for-answers.html"), 'utf8');
		console.log("File read");
		// setTimeout((socket) => {
		socket.emit("load-new-state", data);
		// }, 500, socket);
	} catch(e) {
		alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
		console.log('Error:', e.stack);
	}
}

function newPlayerWaitForNextRound(socket){
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/new-player-waiting.html"), 'utf8');
		console.log("File read");
		// setTimeout((socket) => {
		socket.emit("load-new-state", data);
		// }, 500, socket);
	} catch(e) {
		alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
		console.log('Error:', e.stack);
	}
}

async function processConfirmedPlayerAnswers(socket, answerIDS) {
	console.log("processConfirmedPlayerAnswers, answerIDS:" + JSON.stringify(answerIDS));

	queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);

	// queryValues = ["id", "blanks", "questions", "id", latestRound[0].question_id];
	// const roundQuestion = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? LIMIT 1", queryValues);

	//Select all offered answers data
	queryValues = [latestRound[0].question_id, latestRound[0].id, socket.userID];
	const offeredAnswersFromQuestionAnswer = await mysqlCustom("SELECT answers.id, question_answer.score FROM answers, question_answer, round_answer WHERE question_answer.answer_id = answers.id AND question_answer.question_id = ? AND answers.id = round_answer.answer_id AND round_answer.round_id = ? AND round_answer.player_id = ?", queryValues);

	let offeredAnswers;
	if (offeredAnswersFromQuestionAnswer.length !== 0){
		offeredAnswers = offeredAnswersFromQuestionAnswer;
	} else {
		queryValues = [latestRound[0].id, socket.userID];
		offeredAnswers = await mysqlCustom("SELECT answers.id, answers.score FROM answers, round_answer WHERE answers.id = round_answer.answer_id AND round_answer.round_id = ? AND round_answer.player_id = ?", queryValues);
	}

	console.log("offeredanswers===" + offeredAnswers);

	//Score answer
	for (let i = 0; i < answerIDS.length; i++) {
		if(answerIDS[i].includes("roaster")){

			//Shortlist answer
			const playerRoasterID = answerIDS[i].replace('roaster','');
			queryValues = ["round_answer", "shortlisted", 1, "order", i, "round_id", latestRound[0].id, "player_id", socket.userID, "player_roaster_id", playerRoasterID];
			mysqlCustom("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? AND ?? = ? AND ?? = ? ", queryValues);
			
			//No need to score it
		} else {

			//Shortlist answer
			queryValues = ["round_answer", "shortlisted", 1, "order", i, "round_id", latestRound[0].id, "player_id", socket.userID, "answer_id", answerIDS[i]];
			mysqlCustom("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? AND ?? = ? AND ?? = ? ", queryValues);

			//score answer
			
			//Select winning question data
			//Check if answer has a score against the question. if so, use question answer score
			queryValues = [answerIDS[i], latestRound[0].question_id];
			const questionAnswerScore = await mysqlCustom("SELECT answers.id, question_answer.score FROM answers, question_answer WHERE answers.id = ? AND question_answer.answer_id = answers.id AND question_answer.question_id = ? ;", queryValues);

			let chosenAnswers;
			if (questionAnswerScore.length !== 0){
				chosenAnswers = questionAnswerScore;
			} else {
				queryValues = [answerIDS[i]];
				chosenAnswers = await mysqlCustom("SELECT answers.id, answers.score FROM answers WHERE answers.id = ?;", queryValues);
			}
			
			setTimeout(() => {
				
			console.log("Chosen Answer(s): " + chosenAnswers);
			}, 1000);

			scoreCard(chosenAnswers, offeredAnswers, "question_answer", latestRound[0].question_id);
		}
	}
}

async function processConfirmedWinner(socket, winnerID) {
	console.log("processConfirmedWinner, winnerID:" + JSON.stringify(winnerID));

	queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);

	// queryValues = ["id", "blanks", "questions", "id", latestRound[0].question_id];
	// const roundQuestion = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? LIMIT 1", queryValues);

	//Select the shortlisted answers
	queryValues = [latestRound[0].id, latestRound[0].question_id];
	const shortlistedAnswersFromQuestionAnswer = await mysqlCustom(`
	SELECT round_answer.answer_id, question_answer.score 
	FROM round_answer, question_answer
	WHERE round_answer.round_id = ? AND round_answer.shortlisted = 1 AND question_answer.answer_id = round_answer.answer_id AND question_answer.question_id = ?
	`, queryValues);


	let offeredAnswers;
	let winnerAnswers;
	let winnerRoasters;

	if (shortlistedAnswersFromQuestionAnswer.length !== 0){
		//Score from Question Answer found!
		offeredAnswers = shortlistedAnswersFromQuestionAnswer;
		
		//Select the winner answers (shortlisted by the winner)
		queryValues = [latestRound[0].id, winnerID, latestRound[0].question_id];
		winnerAnswers = await mysqlCustom(`
		SELECT round_answer.answer_id, round_answer.player_roaster_id, question_answer.score 
		FROM round_answer, question_answer 
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND question_answer.answer_id = round_answer.answer_id AND question_answer.question_id = ?
		;
		`, queryValues);

		queryValues = [latestRound[0].id, winnerID];
		winnerRoasters = await mysqlCustom(`
		SELECT round_answer.player_roaster_id 
		FROM round_answer 
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND round_answer.player_roaster_id IS NOT NULL
		;
		`, queryValues);

	} else {
		//No score from Question Answer found. Using default from answers table

		queryValues = [latestRound[0].id];
		offeredAnswers = await mysqlCustom("SELECT answers.id, answers.score FROM answers, round_answer WHERE answers.id = round_answer.answer_id AND round_answer.round_id = ? AND round_answer.shortlisted = 1", queryValues);
		//Select the winner answers (shortlisted by the winner)
		queryValues = [latestRound[0].id, winnerID];
		winnerAnswers = await mysqlCustom(`
		SELECT round_answer.answer_id, round_answer.player_roaster_id, answers.score
		FROM round_answer, answers
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND answers.id = round_answer.answer_id
		`, queryValues);

		queryValues = [latestRound[0].id, winnerID];
		winnerRoasters = await mysqlCustom(`
		SELECT round_answer.player_roaster_id
		FROM round_answer
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND round_answer.player_roaster_id IS NOT NULL;
		;
		`, queryValues);
		
	}	

	winnerAnswers = winnerAnswers.concat(winnerRoasters);
	console.log("winner answers" + JSON.stringify(winnerAnswers));

	console.log("offeredanswers===" + offeredAnswers);


	//Score answer
	for (let i = 0; i < winnerAnswers.length; i++) {
		if(winnerAnswers[i].answer_id == null){

			//Make Answer Winner
			queryValues = ["round_answer", "iswinner", 1, "round_id", latestRound[0].id, "player_roaster_id", winnerAnswers[i].player_roaster_id, "player_id", winnerID];
			mysqlCustom("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?  AND ?? = ?", queryValues);
			
			//No need to score it
		} else {

			//Make Answer Winner
			queryValues = ["round_answer", "iswinner", 1, "round_id", latestRound[0].id, "answer_id", winnerAnswers[i].answer_id, "player_id", winnerID];
			mysqlCustom("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ? AND ?? = ?", queryValues);

			//score answer
			
			// //Select winning question data
			// //Check if answer has a score against the question. if so, use question answer score
			// queryValues = [winnerAnswers[i], latestRound[0].question_id];
			// const questionAnswerScore = await mysqlCustom("SELECT answers.id, question_answer.score FROM answers, question_answer WHERE answers.id = ? AND question_answer.answer_id = answers.id AND question_answer.question_id = ? ;", queryValues);

			// let chosenAnswers;
			// if (questionAnswerScore.length !== 0){
			// 	chosenAnswers = questionAnswerScore;
			// } else {
			// 	queryValues = [answerIDS[i]];
			// 	chosenAnswers = await mysqlCustom("SELECT answers.id, answers.score FROM answers WHERE answers.id = ?;", queryValues);
			// }
			
			// setTimeout(() => {
				
			// console.log("Chosen Answer(s): " + chosenAnswers);
			// }, 1000);

			scoreCard(winnerAnswers[i], offeredAnswers, "question_answer", latestRound[0].question_id);
		}
	}
}

async function showCardBacks(io, socket, cardBacks){
	console.log("Card Backs to show: " + cardBacks )

	queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);


	queryValues = ["id", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
	const shortlistedAnswers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);

	console.log("Shortlsited Answers: " + JSON.stringify(shortlistedAnswers));

	let shortlistedAnswerSets = shortlistedAnswers.length / cardBacks;

	let cardBacksView = "";
	for (let index = 0; index < shortlistedAnswerSets; index++) {
		console.log("Iteration of cardbackview +");
		cardBacksView += `
		<div class="card-back-answer-group cards-back-master">
			<div class="card game-card card-back">
				<div class="card-body game-card-body p-2">
					<div class="card-text-answer">
						hateful.io
					</div>
				</div>
			</div>
		`		
		if(cardBacks === 2){
			cardBacksView += `
			<div class="card game-card card-back pick-2-back">
				<div class="card-body game-card-body p-2">
					<div class="card-text-answer">
						hateful.io
					</div>
				</div>
			</div>
			`	
		}
		
		cardBacksView += `</div>`;
	}

	io.in(socket.gameID).emit('update-card-backs', cardBacksView);


		
}

function showPlayerAnswerWaiting(socket){
	const data = `
	<div class="spinner-border m-4" style="float: left;" role="status">
    <span class="sr-only">Loading...</span>
</div>
<h1 class="mt-3" style="display:inline-block; position: absolute;">Waiting for other players to answer...</h1>
	`	
	//Show this player the text above
	socket.emit('show-player-answers', data);
}

async function getMasterAnswers(socket){

	//make sure theyre master
	isMaster = await mysqlSelect("ismaster", "players", "id", socket.userID);
	//Returns array of objects
	//First row, ismaster attribute.
	isMaster = isMaster[0].ismaster;
	
	if(isMaster != 1){
		return;
	}

	//Get answers from round_answer from latest round where user = socket.userID

	//Get latest round
	let queryValues;

	//Get current question
	//Select latest round
	queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);

	//get shortlisted round_answer rows for this round.
	queryValues = ["answer_id", "player_id", "player_roaster_id", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
	const playerAnswers = await mysqlCustom("SELECT ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);
	console.log("shortlistedAnswers=" + playerAnswers.length)

	let blanks = 1;
	let checkForBlanksID = playerAnswers[0].player_id;
	//Start at one because we'e already  ^ checked 0.
	for (let index = 1; index < playerAnswers.length; index++) {
		if (playerAnswers[index].player_id === checkForBlanksID){
			blanks++;
		}
	}

	console.log("Answer grouping container blansk: " + blanks);
	//Create cards insert
	let answersInsert = "<h2 class='mx-1 mb-4'>Pick a winner</h2>";
	let currentAnswerText = "";
	for (let i = 0; i < playerAnswers.length; i++) {

		//Check if roaster card or not.
		if(playerAnswers[i].answer_id != null){
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await mysqlSelect("answer", "answers", "id", playerAnswers[i].answer_id);
			currentAnswerText = currentAnswerText[0].answer;
			if(i===0){
				answersInsert += `<a class="click-card hover-effect-grow answer-grouping-container answer-not-selected" id="answer-${playerAnswers[i].player_id}" onclick="pickWinner(${playerAnswers[i].player_id})" href="#">`;
			}
			if(i % blanks === 0 && i !== 0 && i !== playerAnswers.length){
				answersInsert += `</a><a class="click-card hover-effect-grow answer-grouping-container answer-not-selected" id="answer-${playerAnswers[i].player_id}" onclick="pickWinner(${playerAnswers[i].player_id}, null, 'shortlisted')" href="#">`;
			}
		} else {
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await mysqlSelect("fullname", "players", "id", playerAnswers[i].player_roaster_id);
			currentAnswerText = "<span class='text-capitalize'>" + currentAnswerText[0].fullname + ". </span>";
			// answersInsert += `<a class="click-card answer-not-selected" id="roaster-answer-${playerAnswers[i].player_roaster_id}" onclick="pickAnswer(${playerAnswers[i].player_roaster_id}, 'player-name-roaster', 'shortlisted')" href="#">`;
			if(i===0){
				answersInsert += `<a class="click-card hover-effect-grow answer-grouping-container answer-not-selected" id="answer-${playerAnswers[i].player_id}" onclick="pickWinner(${playerAnswers[i].player_id})" href="#">`;
			}
			if(i % blanks === 0 && i !== 0 && i !== playerAnswers.length){
				answersInsert += `</a><a class="click-card hover-effect-grow answer-grouping-container answer-not-selected" id="answer-${playerAnswers[i].player_id}" onclick="pickWinner(${playerAnswers[i].player_id})" href="#">`;
			}
		}


		answersInsert += `
		<div class="card game-card answer-card">
		   <div class="card-body game-card-body p-2">
			  <div class="card-text-answer">
				  ${currentAnswerText}
			  </div>
			  <div class="hateful-watermark">
			  hateful.io
		 	  </div>
		   </div>
		 </div>
		
		`

	}

	answersInsert += "</a>";



	socket.emit('show-master-answers', answersInsert);

}

function showResultsWaitingScreen(socket){
	const data = `
	<span class="spinner-border m-4" style="display:inline-block" role="status">
    <span class="sr-only">Loading...</span>
</span>
<span class="h1 mt-3" style="display:inline-block; position: absolute" >Waiting for Round Master to pick a winner. </span>

	`	
	socket.emit('load-new-state', data);

}

async function showWinners(socket){

		//Get answers from round_answer from latest round where user = socket.userID
	
		//Get latest round
		let queryValues;
	
		//Get current question
		//Select latest round
		queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);
	
		//get shortlisted round_answer rows for this round.
		queryValues = ["answer_id", "player_roaster_id", "player_id", "iswinner", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
		const playerAnswers = await mysqlCustom("SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);
		console.log("shortlistedAnswers=" + playerAnswers.length)
	



		let blanks = 1;
		let checkForBlanksID = playerAnswers[0].player_id;
		//Start at one because we'e already  ^ checked 0.
		for (let index = 1; index < playerAnswers.length; index++) {
			if (playerAnswers[index].player_id === checkForBlanksID){
				blanks++;
			}
		}
	

		let answersInsert = "";
		let currentAnswerText = "";
		for (let i = 0; i < playerAnswers.length; i++) {
			//Skip --don't print this card if it IS a winner
			if(playerAnswers[i].iswinner == 1){
				continue;
			}


			if(i===0){
				answersInsert += `<div class="answer-grouping-container">`;
			}
			if(i % blanks === 0 && i !== 0 && i !== playerAnswers.length){
				answersInsert += `</div><div class="answer-grouping-container">`;
			}


			//Check if roaster card or not.
			if(playerAnswers[i].player_roaster_id == null){
				//This row has an actual answer
				//Make data for new game state
				let currentAnswerResult = await mysqlSelect("answer", "answers", "id", playerAnswers[i].answer_id);
				currentAnswerText = currentAnswerResult[0].answer;

			} else {
				//This row has an player roaster
				//Make data for new game state
				let currentRoasterResult = await mysqlSelect("fullname", "players", "id", playerAnswers[i].player_roaster_id);
				currentAnswerText = "<span class='text-capitalize'>" + currentRoasterResult[0].fullname + ". </span>";
				// answersInsert += `<a class="click-card answer-not-selected" id="roaster-answer-${playerAnswers[i].player_roaster_id}" onclick="pickAnswer(${playerAnswers[i].player_roaster_id}, 'player-name-roaster', 'shortlisted')" href="#">`;

			}
	
	
			answersInsert += `
			<div class="card game-card answer-card">
			   <div class="card-body game-card-body p-2">
				  <div class="card-text-answer">
					  ${currentAnswerText}
				  </div>
				  <div class="hateful-watermark">
				  hateful.io
				   </div>
			   </div>
			 </div>
			`
	
		}
	
		answersInsert += "</div>";
	
		socket.emit('show-results', answersInsert);

		printWinnerOnTop(socket, playerAnswers);
	}


	async function printWinnerOnTop(socket, playerAnswers){



		let blanks = 1;
		let checkForBlanksID = playerAnswers[0].player_id;
		//Start at one because we'e already  ^ checked 0.
		for (let index = 1; index < playerAnswers.length; index++) {
			if (playerAnswers[index].player_id === checkForBlanksID){
				blanks++;
			}
		}
	


		let answersInsert = "";
		let currentAnswerText = "";
		for (let i = 0; i < playerAnswers.length; i++) {
			//Skip --don't print this card if it aint a winner
			if(playerAnswers[i].iswinner != 1){
				continue;
			}

			if(playerAnswers[i].player_id === socket.userID){
				socket.to(socket.gameID).emit("you-lost");
				socket.emit("you-won");
			}

			//Check if roaster card or not.
			if(playerAnswers[i].answer_id != null){
				//This row has an actual answer
				//Make data for new game state
				currentAnswerText = await mysqlSelect("answer", "answers", "id", playerAnswers[i].answer_id);
				currentAnswerText = currentAnswerText[0].answer;
				if(i===0){
					answersInsert += `<div  style="display: flex; float: left;">`;
				}
				if(i % blanks === 0 && i !== 0 && i !== playerAnswers.length){
					answersInsert += `</div><div  style="display: flex; float: left;">`;
				}
			} else {
				//This row has an actual answer
				//Make data for new game state
				currentAnswerText = await mysqlSelect("fullname", "players", "id", playerAnswers[i].player_roaster_id);
				currentAnswerText = "<span class='text-capitalize'>" + currentAnswerText[0].fullname + ". </span>";
				// answersInsert += `<a class="click-card answer-not-selected" id="roaster-answer-${playerAnswers[i].player_roaster_id}" onclick="pickAnswer(${playerAnswers[i].player_roaster_id}, 'player-name-roaster', 'shortlisted')" href="#">`;
				if(i===0){
					answersInsert += `<div style="display: flex; float: left;">`;
				}
				if(i % blanks === 0 && i !== 0 && i !== playerAnswers.length){
					answersInsert += `</div><div style="display: flex; float: left;">`;
				}
			}
	
	
			answersInsert += `
			<div class="card game-card answer-card">
			   <div class="card-body game-card-body p-2">
				  <div class="card-text-answer">
					  ${currentAnswerText}
				  </div>
				  <div class="hateful-watermark">
				  👑 Winner
				   </div>
				   
			   </div>
			 </div>
			
			`
	
		}
	
		answersInsert += "</div>";
	
		socket.emit('print-winners', answersInsert);
	
	
	}


async function startTimer(io, socket, timerLength = null, action = null){

	socket.emit('times-up');

	//select timer length, timerstart from game table where game id = socket game id
	queryValues = ["timer_start", "timer_length", "games", "id", socket.gameID];
	const mysqlGameTimer = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ?", queryValues);

	console.log("DEBUG: timer_start:" + mysqlGameTimer[0].timer_start + "timer_length:" + mysqlGameTimer[0].timer_length + "-");

	//if timer start + timer length is in past or timer start is null, timer expired -- insert (update) timer
	const endOfTimer = parseInt(mysqlGameTimer[0].timer_start) + parseInt(mysqlGameTimer[0].timer_length);
	const timeLeftOnTimer = endOfTimer - (Date.now()/1000);
	
	console.log("timeLeftOnTimer:" + timeLeftOnTimer);

	if(!(mysqlGameTimer[0].timer_start == null || isNaN(endOfTimer) || timeLeftOnTimer <= 0)){
		//endOfTimer should be a valid time stamp.
		//timer is still current -> (timerstart + timerlength) - current time = time left on timer
		//emit start timer with time left on timer
		socket.emit('start-timer', timeLeftOnTimer);

	} else {
		//Timer hasn't been set or is a dodgy value.

		//If this user already has a game timer, delete it.
		clearTimeout(io.in(socket.gameID).gameTimer);
		io.in(socket.gameID).gameTimer = null

		//Create the timer
		queryValues = ["games", "timer_start", (Date.now()/1000), "timer_length", timerLength, "id", socket.gameID];
		mysqlCustom("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? ", queryValues);

		socket.emit('start-timer', timerLength);

		//Create a new timer
		io.in(socket.gameID).gameTimer = setTimeout((io, socket, action) => {
			console.log("GAME TIMER GONE OFF");
			io.in(socket.gameID).emit('times-up');

			if(action !== null){
				action(io, socket);
			}
			io.in(socket.gameID).gameTimer = null
			//=5 secs to help everyone sync properly.
		}, ((timerLength + 5) * 1000), io, socket, action);

	}

}

function resetTimer(io, socket){
		io.in(socket.gameID).emit('times-up');

		clearTimeout(io.in(socket.gameID).gameTimer);
		io.in(socket.gameID).gameTimer = null

		//clear the timer
		queryValues = ["games", "timer_start", null, "timer_length", null, "id", socket.gameID];
		mysqlCustom("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? ", queryValues);

}

async function newMaster(io, socket, newMaster = null, newHost = false){
	const originalNewMaster = newMaster;

	console.log("In New Master!!!!")

	//Changes master to a new current player
	//If newMaster = winner then the winner of the last round will become master
	//If newMaster is not null, newMaster's value will become the new Master
	//Otherwise a random new master is chosen


	let queryValues;
	let playersLeft;

	//Find old Master
	queryValues = ["id", "players", "ismaster", 1, "game_id", socket.gameID];
	let oldMasterResult = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	const oldMaster = oldMasterResult[0].id;

	//Find old Host
	queryValues = ["id", "players", "ishost", 1, "game_id", socket.gameID];
	let oldHostResult = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	const oldHost = oldHostResult[0].id;

	if(newHost === true && oldMaster === oldHost){
		//Find an appropriate new Host (someone who has most recently connected to this game)
		queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "created_at"];
		playersLeft = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
		
		console.log("Players Left obj: " + JSON.stringify(playersLeft));
	
		if(playersLeft.length!==0){
			let newHost = playersLeft[0].id;
			console.log("newHost=" + newHost);

			await mysqlUpdate("players", "ishost", 1, "id", newHost);
			await mysqlUpdate("players", "ishost", 0, "id", oldHost);
			console.log(oldHost + " lost Host privilege to " + newHost);

			const newHostName = await mysqlSelect("fullname", "players", "id", newHost);
			const newHostData = [newHost, newHostName[0].fullname];
			
			io.in(socket.gameID).emit('newHost', newHostData);
		} 
	}


	if(newMaster==="winner"){
		//Select latest round
		queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);
			
		//find winner 
		queryValues = ["player_id", "round_answer", "round_id", latestRound[0].id, "iswinner", 1];
		let newMasterResult = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
		newMaster = newMasterResult[0].player_id;
	}

	if(newMaster === null){
		//Find an appropriate new Master (someone who has most recently connected to this game)
		queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 0, "created_at"];
		playersLeft = await mysqlCustom("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
		newMaster = playersLeft[0].id;
	}

		//Find the old master's state.
		//Give the old master no-state.
		const oldMasterState = await mysqlSelect("state", "players", "id", oldMaster);
		//State should be overwritten in when next game state is loaded.
		updatePlayerStates(socket, "no-state");

		//Change masters
		await mysqlUpdate("players", "ismaster", 1, "id", newMaster);
		await mysqlUpdate("players", "ismaster", 0, "id", oldMaster);
		console.log(oldMaster + " lost Master privilege to " + newMaster);

		//Give the new master that state
		updatePlayerStates(socket, oldMasterState[0].state)

		//Find new master name
		const newMasterName = await mysqlSelect("fullname", "players", "id", newMaster);
		const newMasterData = [newMaster, newMasterName[0].fullname];
		io.in(socket.gameID).emit('newMaster', newMasterData);
	
	
	//Make everyone refresh so everyone knows what's going on.
	//The timer will be lost but reset.

	if(originalNewMaster !== "winner"){
	requestRefresh(io, socket, socket.gameID);
	}

	return newMaster;
}

async function proceedWithMissingAnswers(io, socket){
	console.log("proceeding with missing answers")
	//Select latest round
	queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);

	//get shortlisted round_answer rows for this round.
	queryValues = ["id", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
	const playerAnswers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);

	if(playerAnswers.length == 0){
		//Reset timer if nobody answered
		requestStateUpdate(io, socket);
	} else {
		//Continue with at least one answer if there is one.
		updatePlayerStates(socket, "master-needs-answers", "player-waiting-for-results");
		requestStateUpdate(io, socket);
	}
}

async function scoreWinner(socket, winnerID){
	oldScore = await mysqlSelect("score", "players", "id", winnerID)
	await mysqlUpdate("players", "score", oldScore[0].score + 100, "id", winnerID);
	emitPlayersInLobby(io, socket.gameID);
}

async function startNewRound(io, socket){
	//executed by master

	//Set new master to winner
	const newMasterID = await newMaster(io, socket, "winner");

	//start new round
	startGame(io, socket, newMasterID);


}

async function showLoader(io, socket){
	io.in(socket.gameID).emit('show-loader');
}