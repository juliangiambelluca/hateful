
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="description" content="">
  <meta name="author" content="">
  <meta name="generator" content="">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Game Lobby</title>


  <link href="{{ URL::to('css/app.css') }}" rel="stylesheet">

  <link href="{{ URL::to('css/game.css') }}" rel="stylesheet">

  <script src="https://kit.fontawesome.com/d5ff43701b.js" crossorigin="anonymous"></script>




</head>


<body>
  <nav class="navbar navbar-dark bg-dark d-block p-0 ">

    <div class="row d-sm-flex pt-1 pl-2" style="width: 100%; ">
	<div class="col-0 col-md-1 cold-lg-2"></div>
      <div class="col-12 col-md-10 col-lg-8 text-white " ><h4 class="m-2 ml-3" style="font-weight: 800"> hateful. [beta]</h4></div>  
	  <div class="col-0 col-md-1 cold-lg-2"></div>
    </nav>



    <div class="content-fluid" id="content-screen">
	  <div class="row" style="width: 100%">
	  <div class="col-0 col-md-1 cold-lg-2"></div>
        <main role="main" class="col-12 col-md-10 col-lg-8">
          <div id="game-table">
            <div class="row">
              <div class="col-md-6">
                <h2 class="m-4">Lobby.</h2>
                <div class="m-4">
                  <div class="row">
                    <div class="col-md-6">
                      <h5>game link:</h5>
                      <h6>hateful.io/{{ $response["gameHash"] }}</h6>
                    </div>
                    <div class="col-md-6">	
                      <h5>game password:</h5>
                      <h6>{{$response["password"]}}</h6>
                    </div>
                  </div>


                </div>
				

				<div class="ml-4" id="start-game">
				
				</div>

     
              
			  
			  </div>
              <div class="col-md-6">
              </div>

            </div>
          </div>      
          <!-- End Game table -->


		<div id="name-cards-container" class="name-cards-container">
            <div class="row m-3">
              <div class="col-12 p-0">
                <div id="name-cards" class="x-scrolling-wrapper">
                </div>  
              </div>  
            </div>  
          </div>



		</main>
		




		<div class="col-0 col-md-1 cold-lg-2"></div>

      </div>
    </div>

<form  style="display: none" id="new-host-inputs" method="POST" action="">
{{ csrf_field() }}
<input type="hidden" id="new-host" name="new-host" value="{{ session('userID') }}">
</form>

    <script src="{{ URL::to('js/app.js') }}"></script>

    <!-- <script src="{{ asset('socket.io/socket.io.js') }}"></script> -->
	<script src="https://cdn.jsdelivr.net/npm/socket.io-client@2/dist/socket.io.js"></script>

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
		  
		  socket.on('refresh', function(){
			setTimeout(() => {
				location.reload();
			}, 500);
		  });

		  //Receive players in room
          socket.on('playersInLobby', function (players) {
           //Receiving array of names.
            displayNameCards(players);
          });

		  socket.on('enableGameStart', function () {
			@if(session('isHost') === true)
				$("#start-game").html(`
				<button onclick="startGame()" id="start-game" class="btn btn-lg mt-2 py-3 btn-success" 
				style="min-width: 50%; max-width: 83%;">
				Start Game.</button>   
				`);
			@else
				$("#start-game").html(`
				<div class="alert alert-primary alert-dismissible fade show" role="alert">
					<strong>Waiting for host to start game</strong>. Tell them to hurry up.
					<button type="button" class="close" data-dismiss="alert" aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				`);
			@endif

		  });

		  socket.on('disableGameStart', function () {
			@if(session('isHost') === true)
				$("#start-game").html(`
				<div class="alert alert-dark alert-dismissible fade show" role="alert">
					<strong>Waiting for at least 3 players</strong>. You won't be able to start the game until then.
					<button type="button" class="close" data-dismiss="alert" aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				`);
			@else
			$("#start-game").html(`
				<div class="alert alert-dark alert-dismissible fade show" role="alert">
					<strong>Waiting for at least 3 players</strong>. Hope you have friends.
					<button type="button" class="close" data-dismiss="alert" aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				`);
			@endif
		  });

		  
        function displayNameCards(players){
			let render = "";

			for(i=0;i<players.length;i++){
				// if(!(document.getElementById("player-" + id))){
				nameCardsTemplate = `
				<div id="player-${players[i].id}" style="float: left" class="card game-card answer-card  ">
				<div class="card-body game-card-body">
				<div class="card-text-answer text-capitalize">
				${players[i].fullname}.
				</div>
				<div class="hateful-watermark">
				  hateful.io
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
		

		function startGame(){
			socket.emit("start-game");
			$("#start-game").attr("onclick","console.log('Second Click detected.')");
			$("#content-screen").html(`
			<div class="m-3">
			<span class="spinner-border m-4" style="display:inline-block" role="status">
				<span class="sr-only">Loading...</span>
			</span>
			<span class="h1 mt-3" style="display:inline-block; position: absolute" >Starting Game... </span>

			</div>
			`);
		}

      </script>


    </body>
</html>






