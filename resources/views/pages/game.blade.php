@extends('layouts.game')

@section('title')
play hateful
@endsection

@section('content')

<div class="row">
<div class="col-md-12 col-lg-12">
	<div id="game-state-display"></div>
</div>
</div>


<!-- <script src="../../../node_modules/confetti-js/dist/index.min.js"></script> -->

<script src="https://cdn.jsdelivr.net/npm/socket.io-client@2/dist/socket.io.js"></script>
<script src="js/confetti.js"></script>
<!-- <script src="{{ asset('js/socket.io.js') }}"></script> -->
<script>

// var confettiSettings = { target: 'my-canvas' };
// var confetti = new ConfettiGenerator(confettiSettings);
// confetti.render();

	//on page load
		const socket = io('http://127.0.0.1:3000');

		//User inputs in session have already been sanitised. json laravel blade directive not working for me.
		const userID = "{{session('userID')}}";
		//join this room
		socket.emit('join', userID);

		// user is connected
		socket.on('joinRoomSuccess', function () {
			console.log("You are connected to the room!");
		});

		socket.on('newHost', function (newHost) {
			if(newHost[0] == userID){
				setTimeout((newHost) => {
				if(!newHost[3]==="no-alert"){
				// alert("The host disconnected. You are the new host.");
				}
				location.reload();
				}, 1000, newHost);
			} else {
				if(!newHost[3]==="no-alert"){
					// alert("The host disconnected. " + newHost[1] + " is the new host.");
				}
			}
		});
		socket.on('newMaster', function (newMaster) {
			if(newMaster[0] == userID){
				setTimeout((newMaster) => {
					if(!newMaster[3]==="no-alert"){
						alert("The Round Master timed-out or disconnected. You are the new Round Master.");
					}
					location.reload();
				}, 1000, newMaster);
			} else {
				if(!newMaster[3]==="no-alert"){
					alert("The Round Master timed-out or disconnected. " + newMaster[1] + " is the Round Master host.");
				}
				
			}
		});
		
		socket.on('refresh', function(){
			setTimeout(() => {
				location.reload();
			}, 500);
		});		
		
		socket.on('alert-socket', function(message){
			alert(message);
		});

		let isOverflowPlayer = false;
		socket.on('overflow-player', function(){
			isOverflowPlayer = true;
			$("#game-state-display").css("opacity", "1");
			$("#game-state-display").css("filter", "blur(0px)");

			$("#game-state-display").html(`
			<div class="row"><div class="col-12"><div class="spinner-border m-4" style="float: left;" role="status">
						<span class="sr-only">Loading...</span>
					</div>
					<h1 class="mt-3" style="display:inline-block; position: absolute;">There are too many players</h1></div></div>

					
					<div class="row"><div class="col-12"><h3>You have been placed in queue. Waiting for other players to leave.</h3></div></div>
					
			`);
		});

		socket.on('space-available', function(message){
			if(isOverflowPlayer){
				//reconnect
				location.reload();
			}
		});


		socket.on('find-overflow-user', function(userIDtoFind){
			if("{{session('userID')}}" == userIDtoFind){
					socket.emit('i-am-overflow');
				}
			});

		socket.on('disableGameStart', function(){
			window.location.href = '/lobby';
		});
		

		//Receive players in room
		socket.on('playersInLobby', function (players) {
			//Receiving array of names.
			updateLeaderboard(players);
		});

		//Game State logic

		//query state on page load.
		// socket.emit('what-is-my-state');
		// ^ I think this was sometimes getting called before they properly joined the room and causing errors.
		// This now gets called by the join procedure and should avoid random errors.

		//Receive players in room
		socket.on('load-new-state', function (displayData) {
			$("#game-state-display").css("opacity", "0");
			$("#game-state-display").css("filter", "blur(100px)");

			$("#game-state-display").html(displayData);

			setTimeout(() => {
				$("#game-state-display").css("opacity", "1");
				$("#game-state-display").css("filter", "blur(0px)");
			}, 50);

			showFunnyLoader("#my-answer-cards");


		});

		socket.on('show-loader', function (displayData) {
			showFunnyLoader("#game-state-display");
		});

		socket.on('show-player-question', function(questionCard){
			// alert("show-player-question");
			$("#round-question-card").html(questionCard)
		});

		socket.on('show-player-answers', function(answerCards){
			$("#my-answer-cards").html(answerCards);
		});

		socket.on('show-master-answers', function(answerCards){
			$("#my-answer-cards").html(answerCards);
		});

		// socket.on('get-your-answers', () => {
		// 	console.log("Get Your Answers!")
		// 	socket.emit('what-is-my-state');
		// 	$("#my-answer-cards").html(answerCards);

		// 	<div class="p-1" id="my-answer-cards">
		// 		<div class="spinner-border m-4" style="float: left;" role="status">
		// 			<span class="sr-only">Loading...</span>
		// 		</div>
		// 		<h1 class="mt-3" style="display:inline-block">Ripping off Cards Against Humanity...</h1>
			
		// });

		socket.on('update-your-state', () => {
			console.log("Updating state...")
			socket.emit('what-is-my-state');
			
			$("#game-state-display").html(`
					<div class="spinner-border m-4" style="float: left;" role="status">
						<span class="sr-only">Loading...</span>
					</div>
					<h1 class="mt-3" style="display:inline-block; position: absolute;">Loading...</h1>
			`);

			
		// });
		});

		socket.on('update-card-backs', (cardBacksView) => {			
			$("#card-backs").html(cardBacksView)
		});

		socket.on('show-results', function(results){
			$("#my-answer-cards").html(results);
		});

		socket.on('show-master-answers', function(data){
			$("#my-answer-cards").html(data);
		});

		socket.on('print-winners', (winnerCards) => {			
			$("#card-backs").html(winnerCards)
		});

		socket.on('you-won', () => {			
			confetti.start(20000, 45, 150)
			$("#state-instruction").html(`
			<h1 class='m-2'>You won this round! <span class='badge h5 text-weight-bold badge-success'>+100 Points</span></h1><br>
			<h5>You're the next Round Master</h5>
			`)
		});

		socket.on('you-lost', () => {			
			goldConfetti.start(750, 300)
			// $("#game-state-display").prepend("<h1>You won this round! <span class='badge badge-success'>+100 Points</span></h1>")
		});

		socket.on('start-timer', (timerTimeLeft) => {		
			socket.timerTimeLeft = timerTimeLeft;

			socket.timerInterval = setInterval(() => {
				socket.timerTimeLeft -= 1;
				$("#topbar-timer").html(secsToMMSS(socket.timerTimeLeft));
				$("#sidebar-timer").html(secsToMMSS(socket.timerTimeLeft));
			}, 1000);	

			socket.gameTimer = setTimeout((socket) => {
				clearInterval(socket.timerInterval);
				
				$("#topbar-timer").html("<span class='badge badge-danger'>Time's Up!</span>");
				$("#sidebar-timer").html("00:00 <span class='badge badge-danger'>Time's Up!</span>");
			
				// showFunnyLoader("#game-state-display");
				
			}, (socket.timerTimeLeft * 1000), socket);
		});

		socket.on('times-up', () => {			
			try {
				clearInterval(socket.timerInterval);
				clearTimeout(socket.gameTimer);
				
			} catch (error) {
				//There was no timer... not an issue...
			}
		});


		//custom functions
		function secsToMMSS(seconds) {
			var sec_num = parseInt(seconds, 10); // don't forget the second param
			var hours   = Math.floor(sec_num / 3600);
			var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
			var seconds = sec_num - (hours * 3600) - (minutes * 60);

			if (hours   < 10) {hours   = "0"+hours;}
			if (minutes < 10) {minutes = "0"+minutes;}
			if (seconds < 10) {seconds = "0"+seconds;}
			return minutes + ':' + seconds;
		}

		//Game Functions
		
		function displayNameCards(players){

				let render = "";

				for(i=0;i<players[0].length;i++){
				id = players[0][i];
				fullname = players[1][i];

				// if(!(document.getElementById("player-" + id))){
				nameCardsTemplate = `
				<div id="player-${id}" class="card game-card answer-card  ">
				<div class="card-body game-card-body">
				<div class="card-text-answer">
				${fullname}
				</div>
				</div>
				</div> 
				`;
				render += nameCardsTemplate;
				// $("#name-cards").append(nameCardsTemplate);
				// }           
				}

				$("#name-cards").html(render);
		}

		function pickQuestion(questionID){
			console.log("pick question executed");
			socket.emit("master-picked-question", questionID);
			$("#question-" + questionID).attr("onclick","console.log('Second Click detected.')");
			showFunnyLoader("#game-state-display");

		}


		let shortlistedAnswers = [];
		function pickAnswer(answerID, isRoaster = null, isShortlisted = null){ 
			if (shortlistedAnswers.length == $("#question-blanks").html()){
				return;
			}
			if (shortlistedAnswers.length === 0){
				$("#card-backs").css("display", "none")
				$("#confirm-answer").css("display", "block")
				$(".confirm-button").css("opacity", "0");
				$(".confirm-button").css("transition", "0.3s");
			}

			let answerElementID;
			if (isRoaster === "player-name-roaster"){
				answerElementID = "#roaster-answer-" + answerID;
				shortlistedAnswers.push(answerID + "roaster");
			} else {
				answerElementID = "#answer-" + answerID;
				shortlistedAnswers.push(answerID);
			}

			//Add answer card to confirm-answers area 
			
			$(answerElementID).attr("onclick","");
			$(answerElementID).removeClass("answer-not-selected");


			$(answerElementID).children().css("transition", "0.3s");

			$(answerElementID).children().css("transform", "translateY(0px)");
			$(answerElementID).children().css("opacity", "100%");

			setTimeout(() => {
	
				$(answerElementID).children().css("transform", "translateY(-250px)");
				$(answerElementID).children().css("opacity", "0%");

				setTimeout(() => {
					$(".confirm-button").css("opacity", "100%");
	
					$(answerElementID).appendTo("#confirm-answer-cards");

					if(isRoaster !== null){
						$(answerElementID).attr("onclick","unpickAnswer(" + answerID + ",'" + isRoaster + "')");
					} else {
						$(answerElementID).attr("onclick","unpickAnswer(" + answerID + ")");
					}

					$(answerElementID).addClass("mr-1");
					$(answerElementID).children().css("transition", "0.1s");
					$(answerElementID).children().css("opacity", "100%");
					$(answerElementID).children().css("transform", "translateY(200px)");
					if (shortlistedAnswers.length == $("#question-blanks").html()){
							$(".confirm-button").css("display", "block");
							showMobileConfirmButton();

							showConfirmButtonLegend();
						}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedAnswers.length == $("#question-blanks").html()){
							disableAnswers(true);
							
							$(".confirm-button").css("display", "block");
							$(".confirm-button").removeClass("btn-disabled");
							$(".confirm-button").addClass("btn-info");
							$(".confirm-button").css("opacity", "100%");

							// if(isShortlisted === "shortlisted"){
							// 	$(".confirm-button").attr("onclick","confirmWinner()");
							// 	$("#mobile-confirm-button").attr("onclick","confirmWinner()");

							// } else {
								$(".confirm-button").attr("onclick","confirmAnswers()");
								$("#mobile-confirm-button").attr("onclick","confirmAnswers()");

							// }
						}
					}, 10);

				}, 200);
			}, 10);

			

		}

		function unpickAnswer(answerID, isRoaster = null, isShortlisted = null){

			let answerElementID;
			if (isRoaster === "player-name-roaster"){
				answerElementID = "#roaster-answer-" + answerID;
				const indexOfAnswer = shortlistedAnswers.indexOf(answerID + "roaster");
				if (indexOfAnswer !== -1) shortlistedAnswers.splice(indexOfAnswer, 1);
			} else {
				answerElementID = "#answer-" + answerID;
				const indexOfAnswer = shortlistedAnswers.indexOf(answerID);
				if (indexOfAnswer !== -1) shortlistedAnswers.splice(indexOfAnswer, 1);
			}




			//Add answer card to confirm-answers area 
			$(answerElementID).attr("onclick","");
			$(answerElementID).addClass("answer-not-selected");

			$(answerElementID).children().css("transition", "0.3s");
			$(answerElementID).children().css("transform", "translateY(0px)");
			$(answerElementID).children().css("opacity", "100%");

			setTimeout(() => {
	
				$(answerElementID).children().css("transform", "translateY(250px)");
				$(answerElementID).children().css("opacity", "0%");
				$(".confirm-button").css("transition", "0.2s");

				$(".confirm-button").css("opacity", "100%");

				setTimeout(() => {	


					$(answerElementID).appendTo("#my-answer-cards");
					

					

					if(isShortlisted === "shortlisted"){
						if(isRoaster !== null){
						$(answerElementID).attr("onclick","pickAnswer(" + answerID + ",'" + isRoaster + "', 'shortlisted')");
						} else {
							$(answerElementID).attr("onclick","pickAnswer(" + answerID + ", null, 'shortlisted')");
						}
					} else {
						//is not a shortlisted card.
						if(isRoaster !== null){
						$(answerElementID).attr("onclick","pickAnswer(" + answerID + ",'" + isRoaster + "')");
						} else {
							$(answerElementID).attr("onclick","pickAnswer(" + answerID + ")");
						}
					}




					$(answerElementID).removeClass("mr-1");
					$(answerElementID).children().css("transition", "0.1s");
					$(answerElementID).children().css("opacity", "100%");
					$(answerElementID).children().css("transform", "translateY(-300px)");
					if (shortlistedAnswers.length <= $("#question-blanks").html()){
							$(".confirm-button").css("display", "none");
							showMobileConfirmButton(false);

						}
					if (shortlistedAnswers.length === 0){
						$("#confirm-answer").css("display", "none");
					}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedAnswers.length <= $("#question-blanks").html()){
							disableAnswers(false);
							$(".confirm-button").addClass("btn-disabled");
							$(".confirm-button").removeClass("btn-info");
							$(".confirm-button").removeAttr("onclick");
							$(".confirm-button").css("opacity", "0%");
							$(".confirm-button").css("display", "none");
							if (shortlistedAnswers.length === 0){
							$("#card-backs").css("display", "flex");
							}
						}
					}, 10);
				}, 200);
			}, 10);

		}		
		
		let shortlistedWinner;
		function pickWinner(playerID){ 
			if (shortlistedWinner != null){
				//If a winner has already been shortlisted then dont allow further selections
				return;
			} else {
				$("#card-backs").css("display", "none")
				$("#confirm-answer").css("display", "block")
				$(".confirm-button").css("opacity", "0");
				$(".confirm-button").css("transition", "0.3s");
			}

			let answerElementID = "#answer-" + playerID;
			shortlistedWinner = playerID;

			//Add answer card to confirm-answers area 
			
			$(answerElementID).attr("onclick","");
			$(answerElementID).removeClass("answer-not-selected");


			$(answerElementID).children().css("transition", "0.3s");

			$(answerElementID).children().css("transform", "translateY(0px)");
			$(answerElementID).children().css("opacity", "100%");

			setTimeout(() => {
	
				$(answerElementID).children().css("transform", "translateY(-250px)");
				$(answerElementID).children().css("opacity", "0%");

				setTimeout(() => {
					$(".confirm-button").css("opacity", "100%");
	
					$(answerElementID).appendTo("#confirm-answer-cards");

					$(answerElementID).attr("onclick","unpickWinner("+playerID+")");

					$(answerElementID).addClass("mr-1");
					$(answerElementID).children().css("transition", "0.1s");
					$(answerElementID).children().css("opacity", "100%");
					$(answerElementID).children().css("transform", "translateY(200px)");
					if (shortlistedWinner !== null){
							$(".confirm-button").css("display", "block");
							showConfirmButtonLegend();
							showMobileConfirmButton();
					}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedWinner !== null){
							disableWinners(true);
							
							$(".confirm-button").css("display", "block");
							$(".confirm-button").removeClass("btn-disabled");
							$(".confirm-button").addClass("btn-info");
							$(".confirm-button").css("opacity", "100%");

							$(".confirm-button").attr("onclick","confirmWinner()");
							$("#mobile-confirm-button").attr("onclick","confirmWinner()");
						

							
						}
					}, 10);

				}, 200);
			}, 10);

			

		}

		function unpickWinner(playerID){

			let answerElementID = "#answer-" + playerID;
			shortlistedWinner = null;
			
			//Add answer card to confirm-answers area 
			$(answerElementID).attr("onclick","");
			$(answerElementID).addClass("answer-not-selected");

			$(answerElementID).children().css("transition", "0.3s");
			$(answerElementID).children().css("transform", "translateY(0px)");
			$(answerElementID).children().css("opacity", "100%");

			setTimeout(() => {
	
				$(answerElementID).children().css("transform", "translateY(250px)");
				$(answerElementID).children().css("opacity", "0%");
				$(".confirm-button").css("transition", "0.2s");

				$(".confirm-button").css("opacity", "100%");

				setTimeout(() => {	


					$(answerElementID).appendTo("#my-answer-cards");
					
					$(answerElementID).attr("onclick","pickWinner(" + playerID + ")");
					
					$(answerElementID).removeClass("mr-1");
					$(answerElementID).children().css("transition", "0.1s");
					$(answerElementID).children().css("opacity", "100%");
					$(answerElementID).children().css("transform", "translateY(-300px)");
					if (shortlistedWinner === null){
						$("#confirm-answer").css("display", "none");
						showMobileConfirmButton(false);

					}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedWinner === null){
							disableWinners(false);
							$(".confirm-button").addClass("btn-disabled");
							$(".confirm-button").removeClass("btn-info");
							$(".confirm-button").removeAttr("onclick");
							$(".confirm-button").css("opacity", "0%");
							$(".confirm-button").css("display", "none");
							$("#card-backs").css("display", "flex");
							}
					}, 10);
				}, 200);
			}, 10);

		}

		function confirmAnswers() {
			$("#mobile-confirm-button").height("0px");

			if (shortlistedAnswers.length > 2 || shortlistedAnswers.length > $("#question-blanks").html()){
				alert("Too Many Answers")
				return;
			}
			
			$("#card-backs").css("display", "flex");
			$("#confirm-answer").css("display", "none");
			socket.emit("player-confirmed-answers", shortlistedAnswers);

			$("#my-answer-cards").html(`
			<div class="spinner-border m-4" style="float: left;" role="status">
				<span class="sr-only">Loading...</span>
			</div>
			<h1 class="mt-3" style="display:inline-block">Waiting for other players to answer.</h1>
			`)
		}

		function confirmWinner() {
			$("#mobile-confirm-button").height("0px");
			if (shortlistedWinner === null){
				alert("No answer")
				return;
			}
			showFunnyLoader("#game-state-display");
			
			socket.emit("master-confirmed-winner", shortlistedWinner);
			
		}

		
		function disableAnswers(disable){
			//disable all cards
			//re-enable the one's we've already selected
			if(disable===true){
				$(".answer-not-selected").removeAttr("href");
				$(".answer-not-selected").removeAttr("onclick");
				$(".answer-not-selected").children().css("opacity", "25%");
				$(".answer-not-selected").children().css("background-color", "lightgray");
				$(".answer-not-selected").children().removeClass("hover-effect-grow");
			} else {
				$('.answer-not-selected').each(function() {
					let answerID = $(this).attr('id');
					answerID = answerID.replace('answer-','');
					if(answerID.includes("roaster")){
						 answerID = answerID.replace('roaster-','');
						 $(this).attr("onclick", "pickAnswer(" + answerID + "," + "'player-name-roaster')");
					} else{
						$(this).attr("onclick", "pickAnswer(" + answerID + ")");
					}
				});
				$.each($('.answer-not-selected'), function () { 
					
				});
				$(".answer-not-selected").attr("href", "#");
				$(".answer-not-selected").children().css("opacity", "100%");
				$(".answer-not-selected").children().css("background-color", "white");
				$(".answer-not-selected").children().addClass("hover-effect-grow");
			}
		}


		function disableWinners(disable){
			//disable all cards
			//re-enable the one's we've already selected
			if(disable===true){
				$(".answer-not-selected").removeAttr("href");
				$(".answer-not-selected").removeAttr("onclick");
				$(".answer-not-selected").children().css("opacity", "25%");
				$(".answer-not-selected").children().css("background-color", "lightgray");
				$(".answer-not-selected").children().removeClass("hover-effect-grow");
			} else {
				$('.answer-not-selected').each(function() {
					let answerID = $(this).attr('id');
					answerID = answerID.replace('answer-','');
					if(answerID.includes("roaster")){
						 answerID = answerID.replace('roaster-','');
						 $(this).attr("onclick", "pickWinner(" + answerID + "," + "'player-name-roaster')");
					} else{
						$(this).attr("onclick", "pickWinner(" + answerID + ")");
					}
				});
				$.each($('.answer-not-selected'), function () { 
					
				});
				$(".answer-not-selected").attr("href", "#");
				$(".answer-not-selected").children().css("opacity", "100%");
				$(".answer-not-selected").children().css("background-color", "white");
				$(".answer-not-selected").children().addClass("hover-effect-grow");
			}
		}


		function updateLeaderboard(players){
			let render = "";
			let sidebarLeaderboard = "";
			let topbarLeaderboard = "";
			let sidebarRoundMaster = "";
			let topbarRoundMaster = "";

			for(i=0;i<players.length;i++){

				if(players[i].ismaster === 1){
					//topbar round master
					 topbarRoundMaster = `
					<div class="c-header-topbar-name">${players[i].fullname}</div>
					<span class="badge-topbar badge-success d-inline-block mx-2">${players[i].score}</span>
					`;
					//sidebar round master
					 sidebarRoundMaster = `
					${players[i].fullname}
					<span class="badge badge-success">${players[i].score}</span>
					`;
					continue;
				}
				
				//sidebar leaderboard
				sidebarLeaderboard += `
				<li class="c-sidebar-nav-item">
					<a class="c-sidebar-nav-link">
					${players[i].fullname}
					<span class="badge badge-info">${players[i].score}</span>
					</a>
				</li>
				`;
				//topbar leader board
				topbarLeaderboard += `
				<div>
					<div class="c-header-topbar-name-long">${players[i].fullname}</div>
					<span class="badge-topbar badge-info d-inline-block mx-2">${players[i].score}</span>
				</div>
				`;
			}

			$("#sidebar-round-master").html(sidebarRoundMaster);
			$("#topbar-round-master").html(topbarRoundMaster);
			$("#sidebar-leaderboard").html(sidebarLeaderboard);
			$("#topbar-leaderboard").html(topbarLeaderboard);

		}

		function showMobileConfirmButton (show = true) {
			if(show){
				$("#mobile-confirm-button").height("auto");
			} else {
				$("#mobile-confirm-button").height("0px");
			}


		}
		function showConfirmButtonLegend(fullWidth = 180){
			//wait a lil bit
			setTimeout(() => {
				//make button visible
				$(".confirm-button-legend").css("opacity", "100%");
				$(".confirm-button-legend").css("display", "block");
				setTimeout(() => {
					//slide out to calculated width
					$(".confirm-button-legend").css("width", fullWidth);
				}, 100);
			}, 200);
		
			//wait a second
			setTimeout(() => {
				//slide button back in
				$(".confirm-button-legend").css("width", "50px");
			}, 2400);
			//hide button
			setTimeout(() => {
				$(".confirm-button-legend").css("opacity", "0%");
				$(".confirm-button-legend").css("display", "none");
			}, 3000);
		}


		function showFunnyLoader(element){
			$(element).html(`
					<div class="spinner-border m-4" style="float: left;" role="status">
				<span class="sr-only">Loading...</span>
			</div>
			<h1 class="mt-3" style="display:inline-block; position: absolute;">${funnyLoadText()}</h1>
			`);
		}
		function funnyLoadText(){
			const jokes = [
			'Generating witty dialog...',
			'Swapping time and space...',
			'Spinning violently around the y-axis...',
			'Tokenizing real life...',
			'Bending the spoon...',
			'Filtering morale...',
			'Ripping off Cards Against Humanity...',
			'Ripping off Cards Against Humanity...',
			'The bits are breeding',
			'We\'re building the buildings as fast as we can',
			'Please wait while the little elves draw your map',
			'Checking the gravitational constant in your locale...',
			'Go ahead -- hold your breath!',
			'The server is powered by a lemon and two electrodes.',
			'Testing your patience...',
			'Moving satellites into position',
			'Aligning planets...',
			'The bits are flowing slowly today...',
			'The last time I tried this the monkey didn\'t survive. Let\'s hope it works better this time.',
			'My other loading screen is much faster.',
			'Testing on Timmy... We\'re going to need another Timmy.',
			'Reconfoobling energymotron...',
			'Are we there yet?',
			'It\'s not you. It\'s me.',
			'Counting backwards from Infinity',
			'Embiggening Prototypes',
			'Do you come here often?',
			'Warning: Don\'t set yourself on fire.',
			'We\'re baking you a cookie.',
			'Creating time-loop inversion field',
			'Spinning the wheel of fortune...',
			'Loading the enchanted bunny...',
			'Looking for exact change...',
			'I feel like im supposed to be loading something. . .',
			'Adjusting flux capacitor...',
			'Waiting for the sloth to start moving.',
			'I swear I\'m almost done.',
			'Let\'s take a mindfulness minute...',
			'Reminding you to stay hydrated...',
			'Breathing in through the nose... and out through the mouth...',
			'Listening for the sound of one hand clapping...',
			'Putting the icing on the cake. The cake is not a lie...',
			'Cleaning off the cobwebs...',
			'We need more dilithium crystals',
			'Looking for the internet',
			'Downloading the internet',
			'Connecting Neurotoxin Storage Tank...',
			'Granting wishes...',
			'Spinning the hamster…',
			'Convincing AI not to turn evil..',
			'Computing the secret to life, the universe, and everything.',
			'Saving water by showering together...',
			'Constructing additional pylons...',
			'Walking the dog...',
			'Dividing by zero...',
			'Cracking military-grade encryption...',
			'Simulating traveling salesman...',
			'Entangling superstrings...',
			'Twiddling thumbs...',
			'Searching for plot device...',
			'Laughing at your pictures-i mean, loading...',
			'Sending your data to the Govern-i -i mean, our servers.',
			'Looking for sense of humour, please hold on.',
			'Please wait while the intern refills my coffee.',
			'Making progress...',
			'Please wait while I convert this bug to a feature...',
			'Winter is coming...',
			'Installing dependencies...',
			'Scrolling through Facebook...',
			'Scrolling through Instagram...',
			'Looking at memes...',
			'Making some memes...',
			'Finding someone to hold my beer...',
			'Just finishing off the website...',
			'Let\'s hope it\'s worth the wait',
			'Ordering a pizza...',
			'Updating dependencies...',
			'Please wait... Consulting the manual...',
			'Loading funny message...',
			'What is the difference btwn a hippo and a zippo? One is really heavy, the other is a little lighter',
			'Please wait, while we purge the Decepticons for you. Yes, You can thanks us later!',
			'Mining bitcoins...',
			'Downloading more RAM..',
			'Initializing the initializer...',
			'Optimizing the optimizer...',
			'Shovelling coal into the server...',
			'Building a wall...',
			'Everything in this universe is either a potato or not a potato',
			'Updating Updater...',
			'Downloading Downloader...',
			'Debugging Debugger...',
			'Reading the Terms and Conditions for you.',
			'Deleting all your hidden porn...',
			'Running with scissors...',
			'Working, working...',
			'Patience! This is difficult, you know...',
			'Making a heart-warming bowl of spaghetti bolognese...',
			'Toasting the bread...',
			'Catching em\' all',
			]
			return jokes[Math.floor(Math.random() * jokes.length)];
		}	


</script>





@endsection


