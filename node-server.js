const fs = require('fs');
const path = require("path");

// Setup MySQL
const mysql = require('mysql');
const { Console } = require('console');
const { off } = require('process');
const { setWith, shuffle } = require('lodash');
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
		startGame(socket);
	});

	socket.on('what-is-my-state', async function(){
		if(socket.userID != null){
			userStateResult = await mysqlSelect("state", "players", "id", socket.userID);
			userState = userStateResult[0].state;
			console.log(socket.userID + "'s state is: " + userState);

			switch (userState) {
				case "player-waiting-for-question":
					showPlayerQuestionWaitingScreen(socket);
					break;
				case "master-needs-questions":
					getMasterQuestions(socket);
					break;
				case "master-waiting-for-answers":
					showMasterAnswerWaitingScreen(socket);
					break;
				case "player-needs-answers":
					showMainGameTemplate(socket);
					getRoundQuestion(socket);
					getPlayerAnswers(socket);
					break;
				case "no-state":
					newPlayerWaitForNextRound(socket);
					break;
				default:
					break;
			}
		} else {
			alertSocket(socket, "Something went wrong. Please refresh the page.")
		}
		


	});

	socket.on('master-picked-question', async (dirtyQuestionID) => {
		await updatePlayerStates(socket.gameID, "master-waiting-for-answers", "player-needs-answers");

		await calculateAndScoreQuestion(socket, dirtyQuestionID);

		showMasterAnswerWaitingScreen(socket);

		socket.to(socket.gameID).emit('get-your-answers');

	});

	socket.on('player-picked-answer', async (dirtyAnswerID) => {
		//Score answer against the other answers offered to the user

		//Short-list answer

		//emit card backs to everyone
		
	});
	socket.on('player-picked-roaster-answer', async (dirtyRoasterAnswerID) => {
		//Short-list answer

		//emit card backs to everyone		
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
				emitPlayersInLobby(io, gameID);
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
					io.to(gameID).emit('newHost', newHost);
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
					updatePlayerStates(gameID, "no-state");

					//Change masters
					await mysqlUpdate("players", "ismaster", 1, "id", newMaster[0]);
					await mysqlUpdate("players", "ismaster", 0, "id", userID);
					console.log(userID + " lost Master privilege to " + newMaster[0]);

					//Give the new master that state
					updatePlayerStates(gameID, oldMasterState[0].state)

					io.to(gameID).emit('newMaster', newMaster);
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
	
		}, 10000, io, socket.userID, socket.gameID);
		// Important to pass the user data to the timer function!

		timeouts.push(disconnectTimer);
		timeoutUserIDPivot.push(socket.userID);
		console.log("Timer pushed.");

	} else {
		console.log("There was no session. Exiting disconnectTimer function.");
		return;
	}
}

async function emitPlayersInLobby(io, gameID){
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

function requestRefresh(io, gameID = null){
	if(gameID === null){
		//emit refresh to socket.
		socket.emit('refresh');
	} else {
		//emit refresh to room.
		io.to(gameID).emit('refresh');
	}
}

function alertSocket(socket, message){
	// setTimeout(function (socket) {
		socket.emit('alert-socket', message);
	// }, 3000, socket);
}

async function updatePlayerStates(gameID, masterState = null, playerState = null){

	const queryValues = ["id", "ismaster", "players", "game_id", gameID, "connected", 1 ];
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
}

//Game states logic

async function startGame(socket){
	if(socket.userID == null){
		return;
	}
		const gameID = socket.gameID;
		const userID = socket.userID;

		isHost = await mysqlSelect("ishost", "players", "id", userID);
		//Returns array of objects
		//First row, ismaster attribute.
		isHost = isHost[0].ishost;		

		//Make sure this user is actually master otherwise request refresh.
		if (isHost != 1){
			return;
		}
		console.log("Is Host, Starting Game!")
		const queryValues = ["rounds", "game_id", gameID];
		await mysqlCustom("INSERT INTO ?? (??) VALUES (?);", queryValues);
		
		await mysqlUpdate("games", "started", 1, "id", gameID);
		
		//For each player, set their new game state.
		//updatePlayerState(gameID, masterState, playerState)
		updatePlayerStates(gameID, "master-needs-questions", "player-waiting-for-question")

		//Tell everyone to refresh so laravel loads the game view.
		setTimeout((io, gameID) => {
			requestRefresh(io, gameID);
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
	let topRandonQuestions = await mysqlCustom("SELECT ??, ??, ?? FROM ?? WHERE ?? >= ? ORDER BY RAND() LIMIT 7", queryValues);
	let lowRandomQuestions = await mysqlCustom("SELECT ??, ??, ?? FROM ?? WHERE ?? <= ? ORDER BY RAND() LIMIT 3", queryValues);
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
		<div class="card game-card question-card  ">
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

async function calculateAndScoreQuestion(socket,dirtyQuestionID){
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

async function scoreCard(winnerCard, offeredCards, table) {
	
	
	let offeredQuestionsTotalScore = 0;
	let winProbability = 0;
	let newRating = 0;
	for(i=0;i<offeredCards.length;i++){
		//Skip the winning card from looser calculations.
		if(offeredCards[i].id !== winnerCard[0].id){
			offeredQuestionsTotalScore += offeredCards[i].score;
			//calculate score for each losing card against chose card
			//Calculate Probability of current card winning against winner:
			winProbability = 1 / ( 1 + (10**((winnerCard[0].score - offeredCards[i].score)/400)));
			newRating = offeredCards[i].score + (32*(0 - winProbability));
			console.log(offeredCards[i].score + " =lose=> " + newRating + " P=" + winProbability)
			mysqlUpdate(table, "score", newRating, "id", offeredCards[i].id);
		}
	}

	//Calculate average score of loosers
	offeredCardsScoreAVG = offeredQuestionsTotalScore / (offeredCards.length - 1);
	//calculate chosen card score against average of cards offered.

	winProbability = 1 / ( 1 + (10**((offeredCardsScoreAVG - winnerCard[0].score)/400)));
	newRating = winnerCard[0].score + (32*(1 - winProbability));
	console.log(winnerCard[0].score + " =win=> " + newRating  + " P=" + winProbability)
	mysqlUpdate(table, "score", newRating, "id", winnerCard[0].id);


}

async function getPlayerAnswers(socket) {
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

	//Get best answers for that question from question_answers except answers already offered.
	queryValues = ["answer_id", "question_answer", "score", averageScore, "answer_id", "round_answer", "round_id", latestRound[0].id];
	const topRandomAnswers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? >= ? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT 5", queryValues);
	console.log("topRandomAnswers=" + topRandomAnswers.length)

	//Get Worst answers for that question to give them a chance except answers already offered.
	const lowRandomAnswers = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? <= ? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT 3", queryValues);
	console.log("lowRandomAnswers=" + lowRandomAnswers.length)
	
	//Add a random player name from the game as an answer except answers already offered.
	queryValues = ["id", "players", "id", socket.userID, "game_id", socket.gameID, "player_roaster_id", "round_answer", "round_id", latestRound[0].id];
	const roasterNameAnswer = await mysqlCustom("SELECT ?? FROM ?? WHERE ?? <> ? AND ?? = ? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT 1", queryValues);
	console.log("roasterNameAnswer=" + roasterNameAnswer.length)
	
	//Pad out answers with random answers (except answers already offered) from "answers" in case that question has not enough scored answers.
	const answersMissing = 9 - (topRandomAnswers.length + lowRandomAnswers.length + 1);
	console.log("Answers Missing=" + answersMissing)

	queryValues = ["id", "answers", "answer_id", "round_answer", "round_id", latestRound[0].id, answersMissing];
	const randomPaddingAnswers = await mysqlCustom("SELECT ?? FROM ?? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT ?", queryValues);
	console.log("randomPaddingAnswers=" + randomPaddingAnswers.length)

	let answerIDS = topRandomAnswers;
	answerIDS = answerIDS.concat(lowRandomAnswers);
	answerIDS = answerIDS.concat(randomPaddingAnswers);
	console.log("answerIDS=" + answerIDS.length)


	//Add offered answers to round_answers to avoid repeats and score answer later
	queryValues = ["round_answer", "round_id", "player_roaster_id", "player_id", latestRound[0].id, roasterNameAnswer[0].id, socket.userID];
	await mysqlCustom("INSERT INTO ?? (??, ??, ??) VALUES (?, ?, ?);", queryValues);
	let debuggingAnswerInserts = 1;
	for(i=0; i<answerIDS.length; i++){
		queryValues = ["round_answer", "round_id", "answer_id", "player_id", latestRound[0].id, answerIDS[i].id, socket.userID];
		mysqlCustom("INSERT INTO ?? (??, ??, ??) VALUES (?, ?, ?);", queryValues);
		debuggingAnswerInserts += 1;
	}
	console.log("answerInserts=" + debuggingAnswerInserts)

	showPlayerAnswers(socket);

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


	let answersInsert = "";
	let currentAnswerText = "";
	for (let i = 0; i < playerAnswers.length; i++) {
		if(playerAnswers[i].answer_id != null){
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await mysqlSelect("answer", "answers", "id", playerAnswers[i].answer_id)
			currentAnswerText = currentAnswerText[0].answer;
			answersInsert += `<a class="click-card" id="answer-${playerAnswers[i].answer_id}" onclick="pickAnswer(${playerAnswers[i].answer_id})" href="#">`
		} else {
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await mysqlSelect("fullname", "players", "id", playerAnswers[i].player_roaster_id)
			currentAnswerText = "<span class='text-capitalize'>" + currentAnswerText[0].fullname + ". </span>";
			answersInsert += `<a class="click-card" id="roaster-answer-${playerAnswers[i].player_roaster_id}" onclick="pickAnswer(${playerAnswers[i].player_roaster_id}, 'player-name-roaster')" href="#">`
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
		</a>
		`
	}

	const answerCards = `

			<!--<div class="x-scrolling-wrapper ml-1 pl-3">-->
				<a onclick="$('#myModal').modal(true)" href="#">
					<div class="card game-card answer-card  ">
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
   			<!-- </div> -->
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

async function getRoundQuestion(socket){
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

	emitToPlayers(socket, "show-player-question", questionCard);

}

function showMainGameTemplate(socket){
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/player-main-game.html"), 'utf8');
		console.log("File read");
		// setTimeout((socket) => {
			emitToPlayers(socket, "load-new-state", data);
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

