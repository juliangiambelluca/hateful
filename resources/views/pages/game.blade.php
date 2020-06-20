@extends('layouts.game')

@section('title')
play hateful
@endsection

@section('content')

<div class="col-md-9 col-lg-10" style="height: 90vh">

<div id="game-state-display">



</div>

</div>


	<script src="https://cdn.jsdelivr.net/npm/socket.io-client@2/dist/socket.io.js"></script>
   
<!-- <script src="{{ asset('js/socket.io.js') }}"></script> -->
<script>
	//on page load
	$(function () {
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




	});

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

	//Game Functions

	function pickQuestion(questionID){

		socket.emit("picked-question", questionID);

	}
</script>





@endsection


