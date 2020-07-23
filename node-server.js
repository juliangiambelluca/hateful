
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
	//One card from answerCards will always be a player name card.
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
	maxStaggerDelay: this.staggerDelay * this.maxPlayers 	//Maximum delay players will experience.
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
		//Reset staggering delay if it gets too big
		if(io.in(socket.gameID).staggerDelay > hatefulConfig.maxStaggerDelay){io.in(socket.gameID).staggerDelay = 0};

		log.info("Get Answer Staggering Delay: " +  io.in(socket.gameID).staggerDelay);
		//Stagger answer getting to avoid duplicates being offered.
		setTimeout((action, parameters) => {
			action(...parameters);
		}, io.in(socket.gameID).staggerDelay, action, parameters);
		//add 500ms to stagger delay for next person
		io.in(socket.gameID).staggerDelay += hatefulConfig.staggerDelay;	
	},

	join: async function (io, socket, dirtyUserID){
		//Never use the dirty user ID in SQL queries!
			//Sanitise Input
			let userID = dirtyUserID.replace(/[^0-9]/g, '');
			//if userID is more than 9.9... Billion, it's defintely invalid.
			if(userID.length > 10){userID = null};
	
			userID = parseInt(userID, 10);	

			if(userID === NaN){
				//Reject bad input
				socket.join("dodgyID");
				io.in("dodgyID").emit('dodgyID');
				log.critical("Dodgy User ID denied:" + dirtyUserID);
				return;
			} 
	
			let gameID = await db.select("game_id", "players", "id", userID);
			//First result (row); attribute: game_id
			gameID = gameID[0].game_id;
			gameID = parseInt(gameID, 10);

			socket.gameID = gameID;
			socket.userID = userID;

			//^Sanitisation of ID

			//Connect code

			//Clear their disconnect timer before they wait for their turn to connect
			if (socket.userID != null) {
				if (timeoutUserIDPivot.includes(socket.userID)) {
					const timeoutRow = timeoutUserIDPivot.indexOf(socket.userID);
					clearTimeout(timeouts[timeoutRow]);
					timeoutUserIDPivot.splice(timeoutRow, 1);
					timeouts.splice(timeoutRow, 1);
					log.info("Timeout cleared & deleted from array.");

				}
			}

			if(io.in(socket.gameID).staggerDelay == null){
				io.in(socket.gameID).staggerDelay = 10;
			}
			
			setTimeout(async(io, socket) => {
				
					socket.join(socket.gameID);
					// console.log("Node Session data says - Game ID:" + socket.gameID + " User ID:" + socket.userID)
					//if they return after leaving within 10 seconds, stop db from updating them to disconnected.
				
					//User joined their room. Mark them as connected in DB
					await db.update("players", "connected", 1, "id", socket.userID);

					//Let user know they connected and output this to console.
					// console.log(userID + ' Joined room:' + socket.gameID);
					io.in(gameID).emit('joinRoomSuccess');

					//Let everyone in room know the updated connected users list.
					emitPlayersInLobby(io, socket.gameID);

					//Player will get flagged as disconnected if there's too many players.
					player.count(io, socket); 
					client.requestState(io, socket, true);

			}, io.in(socket.gameID).staggerDelay, io, socket);
			//add stagger delay for next person
			io.in(socket.gameID).staggerDelay += (hatefulConfig.staggerDelay / 2);

			log.info("Join Staggering Delay: " +  io.in(socket.gameID).staggerDelay);

			
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

		let isMaster = await db.select("ismaster", "players", "id", socket.userID);
		isMaster = isMaster[0].ismaster;		

		ensureHostAndMaster(io, socket);

		let userStateResult = await db.select("state", "players", "id", socket.userID);
		let userState = userStateResult[0].state;
		log.debug(socket.userID + "'s USER state is: " + userState);

		let gameStateResult = await db.select("state", "games", "id", socket.gameID);
		let gameState = gameStateResult[0].state;
		log.debug(socket.gameID + "'s GAME state is: " + gameState);

		switch (gameState) {
			case "picking-question":
				game.startTimer(io, socket, hatefulConfig.gameTimerLength, [io, socket], function(...parameters) {
					newMaster(io, socket, null, true);
				});
				if (isMaster == 1){
					//Reset staggering delay.
					io.in(socket.gameID).staggerDelay = 0;
					client.showQuestions(socket, await cards.getMasterQuestions(socket));
					//if master times out, change master - and if they're host, change host too.
				} else {
					client.showQuestionWaiting(socket);
				}
			break;
			
			case "picking-answer":
				game.startTimer(io, socket, hatefulConfig.gameTimerLength, [io, socket], function(...parameters) {
					//If they don't answer in time they won't be able to win.
					//If nobody answers the timer is reset.
					proceedWithMissingAnswers(io, socket);
				});
				if (isMaster == 1){
					client.showAnswerWaiting(socket);
				} else {			
					client.showMainTemplate(socket);
					client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));

					client.stagger(io, socket, [socket], function(...parameters) {
						cards.getPlayerAnswers(socket);
					});

				}
			break;

			case "picking-winner":
				//Change "answered" user states to active again
				//If they haven't answered then their state would still be active.
				if(userState === "answered"){
					await player.updateState(socket, "active");
					client.requestState(io, socket);
				}

				//if master times out, change master - and if they're host, change host too.
				
				game.startTimer(io, socket, hatefulConfig.gameTimerLength, [io, socket], function(...parameters) {
					newMaster(io, socket, null, true)
				});
				if (isMaster == 1){	
					//reset stagger delay
					io.in(socket.gameID).staggerDelay = 0;
					//Master needs to see everyones card's
					client.showMainTemplate(socket);
					client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
					getMasterAnswers(socket);
				} else {
					//TODO - SHOW THEM dummy answer cards
					showResultsWaitingScreen(socket);
				}
			break;
			
			case "show-winner":
				client.showMainTemplate(socket);
				client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
				showWinners(socket);

				if (isMaster == 1){		
					game.startTimer(io, socket, (hatefulConfig.gameTimerLength / 3), [io, socket], async function(...parameters) {
						log.green("Start timer activeated. changing game state to start.")
						await game.updateState(io, socket, "start");
						client.requestState(io, socket);
					});
				} else {
					//Emit dummy timer
					socket.emit('start-timer', (hatefulConfig.gameTimerLength / 3));
				}
			break;
			case "start":
				showLoader(io, socket);
				if (isMaster == 1){		
					await game.updateState(io, socket, "picking-question");
					log.green("Executing sart new round");
					startNewRound(io, socket);
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
				socket.emit("overflow-player");
				break;
		
			case "answered":
				client.showMainTemplate(socket);
				client.showRoundQuestion(socket, await cards.getRoundQuestion(socket));
				showPlayerAnswerWaiting(socket);
				//If timer is already set (which it should be), they will just see a continuation of their previous countdown.
				game.startTimer(io, socket, hatefulConfig.gameTimerLength, function() {
					proceedWithMissingAnswers(io, socket)
				});
				break;
		
			default:
				break;
		}

	},
	/*  Good stuff above */

	updateState: async function (io, socket, stateName){
		await db.update("games", "state", stateName, "id", socket.gameID);
		this.clearTimer(io, socket);
	},

	start: async function (io, socket, masterID = null){
		//reset the stagger delay
		io.in(socket.gameID).staggerDelay = 0;
	
		// console.log("In start game!!!");
		if(socket.userID == null){
			return;
		}

		const gameID = socket.gameID;

		let userID = socket.userID;

		if(masterID != null){userID = masterID};

		let isHost = await db.select("ishost", "players", "id", userID);
		let isMaster = await db.select("ismaster", "players", "id", userID);
		isHost = isHost[0].ishost;		
		isMaster = isMaster[0].ismaster;		

		//Only the master/host can start game
		if (isMaster != 1 && isHost != 1){
			return;
		}

		log.debug("Is Master, Starting Game!")
		
		const queryValues = ["rounds", "game_id", gameID];
		await db.query("INSERT INTO ?? (??) VALUES (?);", queryValues);
		
		await db.update("games", "started", 1, "id", gameID);

	},

	startTimer: async function (io, socket, timerLength = null, parameters = null, action = null){

		socket.emit('times-up');
	
		//select timer length, timerstart from game table where game id = socket game id
		let queryValues = ["timer_start", "timer_length", "games", "id", socket.gameID];
		const mysqlGameTimer = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ?", queryValues);
	
		log.debug("DEBUG: timer_start:" + mysqlGameTimer[0].timer_start + "timer_length:" + mysqlGameTimer[0].timer_length + "-");
	
		//if timer start + timer length is in past or timer start is null, timer expired -- insert (update) timer
		const endOfTimer = parseInt(mysqlGameTimer[0].timer_start) + parseInt(mysqlGameTimer[0].timer_length);
		const timeLeftOnTimer = endOfTimer - (Date.now()/1000);
		
		log.debug("timeLeftOnTimer:" + timeLeftOnTimer);
	
		if(!(mysqlGameTimer[0].timer_start == null || isNaN(endOfTimer) || timeLeftOnTimer <= 0)){
			//endOfTimer should be a valid time stamp.
			//timer is still current -> (timerstart + timerlength) - current time = time left on timer
			//emit start timer with time left on timer
			socket.emit('start-timer', timeLeftOnTimer);
	
		} else {
			//Timer hasn't been set or is a dodgy value.
	
			//If this game already has a game timer, delete it.
			clearTimeout(io.in(socket.gameID).gameTimer);
			io.in(socket.gameID).gameTimer = null
	
			//Create the timer
			queryValues = ["games", "timer_start", (Date.now()/1000), "timer_length", timerLength, "id", socket.gameID];
			db.query("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? ", queryValues);
	
			socket.emit('start-timer', timerLength);
	
			//Create a new timer
			io.in(socket.gameID).gameTimer = setTimeout((io, socket, action, parameters) => {
				log.debug("GAME TIMER GONE OFF");
				io.in(socket.gameID).emit('times-up');
				if(action !== null){
					action(...parameters);
				}
				io.in(socket.gameID).gameTimer = null
				//=5 secs to help everyone sync properly.
			}, ((timerLength + 5) * 1000), io, socket, action, parameters);
	
		}
	
	},

	clearTimer: function (io, socket){
		io.in(socket.gameID).emit('times-up');

		clearTimeout(io.in(socket.gameID).gameTimer);
		io.in(socket.gameID).gameTimer = null

		//clear the timer
		let queryValues = ["games", "timer_start", null, "timer_length", null, "id", socket.gameID];
		db.query("UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ? ", queryValues);
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
	}
	
}

const sanitise = {
	// Input sanitising functions


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
		//Don't allow master to get cards.
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

const master = {	
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

	count: async function (io, socket){
		//If current player is host or master do not disconnect them.
		let isMaster = await db.select("ismaster", "players", "id", socket.userID);
		let isHost = await db.select("ishost", "players", "id", socket.userID);
	
	
		let queryValues = ["id", "players", "game_id", socket.gameID, "ishost", 1];
		let theHostID = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	
		if (typeof theHostID[0].id == 'undefined' || theHostID[0].id === null) { 
			log.error("checkPlayerCount could not find the Host ID");
			alertSocket(socket, "Please refresh, something went wrong. [checkPlayerCount could not find the Host ID]");
			return; 
		} else { 
			theHostID = theHostID[0].id; 
		}
	 
		isMaster = isMaster[0].ismaster;		
		isHost = isHost[0].ishost;		
	
		queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1];
		const connectedPlayers = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
		//Returns array of objects
		if(connectedPlayers.length >= hatefulConfig.minPlayers){
			io.in(socket.gameID).emit('enableGameStart', theHostID);
			
		} else {
			io.in(socket.gameID).emit('disableGameStart', theHostID);
			//TODO
			//^If this gets called during gameplay, it will show the lobby.
			await db.update("games", "started", 0, "id", socket.gameID);
			//TODO
			//^This tells laravel to stay in the lobby
			// updatePlayerStates(socket, "no-state", "no-state");
			await game.updateState(io, socket, "start");
			//^Clear current round progress. When game gets started again everyone's state will be set to new round states anyway.
			//Scores are not affected. Scoreboard will continue when game starts again.
		
		}
		if(connectedPlayers.length > hatefulConfig.maxPlayers){
		
			//If they are host or master, disconnect someone else.
			if (isMaster == 1 || isHost == 1){
				//Find player that is not master or host, the latest one to join.
				queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "ismaster", 0, "created_at"];
				let playersLeft = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
			
				//disconnect this user to bring connected player count back to normal.
				io.in(socket.gameID).emit('find-overflow-user', playersLeft[0].id);
				
				
			} else {
				//If not master or host.
	
				//disconnect this user to bring connected count back to normal.
				db.update("players", "connected", 0, "id", socket.userID);
					
				//Change this one user's state.
				// updatePlayerStates(socket, null, "overflow-player", true);
				await player.updateState(socket, "overflow");
				
				socket.emit("overflow-player");
				emitPlayersInLobby(io, socket.gameID);
			}
	
			
		} 
		if(connectedPlayers.length <= hatefulConfig.maxPlayers){
			//broadcast there is a space available. first player to reconnect gets it.
			io.in(socket.gameID).emit('space-available');
			emitPlayersInLobby(io, socket.gameID);
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





async function disconnectUser(io, socket){
	if (socket.userID == null) {
		log.warning("User disconnected but no session. Exiting disconnectTimer function.");
        return;
    }
    
    log.info("A user (" + socket.userID + ") is disconnecting...");

    //Create set timeout to flag as disconnected and re-choose host after a few seconds
    const disconnectTimer = setTimeout(async function(io, socket){
        let queryValues;
        let playersLeft;

        //Deal with host disconnects
        log.info("disconnectTimer triggered");

        let isHost = await db.select("ishost", "players", "id", socket.userID);
        isHost = isHost[0].ishost;

        log.info(socket.userID + "'s Host status: '" + isHost + "'");


        if (isHost==1){
            //Find appropiate new host
            queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "created_at"];
            playersLeft = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
            
            // console.log("Players Left obj: " + JSON.stringify(playersLeft));
        
            if(playersLeft.length == 0){
                log.info("***Everyone left!***");
                //TODO - Delete everything related to this game!
            } else {
				// console.log("newHostArr=" + JSON.stringify(newHost))

                await db.update("players", "ishost", 0, "id", socket.userID);
				await db.update("players", "ishost", 1, "id", playersLeft[0].id);
                // console.log('\x1b[42;97m%s\x1b[0m', "***Everyone left!***");
				
                log.info(socket.userID + " lost Host privilege to " + playersLeft[0].id);

                const newHost = [playersLeft[0].id, playersLeft[0].fullname];
                io.in(socket.gameID).emit('newHost', newHost);
            }
        } //End if Host
        

        //Deal with question master disconnects
        let isMaster = await db.select("ismaster", "players", "id", socket.userID);
        isMaster = isMaster[0].ismaster;

       	log.info(socket.userID + "'s Host status: '" + isMaster + "'");

        if (isMaster==1){
            // console.log("isMaster==1");
            //Find appropiate new master
            queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "created_at"];
            playersLeft = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
            
            log.info("Players Left obj: " + JSON.stringify(playersLeft));
        
            if(playersLeft.length==0){
                log.info("Everyone left!***");
                //Delete everything related to this game!
            } else {
                const newMaster = [playersLeft[0].id, playersLeft[0].fullname];
                // console.log("newMasterArr=" + JSON.stringify(newMaster));

                
                //Find this master's state.
                //Give the master no-state.
                // const oldMasterState = await db.select("state", "players", "id", socket.userID);
				// updatePlayerStates(socket, "no-state");
				await master.updateState(socket, "disconnected");

                //Change masters
				await db.update("players", "ismaster", 0, "id", socket.userID);
                await db.update("players", "ismaster", 1, "id", playersLeft[0].id);
			
                // console.log(userID + " lost Master privilege to " + newMaster[0]);
                log.info(socket.userID + " lost Master privilege to " + playersLeft[0].id);

                //Give the new master that state
                //A lil delay to ensure above code has in fact completed.
                // setTimeout(() => {
                    // updatePlayerStates(socket, oldMasterState[0].state)
                io.in(socket.gameID).emit('newMaster', newMaster);
                // }, 250);
            }  
        } //End if Master


        //Mark them as disconnected in DB.
        await db.update("players", "connected", 0, "id", socket.userID);
        
        //Update front-end player list.
        emitPlayersInLobby(io, socket.gameID);

		log.debug("DISCONNECT TIMER Socket before cPC: gID - uID = " + socket.gameID + "," + socket.userID);

        await player.count(io, socket);

        //Clear this timer from the timeouts table
        const timeoutRow = timeoutUserIDPivot.indexOf(socket.userID);
        //Important to delete both to keep timeouts and user ID's indexes aligned.
        timeoutUserIDPivot.splice(timeoutRow, 1);
        timeouts.splice(timeoutRow, 1);

        delete socket.userID;
        delete socket.gameID;
        // socket.handshake.session.save();
        log.info("Session & Disconnect timeout deleted - no longer needed.");

    }, hatefulConfig.disconnectTimerLength, io, socket);
    // Important to pass the user data to the timer function!

    timeouts.push(disconnectTimer);
    timeoutUserIDPivot.push(socket.userID);
    log.info("Timer pushed.");


}

async function emitPlayersInLobby(io, gameID){
		const queryValues = ["id", "fullname", "score", "ismaster", "players", "game_id", gameID, "connected", 1];
		const connectedPlayers = await db.query("SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY score DESC", queryValues);
	
		io.in(gameID).emit('playersInLobby', connectedPlayers);

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
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/new-player-waiting.html"), 'utf8');
		log.info("File read");
		// setTimeout((socket) => {
		socket.emit("load-new-state", data);
		// }, 500, socket);
	} catch(e) {
		alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
		log.critical('File not read:', e.stack);
	}
}

function disconnectedOrTimeout(socket){
	try {
		var data = fs.readFileSync(path.resolve(__dirname, "game-states/disconnected-or-timeout.html"), 'utf8');
		log.info("File read");
		// setTimeout((socket) => {
		socket.emit("load-new-state", data);
		// }, 500, socket);
	} catch(e) {
		alertSocket(socket, "Sorry, we couldn't load your game. Something went wrong on our end. Please refresh the page or try again later.")
		log.critical('File not read:', e.stack);
	}
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

	//make sure theyre master
	let isMaster = await db.select("ismaster", "players", "id", socket.userID);
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
	const latestRound = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);

	//get shortlisted round_answer rows for this round.
	queryValues = ["answer_id", "player_id", "player_roaster_id", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
	const playerAnswers = await db.query("SELECT ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);
	log.debug("shortlistedAnswers=" + playerAnswers.length)

	let blanks = 1;
	let checkForBlanksID = playerAnswers[0].player_id;
	//Start at one because we'e already  ^ checked 0.
	for (let index = 1; index < playerAnswers.length; index++) {
		if (playerAnswers[index].player_id === checkForBlanksID){
			blanks++;
		}
	}

	log.debug("Answer grouping container blansk: " + blanks);
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
		const latestRound = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC", queryValues);
	
		//get shortlisted round_answer rows for this round.
		queryValues = ["answer_id", "player_roaster_id", "player_id", "iswinner", "round_answer", "round_id", latestRound[0].id, "shortlisted", 1];
		const playerAnswers = await db.query("SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? ORDER BY player_id, `order` ASC", queryValues);
		log.debug("shortlistedAnswers=" + playerAnswers.length)
	



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
				let currentAnswerResult = await db.select("answer", "answers", "id", playerAnswers[i].answer_id);
				currentAnswerText = currentAnswerResult[0].answer;

			} else {
				//This row has an player roaster
				//Make data for new game state
				let currentRoasterResult = await db.select("fullname", "players", "id", playerAnswers[i].player_roaster_id);
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

async function newMaster(io, socket, newMaster = null, newHost = false){
	const originalNewMaster = newMaster;

	log.debug("In New Master!!! User: " + socket.userID)

	//Changes master to a new current player
	//If newMaster = "winner" then the winner of the last round will become master
	//If newMaster is not null, newMaster's value will become the new Master
    //Otherwise a random new master is chosen
    //Set newHost to true to also make this person the newHost (IF NECESSARY)


	let queryValues;
	let playersLeft;

	//Find old Master
	queryValues = ["id", "players", "ismaster", 1, "game_id", socket.gameID];
	let oldMasterResult = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	const oldMaster = oldMasterResult[0].id;

	//Find old Host
	queryValues = ["id", "players", "ishost", 1, "game_id", socket.gameID];
	let oldHostResult = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
	const oldHost = oldHostResult[0].id;

	if(newHost === true && oldMaster === oldHost){
		//Find an appropriate new Host (someone who has most recently connected to this game)
		queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "created_at"];
		playersLeft = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
		
		log.debug("Players Left obj: " + JSON.stringify(playersLeft));
	
		if(playersLeft.length!==0){
			let newHost = playersLeft[0].id;
			log.debug("newHost=" + newHost);

			//Order is important in case new host happens to be old host again
			await db.update("players", "ishost", 0, "id", oldHost);
			await db.update("players", "ishost", 1, "id", newHost);

			log.info(" lost Host privilege to " + newHost);

			const newHostName = await db.select("fullname", "players", "id", newHost);
			const newHostData = [newHost, newHostName[0].fullname];
			
			io.in(socket.gameID).emit('newHost', newHostData);
		} 
	}




	if(newMaster === null){
		//Find an appropriate new Master (someone who has most recently connected to this game)
		queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 0, "created_at"];
		playersLeft = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
		newMaster = playersLeft[0].id;
		
		//make old host idle?

    } 
    
	if(newMaster === "winner"){
		//Select latest round
		queryValues = ["id", "rounds", "game_id", socket.gameID, "id"];
		const latestRound = await db.query("SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ?? DESC LIMIT 1", queryValues);
		
		log.stringify(latestRound, "latest Round @ newMaster - iswinner");

		//find winner 
		
		//I THINK NEW ROUND GETS CREATED TOO EARLY. MAKE SURE YOU DO THIS BEFORE CREATING NEW ROUND.
		queryValues = ["player_id", "round_answer", "round_id", latestRound[0].id, "iswinner", 1];
		let newMasterResult = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ?", queryValues);
		log.stringify(newMasterResult, "newmaster @ newMaster - iswinner");

		newMaster = newMasterResult[0].player_id;


	}

		//Find the old master's state.
		//Give the old master no-state.
		// const oldMasterState = await db.select("state", "players", "id", oldMaster);
		// State should be overwritten in when next game state is loaded.... well it didnt!
		// await updatePlayerStates(socket, "disconnected-or-timeout");

		//Change masters
		await db.update("players", "ismaster", 0, "id", oldMaster);
		await db.update("players", "ismaster", 1, "id", newMaster);

		log.info(oldMaster + " lost Master privilege to " + newMaster);

		//Give the new master that state
		// await updatePlayerStates(socket, oldMasterState[0].state)

		//Find new master name
		const newMasterName = await db.select("fullname", "players", "id", newMaster);
		const newMasterData = [newMaster, newMasterName[0].fullname];
		io.in(socket.gameID).emit('newMaster', newMasterData);
	
	
	//Make everyone refresh so everyone knows what's going on.
	//The timer will be lost but reset.

	if(originalNewMaster !== "winner"){
		client.refresh(io, socket, socket.gameID);
	}

	return newMaster;
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
	emitPlayersInLobby(io, socket.gameID);
}

async function startNewRound(io, socket){
	//executed by master

	//Set new master to winner
	const newMasterID = await newMaster(io, socket, "winner");

	//start new round
	game.start(io, socket, newMasterID);
	client.refresh(io, socket, socket.gameID);

}

async function showLoader(io, socket){
	io.in(socket.gameID).emit('show-loader');
}

async function ensureHostAndMaster(io, socket){

	//Select masters flagged CONNECTED
	let queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ismaster", 1];
	const connectedMasters = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ?;", queryValues);

	//Select hosts flagged CONNECTED
    queryValues = ["id", "players", "game_id", socket.gameID, "connected", 1, "ishost", 1];
	const connectedHosts = await db.query("SELECT ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ?;", queryValues);


	if(connectedMasters.length === 0 && connectedHosts.length === 0){
		//clear all hosts and masters
		await db.update("players", "ishost", 0, "game_id", socket.gameID);
		await db.update("players", "ismaster", 0, "game_id", socket.gameID);
		//there's nobody in charge

		//find a new host&master
		 //Find appropiate new host/master
		 queryValues = ["id", "fullname", "players", "game_id", socket.gameID, "connected", 1, "ishost", 0, "ismaster", 0, "created_at"];
		 playersLeft = await db.query("SELECT ??, ?? FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? AND ?? = ? ORDER BY ?? DESC", queryValues);
		 
		 if(playersLeft.length == 0){
			 return;
		 } else {
		
			 await db.update("players", "ishost", 1, "id", playersLeft[0].id);
			 await db.update("players", "ismaster", 1, "id", playersLeft[0].id);
			 // console.log('\x1b[42;97m%s\x1b[0m', "***Everyone left!***");
			 
			 log.info(socket.userID + " lost Host privilege to " + playersLeft[0].id);

			 const newHost = [playersLeft[0].id, playersLeft[0].fullname];
			 io.in(socket.gameID).emit('newHost', newHost);
		 }

	} else if (connectedMasters.length === 0){
	    //clear all hosts and masters
		await db.update("players", "ishost", 0, "game_id", socket.gameID);
		await db.update("players", "ismaster", 0, "game_id", socket.gameID);
		//we just need a new master
		//make host the master
		//connectedHosts[0].id should be the new master
		await db.update("players", "ishost", 1, "id", connectedHosts[0].id);
		await db.update("players", "ismaster", 1, "id", connectedHosts[0].id);


	} else if (connectedHosts.length === 0){
		//clear all hosts and masters
		await db.update("players", "ishost", 0, "game_id", socket.gameID);
		await db.update("players", "ismaster", 0, "game_id", socket.gameID);
		//we just need a new host
		//make master the host
		//connectedMasters[0].id should be the new host
		await db.update("players", "ishost", 1, "id", connectedMasters[0].id);
		await db.update("players", "ismaster", 1, "id", connectedMasters[0].id);

	} else {
		//everything seems to be ok...
		return;
	}
}












io.on('connection', (socket) => {
	log.info('A user connected');

	socket.on('join', function (dirtyUserID) {
		client.join(io, socket, dirtyUserID);  
	});
	
	socket.on('start-game', async function(){
		game.start(io, socket);
		await game.updateState(io, socket, "picking-question");
		client.refresh(io, socket, socket.gameID);
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
		db.update("players", "connected", 0, "id", socket.userID);
		await player.updateState(socket, "overflow");
		socket.emit("overflow-player");
		emitPlayersInLobby(io, socket.gameID);
	});
	
	socket.on('disconnect', () => {
		disconnectUser(io, socket);
	}); 

}); //End of connection scope.

