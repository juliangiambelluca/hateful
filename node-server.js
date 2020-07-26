
/**
 * Copyright (c) 2020, Julian Giambelluca
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted
 * provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this list of conditions
 *   and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice, this list of
 *   conditions and the following disclaimer in the documentation and/or other materials provided
 *   with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 * WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


"use strict"; 

//Configuration
const hatefulConfig = {
	/* Gameplay */
	gameTimerLength: 20,	//Length of timer for choosing questions and answers. In seconds. recommended: 60 Seconds

	/* Answer Cards */
	//One card from answerCards will always be a player name card -known as a "Roaster Card"-, so users can make fun of their friends.
	//Bad answers are important to give new/bad answers a chance to gain points. 
	//If not enough best|good|bad answers are found, random answers will be selected until maxAnswerCards is reached
	maxAnswerCards: 10,     //The maximum amount of cards to be shown. Excess will be sliced off.
	bestAnswers: 3,			//Top scoring answers for the question given.
	goodAnswers: 3,			//Number of cards to offer above average score for the question given
	badAnswers: 3,			//Number of cards to offer below average score for the question given
	writeYourOwn: false,    //Enable write your own card feature - Make this come out of the answerCards budget

	/* Players */
	minPlayers: 2,			//Minimum players to allow game play
	maxPlayers: 3,			//Maximum players to allow game play

	/* Connection */
	disconnectTimerLength: 10000,	//Recommended: 35 seconds.
	//How long to wait before flagging a user as disconnected in the database and potentially automatically choosing a new host.
	//Timer begins whenever a user refreshes or closes the game. On mobile, locking the screen also begins the timer.
	//The timer is cleared as soon as a user accesses the game again.
	staggerDelay: 400, 				//Recommended: 400ms.
	//How much delay to stagger player's database access by. This is to avoid conflicts when players access the database simultaneously.
	//For example, at 400ms, the tenth player will have to wait 4 seconds. Important queries this applies to take around 450ms.
	maxStaggerDelay: 3000 	//Maximum delay players will experience.
	//Should be staggerDelay * maxPlayers
	//(maxStaggerDelay / staggerDelay) = # of users guaranteed to not experience any conflicts. 

};

/* SETUP AND IMPORT */
	// Setup File system
	const fs = require('fs');
	const path = require("path");

	// Setup Socket.IO
	const app = require('express')();
	const http = require('http').createServer(app);
	const io = require('socket.io')(http);
	http.listen(3000, () => {
		log.important('Listening on *:3000');
	});

	// Setup MySQL
	const dbConfig = require("./.db_config.json");
	const mysql = require('mysql');
	const { Console } = require('console');
	const { off } = require('process');
	const { setWith, shuffle } = require('lodash');
	const { start } = require('repl');
	const pool = mysql.createPool(dbConfig);  
/* --- */


const db = {
	// Custom DB Access helper functions


	select: async function (select, from, where, equals) {
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
		} ,
	
	update: async function (update, set, setEquals, where, equals) {
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
		} ,
	
	
	query: async function (customQuery = "", values = []) {
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
}

const log = {
	// Custom console logging & debugging functions

	critical: function(string){
		console.log('\x1b[107;31m%s\x1b[0m', string);
	},
	error: function(string){
		console.log("\x1b[91m%s\x1b[0m", string);
	},
	info: function(string){
		console.log('\x1b[96m%s\x1b[0m', string);
	},
	warning: function(string){
		console.log('\x1b[93m%s\x1b[0m', string);
	},
	debug: function(string){
		console.log('\x1b[97m%s\x1b[0m', string);
	},
	important: function(string){
		console.log('\x1b[107;45m%s\x1b[0m', string);
	},
	pink: function(string){
		console.log('\x1b[95m%s\x1b[0m', string);
	},
	green: function(string){
		console.log('\x1b[92m%s\x1b[0m', string);
	},
	stringify: function(parameter, description = false ){
		if(description){console.log('\x1b[92m%s\x1b[0m', description);}
		console.log('\x1b[42;97m%s\x1b[0m', JSON.stringify(parameter));
	}
}
// Store Disconnect timeouts & their users. - Turn this into an object
let timeouts = [];
let timeoutUserIDPivot = [];

const files = {
	// File accessing functions


	get: function (file, encoding = "utf8"){
		try {
			var data = fs.readFileSync(path.resolve(__dirname, file), encoding);
			return data;
		} catch(e) {
			alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
			log.critical('File not read:', e.stack);
		}
	}
}

const client = {
	// Methods to deliver data to the client



	stagger: function (io, socket, parameters = null , action){
		//set staggerDelay if it isnt already.
		if(typeof(io.in(socket.gameID).staggerDelay)=='undefined'){
			io.in(socket.gameID).staggerDelay = 10;
		};
		//Reset staggering delay if it gets too big
		if(io.in(socket.gameID).staggerDelay > hatefulConfig.maxStaggerDelay){
			io.in(socket.gameID).staggerDelay = 10;
		};

		log.info("Staggering Delay: " +  io.in(socket.gameID).staggerDelay);
		//Stagger answer getting to avoid duplicates being offered.
		setTimeout((action, parameters) => {
			action(...parameters);
		}, io.in(socket.gameID).staggerDelay, action, parameters);
		//add 500ms to stagger delay for next person
		io.in(socket.gameID).staggerDelay += hatefulConfig.staggerDelay;	
	},

	resetStaggerDelay: function (io, socket){
		io.in(socket.gameID).staggerDelay = 10;
	},

	emitPlayersInGame: async function (io, socket){
		//In lobby, connected users are shown. During gameplay this acts as the leaderboard too.
		const queryValues = ["id", "fullname", "score", "ismaster", "players", "game_id", socket.gameID, "connected", 1];
		const connectedPlayers = await db.query("SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY score DESC", queryValues);
	
		io.in(socket.gameID).emit('playersInLobby', connectedPlayers);
	},

	join: async function (io, socket, dirtyUserID){
		//Sanitise Input
		if(sanitise.userID(dirtyUserID) === false){
			//Reject bad input
			socket.emit('dodgyID');
			log.critical("Dodgy User ID denied:" + dirtyUserID);
			return;
		}
		//Made it this far, userID is clean
		const userID = dirtyUserID;

		//Get game ID
		let gameID = await db.select("game_id", "players", "id", userID);
		gameID = gameID[0].game_id;
		gameID = parseInt(gameID, 10);

		socket.gameID = gameID;
		socket.userID = userID;

		/* Connect code */

		//Clear their disconnect timer before they wait for their turn to go through connect procedure.
		if (socket.userID != null) {
			if (timeoutUserIDPivot.includes(socket.userID)) {
				const timeoutRow = timeoutUserIDPivot.indexOf(socket.userID);
				clearTimeout(timeouts[timeoutRow]);
				timeoutUserIDPivot.splice(timeoutRow, 1);
				timeouts.splice(timeoutRow, 1);
				log.info("Timeout cleared & deleted from array.");

			}
		}

		
		client.stagger(io, socket, [io, socket], async (...parameters) => {
			socket.join(socket.gameID);
			// console.log("Node Session data says - Game ID:" + socket.gameID + " User ID:" + socket.userID)

			//Let user know they connected and output this to their console.
			socket.emit('joinRoomSuccess');
			
			//User joined their room. Mark them as connected in DB
			await player.flagAsConnected(socket);
			await player.updateState(socket, "active");

			await game.ensureHostAndMaster(io, socket);
			await player.ensureCount(io, socket); 
			//Player will get flagged as disconnected if there's too many players.

			client.requestState(io, socket, true);
			client.emitPlayersInGame(io, socket);
		})


		log.info("Join Staggering Delay: " +  io.in(socket.gameID).staggerDelay);

			
	},

	disconnect: async function (io, socket){
		if (socket.userID == null) {
			log.warning("User disconnected but no session. Exiting disconnectTimer function.");
			return;
		}
		
		log.info("A user (" + socket.userID + ") is disconnecting...");
	
		const disconnectTimer = setTimeout(async (io, socket) => {
			//Create set timeout to flag as disconnected and re-choose or master after a few seconds

			log.info("disconnectTimer triggered");
	
			await player.flagAsDisconnected(socket);
			
			await game.ensureHostAndMaster(io, socket);
	
			await player.ensureCount(io, socket);
			
			client.emitPlayersInGame(io, socket);
	
			//Clear this timer from the timeouts table
			const timeoutRow = timeoutUserIDPivot.indexOf(socket.userID);
			//Important to delete both to keep timeouts and user ID's indexes aligned.
			timeoutUserIDPivot.splice(timeoutRow, 1);
			timeouts.splice(timeoutRow, 1);
	
			delete socket.userID;
			delete socket.gameID;
			
			log.info("Session & Disconnect timeout deleted - no longer needed.");
	
		}, hatefulConfig.disconnectTimerLength, io, socket);
		// Important to pass socket & io to the timer function!
	
		timeouts.push(disconnectTimer);
		timeoutUserIDPivot.push(socket.userID);
		log.info("Timer pushed.");
	
	},

	refresh: function (io, socket, gameID = null){
		if(gameID === null){
			//emit refresh to socket.
			socket.emit('refresh');
		} else {
			//emit refresh to room.
			io.in(gameID).emit('refresh');
		}
	},

	requestState: function (io, socket, self = false){
		//Tells the client(s) to check & load their state

		if(self){
			// setTimeout((socket) => {
			socket.emit('update-your-state');
			// }, hatefulConfig.dustSettleDelay, socket);
			return;
		}

		// setTimeout((socket, io) => {
		io.in(socket.gameID).emit('update-your-state');
		// }, hatefulConfig.dustSettleDelay, socket, io);
	},
	
	makeOverflow: function(socket){
		socket.emit("overflow-player");
		client.showOverflowScreen;
	},


	showOverflowScreen: function(socket){
		let screen = files.get("game-states/overflow-player.html");
		socket.emit('load-new-state', screen);
	},
	
	showAnswers: async function (socket, playerAnswers){
	//Get answers from round_answer from latest round where user = socket.userID
	log.pink(JSON.stringify(playerAnswers));

	//Create cards insert
	let answersInsert = "";
	let currentAnswerText = "";
	for (let i = 0; i < playerAnswers.length; i++) {
		//Check if roaster card or not.
		if(playerAnswers[i].answer_id != null){
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await db.select("answer", "answers", "id", playerAnswers[i].answer_id);
			currentAnswerText = currentAnswerText[0].answer;
			answersInsert += `<a class="click-card answer-not-selected" id="answer-${playerAnswers[i].answer_id}" onclick="pickAnswer(${playerAnswers[i].answer_id})" href="#">`
		} else {
			//This row has a roaster card
			//Make data for new game state
			currentAnswerText = await db.select("fullname", "players", "id", playerAnswers[i].player_roaster_id);
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
	
	let answerCards;
	
	if(hatefulConfig.writeYourOwn === true){
		answerCards = `
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
	} else {
		answerCards = `${answersInsert}`;
	}
	
	socket.emit('show-player-answers', answerCards);
	
	},

	showQuestions: async function (socket, questions){
		//Make data for new game state
		let questionsInsert = "";
		for(let i=0;i<questions.length;i++){
			
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
	},

	showRoundQuestion: function (socket, roundQuestion){
		log.stringify(roundQuestion, "showRoundQUestion roundQuestion")
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
		socket.emit('show-player-question', questionCard);
	},

	showMainTemplate: function (socket){
		let template = files.get("game-states/player-main-game.html");
		socket.emit('load-new-state', template);
	},

	showQuestionWaiting: function (socket) {
		const screen = files.get("game-states/player-wait-for-question.html")
		socket.emit("load-new-state", screen);
	},

	showAnswerWaiting: function (socket){
		const screen = files.get("game-states/master-wait-for-answers.html");
		socket.emit("load-new-state", screen);
	},

	showCardBacks: function (io, socket, cardBacks, shortlistedAnswerSets){

		let cardBacksView = "";
		for (let index = 0; index < shortlistedAnswerSets; index++) {
			log.debug("Iteration of cardbackview +");
			cardBacksView += `
			<div class="card-back-answer-group">
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
	
	},

	showTimer: async function (io, socket, parameters, action, timerLength = hatefulConfig.gameTimerLength){
		//reset user's front-end timer
		socket.emit('times-up');

		const timeLeft = await game.timer.getTimeLeft(socket);

		if (timeLeft === false){
			//There is no appropiate time left or existing timer, start a new timer.
			if(await master.check(socket)){
				//Only allow master to start timers.
				await game.timer.start(io, socket, parameters, action, timerLength);
			}
			socket.emit('start-timer', timerLength);
		} else {
			//Timer has already been set and is still relevant. Simply show user time left on it.
			socket.emit('start-timer', timeLeft);
		}
		
	},

	show: {
		results: {
			shortlisted: async (socket) => {
				const latestRound = await game.getLatestRound(socket);
				//Check how many blanks there are in this round's question
				const blanks = await db.select("blanks", "questions", "id", latestRound.question_id);
				const shortlistedAnswers = await cards.getShortlistedAnswers(latestRound);

				client.show.results.shortlistedAnswers(socket, shortlistedAnswers, blanks);
			},

			winners: async (socket) => {
				const latestRound = await game.getLatestRound(socket);
				//Check how many blanks there are in this round's question
				const blanks = await db.select("blanks", "questions", "id", latestRound.question_id);
				const shortlistedAnswers = await cards.getShortlistedAnswers(latestRound);

				client.show.results.shortlistedAnswers(socket, shortlistedAnswers, blanks);
				client.show.results.winnerAnswer(socket, shortlistedAnswers);
			},
			
			shortlistedAnswers: async (socket, shortlistedAnswers, blanks) => {

				let answersInsert = "";
				let currentAnswerText = "";
				for (let i = 0; i < shortlistedAnswers.length; i++) {
					//Skip --don't print this card if it IS a winner
					if(shortlistedAnswers[i].iswinner == 1){
						continue;
					}

					if(i===0){
						answersInsert += `<div class="answer-grouping-container">`;
					}
					if(i % blanks === 0 && i !== 0 && i !== shortlistedAnswers.length){
						answersInsert += `</div><div class="answer-grouping-container">`;
					}

					//Check if roaster card or not.
					if(shortlistedAnswers[i].player_roaster_id == null){
						//This row has an actual answer
						//Make data for new game state
						let currentAnswerResult = await db.select("answer", "answers", "id", shortlistedAnswers[i].answer_id);
						currentAnswerText = currentAnswerResult[0].answer;

					} else {
						//This row has an player roaster
						//Make data for new game state
						let currentRoasterResult = await db.select("fullname", "players", "id", shortlistedAnswers[i].player_roaster_id);
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

			},

			winnerAnswer: async (socket, playerAnswers) => {



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
						currentAnswerText = await db.select("answer", "answers", "id", playerAnswers[i].answer_id);
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
						currentAnswerText = await db.select("fullname", "players", "id", playerAnswers[i].player_roaster_id);
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
		}
	}


}

const game = {
	// Game specific logic

	getLatestRound: async function (socket){
		const queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
		log.stringify(latestRound, "Latest round at getLatest Round")
		return latestRound;
	},

	/*  State decisions made here */
	processState: async function (io, socket){
		if(socket.userID === null){
			alertSocket(socket, "Please refresh the page, something went wrong.");
			log.error("No socket user id @ client.downloadState");
			return;
		}

		const isMaster = await master.check(socket);
		
		await game.ensureHostAndMaster(io, socket);

		let userStateResult = await db.select("state", "players", "id", socket.userID);
		let userState = userStateResult[0].state;
		log.info(socket.userID + "'s USER state is: " + userState);

		let gameStateResult = await db.select("state", "games", "id", socket.gameID);
		let gameState = gameStateResult[0].state;
		log.info(socket.gameID + "'s GAME state is: " + gameState);

		switch (gameState) {
			case "new-round":
				//First user to get here changes the game state for everyone accessing afterwards.
				await game.updateState(io, socket, "picking-question");
				//fall through to next case.

			case "picking-question":
				client.showTimer(io, socket, [io, socket], (...parameters) => {
					master.timedOut(io, socket);
				});
				if (isMaster){
					client.showQuestions(socket, await cards.getMasterQuestions(socket));
				} else {
					client.showQuestionWaiting(socket);
				}
			break;
			
			case "picking-answer":
				client.showTimer(io, socket, [io, socket], (...parameters) => {
					//If they don't answer in time they won't be able to win.
					//If nobody answers the timer is reset.
					proceedWithMissingAnswers(io, socket);
				});
				if (isMaster){
					client.showAnswerWaiting(socket);
				} else {			
					client.showMainTemplate(socket);
					client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
					client.stagger(io, socket, [socket], (...parameters) => {
						cards.getPlayerAnswers(socket);
					});
				}
			break;

			case "picking-winner":
				if(userState === "answered"){
					//Change "answered" user states to active again
					//If they haven't answered then their state would still be active.
					await player.updateState(socket, "active");
					client.requestState(io, socket);
					break;
				}

				client.showTimer(io, socket, [io, socket], (...parameters) => {
					//if master times out, change master 
					master.timedOut(io, socket);
				});

				if (isMaster){	
					client.resetStaggerDelay(io, socket);
					client.showMainTemplate(socket);
					client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
					getMasterAnswers(socket);
				} else {
					client.show.results.shortlisted(socket);
				}
			break;
			
			case "show-winner":
				client.showTimer(io, socket, [io, socket], async (...parameters) => {
					await game.updateState(io, socket, "next-round");
					client.requestState(io, socket);
				}, (hatefulConfig.gameTimerLength / 3));

				client.showMainTemplate(socket);
				client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
				client.show.results.winners(socket);


			break;
			case "next-round":
				showLoader(io, socket);
				if (isMaster){		
					const latestRound = await game.getLatestRound(socket);
					await game.newRound(io, socket);
					await master.fromWinner(socket, latestRound);

					client.refresh(io, socket, socket.gameID);
				}
				break;
			default:
				alertSocket(socket, "Please refresh the page. Something went wrong.");
				break;
		}


		switch (userState) {
					
			case "disconnected":
				disconnectedOrTimeout(socket);
				break;

			case "idle":
				newPlayerWaitForNextRound(socket);
				break;
		
			case "overflow":
				client.showOverflowScreen(socket);
				break;
		
			case "answered":
				client.showMainTemplate(socket);
				client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
				showPlayerAnswerWaiting(socket);
				//If timer is already set (which it should be), they will just see a continuation of their previous countdown.
				game.timer.start(io, socket, [io, socket], (...parameters) => {
					proceedWithMissingAnswers(io, socket);
				});
				break;
		
			default:
				break;
		}

	},
	/*  Good stuff above */

	updateState: async function (io, socket, stateName){
		await db.update("games", "state", stateName, "id", socket.gameID);
		game.timer.clear(io, socket);
	},

	start: async function (socket){
		//Make sure that only hosts execute this function to avoid useless re-writes of data
		if(await host.check(socket)){
			await db.update("games", "started", 1, "id", socket.gameID);
		}
	},

	end: async function (io, socket){
		//Delete everything related to this game
		log.important(socket.gameID + " Game ended!");
	},

	newRound: async function (io, socket){
		//Make sure that only masters or hosts execute this function to avoid useless re-writes of data
		if(!(await master.check(socket) || await host.check(socket))){
			//If is neither host or master, exit
			return;
		}

		//Reset the stagger delay
		io.in(socket.gameID).staggerDelay = 0;

		//Create new round
		const queryValues = ["rounds", "game_id", socket.gameID];
		await db.query("INSERT INTO ?? (??) VALUES (?);", queryValues);

		await game.updateState(io, socket, "new-round");
	},

	timer: {
		getTimeLeft: async function (socket){
	
			//Get timer info if exists
			let queryValues = ["timer_start", "timer_length", "games", "id", socket.gameID];
			const mysqlGameTimer = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ?", queryValues);
			
			//Calculate time left on timer
			const endOfTimer = parseInt(mysqlGameTimer[0].timer_start) + parseInt(mysqlGameTimer[0].timer_length);
			const timeLeftOnTimer = endOfTimer - (Date.now()/1000);
	
			if(mysqlGameTimer[0].timer_start == null || isNaN(endOfTimer) || timeLeftOnTimer <= 0){
				return false;
			} else {				
				return timeLeftOnTimer;
			}
		
		},
	
		start: async function (io, socket, parameters = null, action = null,  timerLength = hatefulConfig.gameTimerLength){
			
			//destroy any trace of a previous timer.
			await game.timer.clear(io, socket);
	
			//Create a new timer
			io.in(socket.gameID).gameTimer = setTimeout((io, socket, action, parameters) => {

				log.info("Game Timer for game: " + socket.gameID + " gone off.")

				if(action !== null){
					action(...parameters);
				}
				
				game.timer.clear(io, socket)

				//+5 secs to give some headroom and leighway
			}, ((timerLength + 5) * 1000), io, socket, action, parameters);


			//Save timer info in database
			const queryValues = ["games", "timer_start", (Date.now()/1000), "timer_length", timerLength, "id", socket.gameID];
			await db.query("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? ", queryValues);

		},

		clear: async function (io, socket){
			io.in(socket.gameID).emit('times-up');

			clearTimeout(io.in(socket.gameID).gameTimer);
			delete io.in(socket.gameID).gameTimer;

			//clear the timer
			let queryValues = ["games", "timer_start", null, "timer_length", null, "id", socket.gameID];
			await db.query("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? ", queryValues);
		}

	},

	everyoneAnswered: 	async function(socket){
		//Check if everyone has answered yet

		let queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 0];
		const playersConnected = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ?", queryValues);

		queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 0, "state", "answered"];
		const playersAnswered = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? AND ?? = ?", queryValues);
	
		log.stringify(playersConnected, "playersCOnnected at EveryoneAnswered");
		log.stringify(playersAnswered, "playersAnsweres");

		//If everyone answered, return true
		if(playersConnected.length === playersAnswered.length){
			return true;
		} else {
			return false;
		}
	},
	
	ensureHostAndMaster: async function (io, socket){
		//Ensures that there is a master and host. Will REFRESH clients in game if master or host changes

		//Select masters flagged CONNECTED
		let queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 1];
		const connectedMasters = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ?;", queryValues);
	
		//Select hosts flagged CONNECTED
		queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ishost", 1];
		const connectedHosts = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ?;", queryValues);
	
		//Find appropiate new host/master
		queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "ismaster", 0, "created_at"];
		const playersLeft = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
		
	
		if(connectedMasters.length === 0 && connectedHosts.length === 0){
			//clear all hosts and masters even if not connected
			await db.update("players", "ishost", 0, "game_id", socket.gameID);
			await db.update("players", "ismaster", 0, "game_id", socket.gameID);
			//now there's nobody in charge at all
	
			 if(playersLeft.length == 0){
				//Everyone Left
				game.end(io, socket);
				return;
			 } else {
				//clear any hosts and masters even those disconnected
				await db.update("players", "ishost", 0, "game_id", socket.gameID);
				await db.update("players", "ismaster", 0, "game_id", socket.gameID);

				await db.update("players", "ishost", 1, "id", playersLeft[0].id);
				await db.update("players", "ismaster", 1, "id", playersLeft[0].id);
				
				log.info(socket.userID + " lost Host privilege to " + playersLeft[0].id);

				// const newHost = [playersLeft[0].id, playersLeft[0].fullname];
				// io.in(socket.gameID).emit('newHost', newHost);
			 }

			 client.refresh(io, socket, socket.gameID);
	
		} else if (connectedMasters.length === 0){
			//we just need a new master

			//clear any hosts and masters even those disconnected
			await db.update("players", "ishost", 0, "game_id", socket.gameID);
			await db.update("players", "ismaster", 0, "game_id", socket.gameID);
			
			//make the old host host again, he was fine
			await db.update("players", "ishost", 1, "id", connectedHosts[0].id);

			//Make the connected user we found master
			await db.update("players", "ismaster", 1, "id", playersLeft[0].id);
	
			client.refresh(io, socket, socket.gameID);
	
		} else if (connectedHosts.length === 0){
			//we just need a new host

			//clear any hosts and masters even those disconnected
			await db.update("players", "ishost", 0, "game_id", socket.gameID);
			await db.update("players", "ismaster", 0, "game_id", socket.gameID);

			//Make the connected user we found host
			await db.update("players", "ishost", 1, "id", playersLeft[0].id);

			//make the old master master again, he was fine
			await db.update("players", "ismaster", 1, "id", connectedMasters[0].id);

			client.refresh(io, socket, socket.gameID);

		} else {
			//everything seems to be ok...
		}
	},

}

const sanitise = {
	// Input sanitising functions

	userID: function(dirtyUserID){
		let userID = dirtyUserID.replace(/[^0-9]/g, '');
		//if userID is more than 10 characters, it's defintely invalid.
		if(userID.length > 10){
			return false;
		};
		userID = parseInt(userID, 10);	
		if(isNaN(userID)){
			return false;
		} 
		return true;
	},

	playerAnswer: function (dirtyAnswerIDS){
		if(dirtyAnswerIDS.length === 2){
			dirtyAnswerIDS[0] = String(dirtyAnswerIDS[0]);
			dirtyAnswerIDS[1] = String(dirtyAnswerIDS[1]);
			if ((! dirtyAnswerIDS[0].match(/^[a-z0-9]+$/i)) || (! dirtyAnswerIDS[1].match(/^[a-z0-9]+$/i)) ) {
				return false;
			}
		} else if(dirtyAnswerIDS.length === 1){
			dirtyAnswerIDS[0] = String(dirtyAnswerIDS[0]);
			if (!dirtyAnswerIDS[0].match(/^[a-z0-9]+$/i)) {
				return false;
			}
		} else {
			return false;
		}
		//Made it through checks. input is sanitised.
		return true;
	},

	masterQuestion: function (dirtyQuestionID) {
		let questionID = 0;
		//If question id has more than 10 digits it's definetely invalid!
		if (dirtyQuestionID.toString().length < 10){
				questionID = parseInt(dirtyQuestionID);
				if (questionID === NaN){
					log.error("Question ID NAN");
					return false;
				}
				log.info("Set Clean Question ID");
		} else {
			log.error("Dirty Question ID too long!")
			return false;
		}
		return true;
	}
}

const cards = {
	// Card related data & methods


	score: async function (winnerCard, offeredCards, table, questionID = null) {
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
					log.debug(offeredCards[i].score + " =lose=> " + newRating + " P=" + winProbability);
	
					
					if(questionID !== null){
						
						queryValues = [table, "score", newRating, "question_id", questionID, "answer_id", offeredCards[i].id];
						affectedRows = await db.query("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?;", queryValues);
	
						if(parseInt(affectedRows.affectedRows) == 0){
							queryValues = [table, "question_id", "answer_id", "score", questionID, offeredCards[i].id, newRating];
							db.query("INSERT INTO ??(??,??,??) VALUES(?,?,?);", queryValues);
						}
									
					} else {
						db.update(table, "score", newRating, "id", offeredCards[i].id);
					}
				}
			}
	
		//Calculate average score of loosers
		let offeredCardsScoreAVG = offeredQuestionsTotalScore / (offeredCards.length - 1);
		//calculate chosen card score against average of cards offered.
		
			winProbability = 1 / ( 1 + (10**((offeredCardsScoreAVG - winnerCard[index].score)/400)));
			newRating = winnerCard[index].score + (32*(1 - winProbability));
			log.debug(winnerCard[index].score + " =win=> " + newRating  + " P=" + winProbability)
	
			if(questionID !== null){
	
				queryValues = [table, "score", newRating, "question_id", questionID, "answer_id", winnerCard[index].id];
				affectedRows = await db.query("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?;", queryValues);
	
				if(parseInt(affectedRows.affectedRows) == 0){
					queryValues = [table, "question_id", "answer_id", "score", questionID, winnerCard[index].id, newRating];
					db.query("INSERT INTO ??(??,??,??) VALUES(?,?,?);", queryValues);
				}
							
	
			} else {
				db.update(table, "score", newRating, "id", winnerCard[index].id);
			}
	
		}
		
	},

	scoreAnswers: async function (socket, answerIDS, latestRound) {

		//Select all offered answers data with real score against the current question
		let queryValues = [latestRound[0].question_id, latestRound[0].id, socket.userID];
		const offeredAnswersWithRealScore = await db.query("SELECT answers.id, question_answer.score FROM answers, question_answer, round_answer WHERE question_answer.answer_id = answers.id AND question_answer.question_id = ? AND answers.id = round_answer.answer_id AND round_answer.round_id = ? AND round_answer.player_id = ?", queryValues);
	
		let offeredAnswers;
		//If answer(s) have a real score against the given question use those, otherwise, get their default scores (1000 points.)
		if (offeredAnswersWithRealScore.length !== 0){
			offeredAnswers = offeredAnswersWithRealScore;
		} else {
			queryValues = [latestRound[0].id, socket.userID];
			offeredAnswers = await db.query("SELECT answers.id, answers.score FROM answers, round_answer WHERE answers.id = round_answer.answer_id AND round_answer.round_id = ? AND round_answer.player_id = ?", queryValues);
		}
	
		for (let i = 0; i < answerIDS.length; i++) {
			if(!(answerIDS[i].includes("roaster"))){
	
				/* SCORE ANSWER */
				
				//Select winning question data
				//Check if answer has a score against the question. if so, use question answer score
				queryValues = [answerIDS[i], latestRound[0].question_id];
				const questionAnswerScore = await db.query("SELECT answers.id, question_answer.score FROM answers, question_answer WHERE answers.id = ? AND question_answer.answer_id = answers.id AND question_answer.question_id = ? ;", queryValues);
	
				let chosenAnswers;
				if (questionAnswerScore.length !== 0){
					chosenAnswers = questionAnswerScore;
				} else {
					queryValues = [answerIDS[i]];
					chosenAnswers = await db.query("SELECT answers.id, answers.score FROM answers WHERE answers.id = ?;", queryValues);
				}
	
				cards.score(chosenAnswers, offeredAnswers, "question_answer", latestRound[0].question_id);
			}
		}//endfor
	},

	shortlistAnswers: async function (socket, answerIDS, latestRound) {
		for (let i = 0; i < answerIDS.length; i++) {
			if(answerIDS[i].includes("roaster")){
				/* SHORTLIST ROASTER ANSWER */
				const playerRoasterID = answerIDS[i].replace('roaster','');
				const queryValues = ["round_answer", "shortlisted", 1, "order", i, "round_id", latestRound[0].id, "player_id", socket.userID, "player_roaster_id", playerRoasterID];
				await db.query("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? AND ?? = ? AND ?? = ? ", queryValues);
			} else {
				/* SHORTLIST ANSWER */
				const queryValues = ["round_answer", "shortlisted", 1, "order", i, "round_id", latestRound[0].id, "player_id", socket.userID, "answer_id", answerIDS[i]];
				await db.query("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? AND ?? = ? AND ?? = ? ", queryValues);
			}
		}
	},

	getNewAnswers: async function (socket, latestRound){
		//Get average score for answers for this question
		let queryValues = ["score", "question_answer", "question_id", latestRound[0].question_id];
		let averageScore = await db.query("SELECT AVG(??) FROM ?? WHERE ?? = ?", queryValues);
		averageScore = Object.values(averageScore[0]);
		averageScore = parseInt(averageScore);
		log.debug("average score=" + averageScore);
		if(Number.isNaN(averageScore)){
			averageScore = 1000;
		}
	
		//Get best answers for that question from question_answers except answers already offered.
		queryValues = [latestRound[0].question_id, latestRound[0].id];
		const bestRandomAnswers = await db.query(`
		SELECT DISTINCT question_answer.answer_id, question_answer.score AS s1 FROM question_answer WHERE question_answer.question_id = ?
		EXCEPT 
		(SELECT round_answer.answer_id, NULL FROM round_answer WHERE round_answer.round_id = ?)
		ORDER BY s1 LIMIT ` + hatefulConfig.bestAnswers, queryValues);
	
		//Get best answers for that question from question_answers except answers already offered.
		queryValues = ["answer_id", "question_answer", "score", averageScore, "question_id", latestRound[0].question_id, "answer_id", "round_answer", "round_id", latestRound[0].id];
		const topRandomAnswers = await db.query("SELECT DISTINCT ?? FROM ?? WHERE ?? > ? AND ?? = ? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT " + hatefulConfig.goodAnswers, queryValues);
		// console.log("topRandomAnswers=" + topRandomAnswers.length)
	
		//Get Worst answers for that question to give them a chance except answers already offered.
		const badRandomAnswers = await db.query("SELECT DISTINCT ?? FROM ?? WHERE ?? < ? AND ?? = ? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT " + hatefulConfig.badAnswers, queryValues);
		// console.log("lowRandomAnswers=" + lowRandomAnswers.length)
		
		//Add a random player name from the game as an answer except answers already offered.
		queryValues = ["id", "player_roaster_id", "players", "id", socket.userID, "game_id", socket.gameID, "player_roaster_id", "round_answer", "round_id", latestRound[0].id, "player_roaster_id"];
		const roasterNameAnswer = await db.query("SELECT DISTINCT ?? AS ?? FROM ?? WHERE ?? <> ? AND ?? = ? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? AND ?? IS NOT NULL ORDER BY RAND() LIMIT 1", queryValues);
		// console.log("roasterNameAnswer=" + roasterNameAnswer.length)

		//Start with roasterNameCard to ensure that a roaster is always served and won't be cropped off by hatefulConfig.maxAnswerCards
		//Concat in order of preference just in case maxCards is set higher than hatefulConfig.(best|top|bad)AnswerCards.
		let answerIDS = roasterNameAnswer;
		answerIDS = answerIDS.concat(bestRandomAnswers);
		answerIDS = answerIDS.concat(topRandomAnswers);
		answerIDS = answerIDS.concat(badRandomAnswers);

				
		//Pad out answers with random answers (except answers already offered) from "answers" in case that question has not enough scored answers.
		const answersMissing = hatefulConfig.maxAnswerCards - (answerIDS.length);
		

		if(answersMissing > 0){
			queryValues = ["id", "answer_id", "answers", "answer_id", "round_answer", "round_id", latestRound[0].id, answersMissing];
			const randomPaddingAnswers = await db.query("SELECT DISTINCT ?? AS ?? FROM ?? EXCEPT SELECT ?? FROM ?? WHERE ?? = ? ORDER BY RAND() LIMIT ?", queryValues);
			// console.log("randomPaddingAnswers=" + randomPaddingAnswers.length)
			answerIDS = answerIDS.concat(randomPaddingAnswers);
		}

		//ensure that there are no more than the MAX answer cards. 1 is subtracted from max to account for array starting at 0.
		answerIDS.slice(0, (hatefulConfig.maxAnswerCards - 1));


		log.green("After adding Random padding answers:");
		log.stringify(answerIDS);

		// //Add offered answers to round_answers to avoid repeats and score answer later
		// queryValues = ["round_answer", "round_id",  "player_id", latestRound[0].id, roasterNameAnswer[0].player_roaster_id, socket.userID];
		// await db.query("INSERT INTO ?? (??, ??, ??) VALUES (?, ?, ?);", queryValues);

		let debuggingAnswerInserts = 0;
		for(let i=0; i<answerIDS.length; i++){
			// console.log("answerIDS["+i+"]=" + JSON.stringify(answerIDS[i]));
			queryValues = ["round_answer", "round_id", "answer_id", "player_roaster_id", "player_id", latestRound[0].id, answerIDS[i].answer_id, answerIDS[i].player_roaster_id, socket.userID];
			db.query("INSERT INTO ?? (??, ??, ??, ??) VALUES (?, ?, ?, ?);", queryValues);
			debuggingAnswerInserts += 1;
		}
		log.debug("answerInserts=" + debuggingAnswerInserts)


		return answerIDS;
	},

	getPlayerAnswers: async function (socket) {	
		//Don't allow master to get answer cards.
		if(!master.check(socket)){return;};
	
		log.pink("made it through master check");

		let queryValues;
	
		//Get current question
		//Select latest round & question
		queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
	
		//get round_answer rows for this round and user.
		queryValues = ["answer_id", "player_roaster_id", "round_answer", "round_id", latestRound[0].id, "player_id", socket.userID];
		const offeredAnswers = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY RAND()", queryValues);

		log.stringify(offeredAnswers);

		let answers;
		if(offeredAnswers.length > 2){
			answers = offeredAnswers;
		} else {
			answers = await this.getNewAnswers(socket, latestRound);
		}
	
		client.showAnswers(socket, answers);

	},

	getShortlistedAnswers: async function (latestRound) {
		//get shortlisted round_answer rows for this round.
		const queryValues = ["answer_id", "player_roaster_id", "player_id", "iswinner", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
		const shortlistedAnswers = await db.query("SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);
		return shortlistedAnswers;
	},

	getCardBacks: async function (socket, cardBacks) {
		log.info("Card Backs to show: " + cardBacks )

		let queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
	
	
		queryValues = ["id", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
		const shortlistedAnswers = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	
		log.debug("Shortlsited Answers: " + JSON.stringify(shortlistedAnswers));
	
		let shortlistedAnswerSets = shortlistedAnswers.length / cardBacks;

		return [cardBacks, shortlistedAnswerSets];
	},

	getNewQuestions: async function (latestRound){
		let queryValues = ["score", "questions"];
		let averageScore = await db.query("SELECT AVG(??) FROM ??", queryValues);
		//Returns array of objects
	
		averageScore = Object.values(averageScore[0]);
		averageScore = parseInt(averageScore);
		
		queryValues = ["id", "question", "blanks", "questions", "score", averageScore];
		let topRandonQuestions = await db.query("SELECT DISTINCT ??, ??, ?? FROM ?? WHERE ?? >= ? ORDER BY RAND() LIMIT 7", queryValues);
		let lowRandomQuestions = await db.query("SELECT DISTINCT ??, ??, ?? FROM ?? WHERE ?? <= ? ORDER BY RAND() LIMIT 3", queryValues);
		let questions = topRandonQuestions;
		questions = questions.concat(lowRandomQuestions);
		shuffle(questions);

		for(let i=0;i<questions.length;i++){
			const queryValues = ["round_question", "round_id", "question_id", latestRound[0].id, questions[i].id];
			await db.query("INSERT INTO ?? (??, ??) VALUES (?, ?);", queryValues);
		}

		return questions;
	},

	getMasterQuestions: async function (socket) {
		let queryValues;

		//Select latest round
		queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
		
		//If player already has cards for this round. show those and exit
		//get round_question rows for this round.
		queryValues = ["question_id", "id", "round_question", "round_id", latestRound[0].id];
		const offeredQuestions = await db.query("SELECT ?? as ?? FROM ?? WHERE ?? = ? ORDER BY RAND()", queryValues);
	
		let questions;
		if(offeredQuestions.length > 2){
			questions = [];
			for (let index = 0; index < offeredQuestions.length; index++) {
				const id = offeredQuestions[index].id;
				queryValues = ["id", "question", "blanks", "questions", "id", id];
				const thisQuestion = await db.query("SELECT ??, ??, ?? FROM ?? WHERE ?? = ?", queryValues);
				questions.push(thisQuestion[0]);
			}
		} else {
			questions = await this.getNewQuestions(latestRound);
			//Save the new cards to round_question
		}

		return questions;
		
	},

	getRoundQuestion: async function (socket){
		//Get current question
			//Select latest round & question
			let queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
			const latestRound = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
		
			//Get round question text
			queryValues = ["id", "question", "blanks", "questions", "id", latestRound[0].question_id];
			const roundQuestion = await db.query("SELECT ??, ??, ?? FROM ?? WHERE ?? = ? LIMIT 1", queryValues);

			return roundQuestion;
		}

}

const host = {
	//The host has the ability to start the game, and (in future) end the game early & kick out players.
	check: async function (socket){
		/* Check if they are host */ 
		let isHost = await db.select("ishost", "players", "id", socket.userID);
		isHost = isHost[0].ishost;
		
		if(isHost == 1){
			return true;
		} else {
			return false;
		}
	},
}

const master = {	
	//The master is responsible for choosing questions, and the winner of each round. 

	// Question master invoked methods & data

	check: async function (socket){
		/* Check if they are question master */ 
		let isMaster = await db.select("ismaster", "players", "id", socket.userID);
		isMaster = isMaster[0].ismaster;
		
		if(isMaster == 1){
			return true;
		} else {
			return false;
		}
	},

	updateState: async function (socket, masterState){
		/* Update the state of the master */

		//Find the master for this game
		const queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 1 ];
		const playersInGame = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ?", queryValues);
		
		await db.update("players", "state", masterState, "id", playersInGame[0].id);
	},

	timedOut: async function (io, socket){
		await player.updateState(socket, "disconnected");
		await player.flagAsDisconnected(socket);
		await master.change(io, socket);
	},

	change: async function (io, socket){		
		//Change master - clear master status and find a new one.

		//Clear any existing master
		await db.update("players", "ismaster", 0, "game_id", socket.gameID);

		//Find a new master
		await game.ensureHostAndMaster(io, socket);
	},

	fromWinner: async function(socket, latestRound) {
		//Clear any existing master
		await db.update("players", "ismaster", 0, "game_id", socket.gameID);


		//Find winner 
		const queryValues = ["player_id", "round_answer", "round_id", latestRound[0].id, "iswinner", 1];
		const newMasterResult = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);

		const winnerID = newMasterResult[0].player_id;

		//Set found winner as Master
		await db.update("players", "ismaster", 1, "id", winnerID);
	},

	pickQuestion: async function (io, socket, dirtyQuestionID){
		/* Set the chosen question as the round's question & score it */

		if (socket.userID == null) {
			log.debug("Returned out of masterpickedquestion... no user session.")
			return false;
		}

		if(sanitise.masterQuestion(dirtyQuestionID)===false){
			log.error("Master question did not pass sanitisation")
			return false;
		}
		const questionID = dirtyQuestionID;

		log.debug("MADE IT THROUGHT PICK QUESTION CHECKS *****************************")

		await db.update("rounds", "question_id", questionID, "game_id", socket.gameID)
		
		scoreQuestion(socket, questionID);
	},

	pickWinner: async function (io, socket, dirtyWinnerID){
	
		if(dirtyWinnerID.length > 10){
				return;
		} else if(dirtyWinnerID !== null){
			if (!String(dirtyWinnerID).match(/^[0-9]+$/i)) {
				return;
			}
		} else {
			return;
		}
	
		// console.log("Dirty Winner Id PASSED");
		//if we made it this far, input is clean
		const winnerID = dirtyWinnerID;
	
		scoreWinner(socket, winnerID);
	
		await processConfirmedWinner(socket, winnerID);
		log.debug("finished processing confrimed winners");
	
		// await updatePlayerStates(socket, "master-winner-chosen", "player-winner-chosen");


	
		client.requestState(io, socket);
	}
	
}

const player = {
	// Player invoked methods & data


	updateState: async function (socket, state = null){
		await db.update("players", "state", state, "id", socket.userID);
	},

	flagAsDisconnected: async function (socket){
		await db.update("players", "connected", 0, "id", socket.userID);
	},

	flagAsConnected: async function (socket){
		await db.update("players", "connected", 1, "id", socket.userID);
	},

	ensureCount: async function (io, socket){
		//Ensure that there is the right amount of players
		//Deal with overflow players
		//!!! Make sure that host & master have been ensured before calling this function.

		
		//Get a list of users flagged as connected to this game.
		let queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1];
		const connectedPlayers = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);

		//Check for NO players
		if(connectedPlayers.length === 0){
			//Everyone left
			game.end(io, socket);
			return;
		}

		//Get this user's Master & Host status
		queryValues = ["ishost", "ismaster", "players", "id", socket.userID];
		let userPrivileges = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ?", queryValues);
		const isMaster = userPrivileges[0].ismaster;
		const isHost = userPrivileges[0].ishost;

		//If current user is not the host, find out who is.
		let theHostID;
		if(isHost === 1){
			theHostID = socket.userID;
		} else {
			queryValues = ["id", "players", "game_id", socket.gameID, "ishost", 1];
			theHostID = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
			theHostID = theHostID[0].id;
		}

		//Check for minimum players.
		if(connectedPlayers.length >= hatefulConfig.minPlayers){
			//There are more than the minimum amount of connected players, enable game start.
			io.in(socket.gameID).emit('enableGameStart', theHostID);
		} else {
			//There are less than the minimum amount of connected players, DISable game start.

			await db.update("games", "started", 0, "id", socket.gameID);
			//Mark game as not ongoing. This tells laravel to stay in the lobby.

			io.in(socket.gameID).emit('disableGameStart', theHostID);
			//If this gets called during gameplay, it will show the lobby page.
			
			await game.updateState(io, socket, "next-round");
			//Clear current round progress. When game gets started again everyone's state will be set to new round states anyway.
			//Scores are not affected. Scoreboard will continue when game starts again.
		}

		//Check for Max Players 
		if(connectedPlayers.length > hatefulConfig.maxPlayers){
			//If they are host or master, disconnect someone else.
			if (isMaster == 1 || isHost == 1){
				//Find player that is not master or host, the latest one to join.
				queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "ismaster", 0, "created_at"];
				let playersLeft = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
			
				//Find overflow user and make them disconnect themselves, to bring connected player count back to allowed range.
				io.in(socket.gameID).emit('find-overflow-user', playersLeft[0].id);
				
			} else {	//If not master or host.
	
				await player.flagAsDisconnected(socket);
				//flag user as disconnected to bring connected count back to normal.

				await player.updateState(socket, "overflow");
				
				client.makeOverflow(socket);
			}
		}
		
		//Check if there is space available for overflow users
		if(connectedPlayers.length < hatefulConfig.maxPlayers){
			log.debug("IN PLAYER COUNT. CONN. PLAYERS IS NOW LESS THAN MAX ========")

			//broadcast there is a space available. first player to reconnect gets it.
			io.in(socket.gameID).emit('space-available');
		}
	},
	
	pickAnswer: async function (io, socket, dirtyAnswerIDS){
		/* Shortlists the answer(s) and updates everyone that a player has answered */
	
		if(sanitise.playerAnswer(dirtyAnswerIDS)===false){
			log.error("AnswerID from userID " + socket.userID + " dirty. Answer not counted.")
			return false;
		}
		const answerIDS = dirtyAnswerIDS;

		const latestRound = await game.getLatestRound(socket);
		log.stringify(latestRound, "Latest round at pickAnswer");

		await cards.shortlistAnswers(socket, answerIDS, latestRound);
		cards.scoreAnswers(socket, answerIDS, latestRound);

		const cardBacksData = await cards.getCardBacks(socket, answerIDS.length);
		client.showCardBacks(io, socket, ...cardBacksData);

	},




}









function alertSocket(socket, message){
	setTimeout(function (socket) {
		socket.emit('alert-socket', message);
	}, 3000, socket);
}


async function scoreQuestion(socket, questionID){

	//Score question against offered questions

	//Select latest round
	let queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const roundID = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1;", queryValues);

	//Select all offered questions data
	queryValues = [roundID[0].id];
	const offeredQuestions = await db.query("SELECT questions.id, questions.score FROM questions INNER JOIN round_question ON questions.id = round_question.question_id WHERE round_question.round_id = ?", queryValues);

	//Select winning question data
	queryValues = ["id", "score", "questions", "id", questionID];
	const chosenQuestion = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ?;", queryValues);

	cards.score(chosenQuestion, offeredQuestions, "questions");
}


function newPlayerWaitForNextRound(socket){
	const screen = files.get("game-states/new-player-waiting.html");
	socket.emit("load-new-state", screen);
	
}

function disconnectedOrTimeout(socket){
	const screen = files.get("game-states/disconnected-or-timeout.html");
	socket.emit("load-new-state", screen);
}



async function processConfirmedWinner(socket, winnerID) {
	log.debug("processConfirmedWinner, winnerID:" + JSON.stringify(winnerID));
	let queryValues;
	queryValues = ["id", "question_id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);

	// queryValues = ["id", "blanks", "questions", "id", latestRound[0].question_id];
	// const roundQuestion = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? LIMIT 1", queryValues);

	//Select the shortlisted answers
	queryValues = [latestRound[0].id, latestRound[0].question_id];
	const shortlistedAnswersFromQuestionAnswer = await db.query(`
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
		winnerAnswers = await db.query(`
		SELECT round_answer.answer_id, round_answer.player_roaster_id, question_answer.score 
		FROM round_answer, question_answer 
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND question_answer.answer_id = round_answer.answer_id AND question_answer.question_id = ?
		;
		`, queryValues);

		queryValues = [latestRound[0].id, winnerID];
		winnerRoasters = await db.query(`
		SELECT round_answer.player_roaster_id 
		FROM round_answer 
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND round_answer.player_roaster_id IS NOT NULL
		;
		`, queryValues);

	} else {
		//No score from Question Answer found. Using default from answers table

		queryValues = [latestRound[0].id];
		offeredAnswers = await db.query("SELECT answers.id, answers.score FROM answers, round_answer WHERE answers.id = round_answer.answer_id AND round_answer.round_id = ? AND round_answer.shortlisted = 1", queryValues);
		//Select the winner answers (shortlisted by the winner)
		queryValues = [latestRound[0].id, winnerID];
		winnerAnswers = await db.query(`
		SELECT round_answer.answer_id, round_answer.player_roaster_id, answers.score
		FROM round_answer, answers
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND answers.id = round_answer.answer_id
		`, queryValues);

		queryValues = [latestRound[0].id, winnerID];
		winnerRoasters = await db.query(`
		SELECT round_answer.player_roaster_id
		FROM round_answer
		WHERE round_answer.round_id = ? AND round_answer.player_id = ? AND round_answer.shortlisted = 1 AND round_answer.player_roaster_id IS NOT NULL;
		;
		`, queryValues);
		
	}	

	winnerAnswers = winnerAnswers.concat(winnerRoasters);
	log.debug("winner answers" + JSON.stringify(winnerAnswers));

	//Score answer
	for (let i = 0; i < winnerAnswers.length; i++) {
		if(winnerAnswers[i].answer_id == null){

			//Make Answer Winner
			queryValues = ["round_answer", "iswinner", 1, "round_id", latestRound[0].id, "player_roaster_id", winnerAnswers[i].player_roaster_id, "player_id", winnerID];
			db.query("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?  AND ?? = ?", queryValues);
			
			//No need to score it
		} else {

			//Make Answer Winner
			queryValues = ["round_answer", "iswinner", 1, "round_id", latestRound[0].id, "answer_id", winnerAnswers[i].answer_id, "player_id", winnerID];
			db.query("UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ? AND ?? = ?", queryValues);

			cards.score(winnerAnswers[i], offeredAnswers, "question_answer", latestRound[0].question_id);
		}
	}
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
	
	if(!(master.check(socket))){
		return;
	}

	//Get answers from round_answer from latest round where user = socket.userID

	//Get latest round

	const latestRound = await game.getLatestRound(socket);

	const playerAnswers = await cards.getShortlistedAnswers(latestRound);

	const blanks = await db.select("blanks", "questions", "id", latestRound.question_id);

	//Create cards insert
	let answersInsert = "<h2 class='mx-1 mb-4'>Pick a winner</h2>";
	let currentAnswerText = "";
	for (let i = 0; i < playerAnswers.length; i++) {

		//Check if roaster card or not.
		if(playerAnswers[i].answer_id != null){
			//This row has an actual answer
			//Make data for new game state
			currentAnswerText = await db.select("answer", "answers", "id", playerAnswers[i].answer_id);
			currentAnswerText = currentAnswerText[0].answer;
			if(i===0){
				answersInsert += `<a class="click-card hover-effect-grow answer-grouping-container answer-not-selected" id="answer-${playerAnswers[i].player_id}" onclick="pickWinner(${playerAnswers[i].player_id})" href="#">`;
			}
			if(i % blanks === 0 && i !== 0 && i !== playerAnswers.length){
				answersInsert += `</a><a class="click-card hover-effect-grow answer-grouping-container answer-not-selected" id="answer-${playerAnswers[i].player_id}" onclick="pickWinner(${playerAnswers[i].player_id}, null, 'shortlisted')" href="#">`;
			}
		} else {
			//This row has a roaster card
			//Make data for new game state
			currentAnswerText = await db.select("fullname", "players", "id", playerAnswers[i].player_roaster_id);
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





async function proceedWithMissingAnswers(io, socket){
	log.debug("proceeding with missing answers")
	//Select latest round
	let queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
	const latestRound = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);

	//get shortlisted round_answer rows for this round.
	queryValues = ["id", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
	const playerAnswers = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);

	if(playerAnswers.length == 0){
		//Reset timer if nobody answered
		client.requestState(io, socket);
	} else {
		//Continue with at least one answer if there is one.
		await game.updateState(io, socket, "picking-winner");
		client.requestState(io, socket);
	}
}

async function scoreWinner(socket, winnerID){
	const oldScore = await db.select("score", "players", "id", winnerID)
	await db.update("players", "score", oldScore[0].score + 100, "id", winnerID);
	client.emitPlayersInGame(io, socket);
}


async function showLoader(io, socket){
	io.in(socket.gameID).emit('show-loader');
}





io.on('connection', (socket) => {
	log.info('A user connected');

	socket.on('join', function (dirtyUserID) {
		client.join(io, socket, dirtyUserID);  
	});
	
	socket.on('start-game', async function(){
		if(!(await host.check(socket))){
			log.important("Non host at socket start-game");
			return;
		}
		await game.start(socket);
		await game.newRound(io, socket);
		client.refresh(io, socket, socket.gameID)
	});

	socket.on('what-is-my-state', function(){
		game.processState(io, socket);
	});

	socket.on('master-picked-question', async (dirtyQuestionID) => {
		master.pickQuestion(io, socket, dirtyQuestionID);
		await game.updateState(io, socket, "picking-answer");
		client.requestState(io, socket);
	});

	socket.on('player-confirmed-answers', async (dirtyAnswerIDS) => {
		await player.updateState(socket, "answered");
		//Player state is set back to "active" as soon as they land on the "picking-winner" state.
		player.pickAnswer(io, socket, dirtyAnswerIDS);

		if(await game.everyoneAnswered(socket)){
			await game.updateState(io, socket, "picking-winner");
			client.requestState(io, socket);
		}
	});

	socket.on('master-confirmed-winner', async (dirtyWinnerID) => {
		master.pickWinner(io, socket, dirtyWinnerID);
		await game.updateState(io, socket, "show-winner");
	});
	
	socket.on('i-am-overflow', async () => {
		await player.flagAsDisconnected(socket);
		await player.updateState(socket, "overflow");
		client.makeOverflow(socket);
		client.emitPlayersInGame(io, socket);
	});
	
	socket.on('disconnect', () => {
		client.disconnect(io, socket);
	}); 

}); //End of connection scope.

