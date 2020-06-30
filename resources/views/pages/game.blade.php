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


<script src="https://cdn.jsdelivr.net/npm/socket.io-client@2/dist/socket.io.js"></script>

<!-- <script src="{{ asset('js/socket.io.js') }}"></script> -->
<script>



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
				setTimeout(() => {
				alert("The host disconnected. You are the new host.");
				location.reload();
				}, 1000);
			} else {
				alert("The host disconnected. " + newHost[1] + " is the new host.");
			}
		});
		socket.on('newMaster', function (newMaster) {
			if(newMaster[0] == userID){
				setTimeout(() => {
				alert("The Round Master disconnected. You are the new Round Master.");
				location.reload();
				}, 1000);
			} else {
				alert("The Round Master disconnected. " + newMaster[1] + " is the Round Master host.");
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

		//Receive players in room
		socket.on('playersInLobby', function (players) {
			//Receiving array of names.
			displayNameCards(players);
		});

		//Game State logic

		//query state on page load.
		socket.emit('what-is-my-state');

		//Receive players in room
		socket.on('load-new-state', function (displayData) {
			$("#game-state-display").css("opacity", "0");
			$("#game-state-display").css("filter", "blur(100px)");

			$("#game-state-display").html(displayData);

			setTimeout(() => {
				$("#game-state-display").css("opacity", "1");
				$("#game-state-display").css("filter", "blur(0px)");
			}, 50);
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

		socket.on('get-your-answers', () => {
			console.log("Get Your Answers!")
			socket.emit('what-is-my-state');
		});

		socket.on('update-your-state', () => {
			console.log("Updating state...")
			socket.emit('what-is-my-state');
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

		
		socket.on('start-timer', (timerTimeLeft) => {		
			socket.timerTimeLeft = timerTimeLeft;

			socket.timerInterval = setInterval(() => {
				socket.timerTimeLeft -= 1;
				$("#topbar-timer").html(secsToMMSS(socket.timerTimeLeft));
				$("#sidebar-timer").html(secsToMMSS(socket.timerTimeLeft));
			}, 1000);	

			socket.gameTimer = setTimeout((socket) => {
				clearInterval(socket.timerInterval);
				
			}, (socket.timerTimeLeft * 1000), socket);
		});

		socket.on('times-up', () => {			
			try {
				clearInterval(socket.timerInterval);
				clearTimeout(socket.gameTimer);
				
				$("#topbar-timer").html("00:00 <span class='badge badge-danger'>Time's Up!</span>");
				$("#sidebar-timer").html("00:00 <span class='badge badge-danger'>Time's Up!</span>");
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
		}


		let shortlistedAnswers = [];
		function pickAnswer(answerID, isRoaster = null, isShortlisted = null){ 
			if (shortlistedAnswers.length == $("#question-blanks").html()){
				return;
			}
			if (shortlistedAnswers.length === 0){
				$("#card-backs").css("display", "none")
				$("#confirm-answer").css("display", "block")
				$("#confirm-button").css("opacity", "0");
				$("#confirm-button").css("transition", "0.3s");
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
					$("#confirm-button").css("opacity", "100%");
	
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
							$("#confirm-button").css("display", "block");
						}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedAnswers.length == $("#question-blanks").html()){
							disableAnswers(true);
							
							$("#confirm-button").css("display", "block");
							$("#confirm-button").removeClass("btn-disabled");
							$("#confirm-button").addClass("btn-success");
							$("#confirm-button").css("opacity", "100%");

							if(isShortlisted === "shortlisted"){
								$("#confirm-button").attr("onclick","confirmWinner()");
							} else {
								$("#confirm-button").attr("onclick","confirmAnswers()");
							}
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
				$("#confirm-button").css("transition", "0.2s");

				$("#confirm-button").css("opacity", "100%");

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
							$("#confirm-button").css("display", "none");
						}
					if (shortlistedAnswers.length === 0){
						$("#confirm-answer").css("display", "none");
					}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedAnswers.length <= $("#question-blanks").html()){
							disableAnswers(false);
							$("#confirm-button").addClass("btn-disabled");
							$("#confirm-button").removeClass("btn-success");
							$("#confirm-button").removeAttr("onclick");
							$("#confirm-button").css("opacity", "0%");
							$("#confirm-button").css("display", "none");
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
				$("#confirm-button").css("opacity", "0");
				$("#confirm-button").css("transition", "0.3s");
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
					$("#confirm-button").css("opacity", "100%");
	
					$(answerElementID).appendTo("#confirm-answer-cards");

					$(answerElementID).attr("onclick","unpickWinner("+playerID+")");

					$(answerElementID).addClass("mr-1");
					$(answerElementID).children().css("transition", "0.1s");
					$(answerElementID).children().css("opacity", "100%");
					$(answerElementID).children().css("transform", "translateY(200px)");
					if (shortlistedWinner !== null){
							$("#confirm-button").css("display", "block");
					}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedWinner !== null){
							disableAnswers(true);
							
							$("#confirm-button").css("display", "block");
							$("#confirm-button").removeClass("btn-disabled");
							$("#confirm-button").addClass("btn-success");
							$("#confirm-button").css("opacity", "100%");

							$("#confirm-button").attr("onclick","confirmWinner()");
							
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
				$("#confirm-button").css("transition", "0.2s");

				$("#confirm-button").css("opacity", "100%");

				setTimeout(() => {	


					$(answerElementID).appendTo("#my-answer-cards");
					
					$(answerElementID).attr("onclick","pickWinner(" + playerID + ")");
					
					$(answerElementID).removeClass("mr-1");
					$(answerElementID).children().css("transition", "0.1s");
					$(answerElementID).children().css("opacity", "100%");
					$(answerElementID).children().css("transform", "translateY(-300px)");
					if (shortlistedWinner === null){
						$("#confirm-answer").css("display", "none");
					}
					setTimeout(() => {
						$(answerElementID).children().css("transform", "translateY(0px)");
						$(answerElementID).children().css("transform", "");
						if (shortlistedWinner === null){
							disableAnswers(false);
							$("#confirm-button").addClass("btn-disabled");
							$("#confirm-button").removeClass("btn-success");
							$("#confirm-button").removeAttr("onclick");
							$("#confirm-button").css("opacity", "0%");
							$("#confirm-button").css("display", "none");
							$("#card-backs").css("display", "flex");
							}
					}, 10);
				}, 200);
			}, 10);

		}

		function confirmAnswers() {
			if (shortlistedAnswers.length > 2 || shortlistedAnswers.length > $("#question-blanks").html()){
				alert("Too Many Answers")
				return;
			}
			
			$("#card-backs").css("display", "flex");
			$("#confirm-answer").css("display", "none");
			socket.emit("player-confirmed-answers", shortlistedAnswers);

			$("#card-backs").html(`
			<div class="spinner-border m-4" style="float: left;" role="status">
				<span class="sr-only">Loading...</span>
			</div>
			<h1 class="mt-3" style="display:inline-block" >Waiting for players to answer.</h1>
				

			`)
		}

		function confirmWinner() {
			if (shortlistedWinner === null){
				alert("No answer")
				return;
			}
			
			$("#card-backs").css("display", "flex");
			$("#confirm-answer").css("display", "none");
			socket.emit("master-confirmed-winner", shortlistedWinner);

			$("#card-backs").html(`
					<div class="spinner-border m-4" style="float: left;" role="status">
				<span class="sr-only">Loading...</span>
			</div>
			<h1 class="mt-3" style="display:inline-block">Getting results ready...</h1>
			`)
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

</script>





@endsection


