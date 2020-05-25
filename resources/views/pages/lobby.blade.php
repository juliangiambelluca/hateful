
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


  <link href="{{ URL::to('css/bootstrap.css') }}" rel="stylesheet">

  <link href="{{ URL::to('css/game.css') }}" rel="stylesheet">

  <script src="https://kit.fontawesome.com/d5ff43701b.js" crossorigin="anonymous"></script>




</head>


<body>
  <nav class="navbar navbar-dark bg-dark d-block p-0 shadow">

    <div class="row d-sm-flex pt-1 pl-2" style="width: 100%; ">

      <div class="col-12  col-md-4  col-lg-3  text-white " ><h4 class="m-2" style="font-weight: 800"> hateful. [beta]</h4></div>  

    </nav>



    <div class="content-fluid">
      <div class="row" style="width: 100%">
        <main role="main" class="col-md-9 col-lg-10 ml-5">

          <div id="game-table">
            <div class="row">
              <div class="col-md-6">
                <h2 class="m-4">Lobby</h2>
                <div class="m-4">
                  <div class="row">
                    <div class="col-md-6">
                      <h5>game link:</h5>
                      <h6>hateful/{{$response["gameHash"]}}</h6>
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
			  <div class="row">
	<!-- DEBUGGING RESPONSE -->
	<div id="debug" style="overflow-wrap: anywhere; "></div>
</div>
              </div>

            </div>
          </div>      
          <!-- End Game table -->

          <div id="name-cards-container">
            <div class="row m-3">
              <div class="col-12 p-0">
                <div id="name-cards" class="x-scrolling-wrapper">
                </div>  
              </div>  
            </div>  
          </div>

        </main>
      </div>
    </div>
<!-- 
<form  style="display: none" id="new-host-inputs" method="POST" action="">
{{ csrf_field() }}
<input type="hidden" id="new-host" name="new-host" value="{{ session('userID') }}">
</form> -->

    <script src="{{ URL::to('js/jquery.js') }}"></script>

    <script src="{{ URL::to('js/bootstrap.js') }}"></script>

    <script src="{{ URL::to('js/bootstrap.bundle.js') }}"></script>

    <script src="{{ asset('js/socket.io.js') }}"></script>


    <script>
        //on page load
        $(function () {
          const socket = io('http://127.0.0.1:3000');
          //User inputs in session have already been sanitised. @json laravel blade directive not working for me.
          const clientSession = '{!! json_encode(session()->all()) !!}';
          //join this room
          socket.emit('join', clientSession );
          // user is connected
          socket.on('user_join', function (data) {
           console.log(data);
		  });

		  socket.on('newHost', function (newHost = "default") {
			if(newHost === {{session('userID')}}){
				updateHost();
			}
			location.reload();
		  });


		  //Receive players in room
          socket.on('playersInLobby', function (players) {
           //Receiving array of names.
            displayNameCards(players);
          });

		  socket.on('enableGameStart', function () {
			@if(session('isMaster') === true)
				$("#start-game").html(`
				<button id="start-game" class="btn btn-lg mt-4 py-3 btn-success" 
				style="min-width: 50%; max-width: 83%;" onclick="startGame()">
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
			@if(session('isMaster') === true)
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
		//   socket.on('playerDisconnect', function (playerID) {
		// 	deleteNameCard(playerID);
        //   });

		});
		


function updateHost(){
	window.location.href = "http://hateful/uh/{{ session('userID') }}";
}

	
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
		
		// function deleteNameCard (playerID){
        // //   $("#player-"+playerID).remove();
        // }



      </script>


    </body>
</html>






