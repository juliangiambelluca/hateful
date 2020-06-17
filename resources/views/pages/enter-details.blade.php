
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="">

    <title>New Game</title>


    <!-- Bootstrap core CSS -->
    <link href="{{ URL::to('css/app.css') }}" rel="stylesheet">
    <script src="{{ URL::to('js/app.js') }}"></script>

    <!-- Custom styles for this template -->
    <link href="{{ URL::to('css/signin.css') }}" rel="stylesheet">

<style>
    html,
  body {
    height: 100%;
  }

  body {
    display: -ms-flexbox;
    display: -webkit-box;
    display: flex;
    -ms-flex-align: center;
    -ms-flex-pack: center;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;
    padding-top: 40px;
    padding-bottom: 40px;
    background-color: #f5f5f5;
  }

  .form-signin {
    width: 100%;
    height: 100%;
    max-width: 330px;
    padding: 15px;
    margin: 0 auto;
  }
  .form-signin .checkbox {
    font-weight: 400;
  }
  .form-signin .form-control {
    position: relative;
    box-sizing: border-box;
    height: auto;
    padding: 10px;
    font-size: 16px;
  }
  .form-signin .form-control:focus {
    z-index: 2;
  }
 
</style>    

</head>



  <body class="text-center">
    <form id="form-inputs" class="form-signin" method="POST" action="{{ route('join-game') }}" >
    {{ csrf_field() }}
    <h1 class="mb-1" style="font-weight: 800">hateful. [beta]</h1>
	<!-- Wrong inputs alert to be displayed by javascript -->
	<div id="input-error-alert" class="row" style="display:none">
		<div class="col-12">
			<div class="alert border-left-danger alert-danger fade show" role="alert">
				<strong>Oops!</strong><br>
				<span id="input-errors"></span>
			</button>
			</div>
		</div>
	</div>
<!-- Padding row -->
<div class="row">
	<!-- DEBUGGING RESPONSE -->
	<div id="debug" style="overflow-wrap: anywhere; "></div>
</div>
        <!-- DYNAMIC HEADER & TEXT -->
        @if($response["alreadyPlaying"] === true)
        <hr class="m-5">
        <small>You are already playing another game.<br><b class="text-danger">You will be signed out</b> of that one if you join or create a new game </small>     
        <br>
        <br>
        <a class="btn btn-md btn-secondary btn-block" href="{{ route('lobby-or-game') }}">Return to current game</a>        
        <hr class="m-5">
        @endif
        @if($response["gameExists"] === true)
          <h4 class="h4 mb-3 mt-5 font-weight-normal">
            Join Game
          </h4>
        @elseif($response["newGame"] === false)
          <h5 class="h5 mb-3 mt-5 font-weight-normal">
            This Game ID does not exist. <br>
            Why not start a new game?
          </h5>
        @else
        <h5 class="h5 mb-3 mt-5 font-weight-normal">
            Let's get started.
          </h5>
        @endif

        <!-- DYNAMIC PASSWORD FIELD IF NECESSARY -->
        <div class="form-group" style="text-align: left !important">
        @if($response["gameExists"] === true)
        <br>
          <label for="input-password" class="ml-1" >Game Password.</label>
          <input type="input" id="input-password" name="input-password" class="form-control" placeholder="6 Characters." required>
       @endif

      <br>
      
      <!-- Input name, Hidden Game ID & CSRF -->
      <label for="input-name" class="ml-1">Your full name.</label>
      <input type="input" name="input-name" id="input-name" class="form-control" placeholder="Up to 32 Characters." required autofocus>
	  <input type="hidden" id="game-id" name="game-hash" value="{{ $response['gameHash'] ?? '' }}">
    </div>


      <!-- Disclaimers -->
      <div class="checkbox mb-3">
        <br>
        <small>
        <a href="#" onclick="document.getElementById('more-disclaimers').style.display='block'"><b>You must be 18 or older to play this game.</b><br> By continuing you accept the Privacy Policy and T&C's. Read More+</a>
        </small>
        <small id="more-disclaimers" style="display: none;">
        <br>
          <b>This game is politically incorrect. DO NOT PLAY THIS GAME if you are easily offended.</b>
          <br><br>
          Your details are deleted when the game ends.
          <br><br>
          Please wash your hands with soap and water for 20 seconds before playing this game.
          <br><br>
          Cards you make may be stored anonymously and offered to other players.
          <br><br>
          If someone in your game writes a card with your name on it, 
          we will try to identify it and delete the name from the card. 
          We'll replace your name with a placeholder so we can make more Roaster Cards.
          <br><br>
          We may review user-created content.
          <br><br>
          The cards you make are not stored in the database unless it wins the round. We don't wanna store crap.
          <br><br>
          We are not responsible for whatever crap you put in those cards.
          <br><br>
          Please do not use cards as a way to communicate illegal ideas or organise crime.
          <br><br>
          
        </small>
      </div>
      

      <!-- DYNAMIC BUTTON CREATOR -->
        <?PHP
        if($response["gameExists"] === true){
          $buttonText = "Join Game";
          $buttonClass = "btn btn-lg btn-primary btn-block";
          $buttonAction = "joinGame()";
        } else {
          $buttonText = "Create New Game";
          $buttonClass = "btn btn-lg btn-success btn-block";
          $buttonAction = "createGame()";
        }
        if($response["alreadyPlaying"]){
          $buttonText = "Quit & " . $buttonText;
          $buttonClass = "btn btn-lg btn-warning btn-block";
        }
        echo "<button class='" . $buttonClass . "' onclick='" . $buttonAction . "'>" . $buttonText . "</button>";
        ?>

      
      <p class="mt-5 mb-3 text-muted">&copy; Julian Giambelluca</p>
    </form>
  </body>
</html>


<script>

function joinGame(){
  event.preventDefault()

	//Get Inputs
	let setInputs = {};
	//Put all inputs into object
  	$.each($('#form-inputs').serializeArray(), function(i, field) {
      setInputs[field.name] = field.value;
	});
  
	//Send to server
  	const sendPackage= () => {
      	return new Promise((resolve, reject) => {
          	$.ajax({
              
				url: "{{ route('join-game') }}",
        method: 'POST',
				dataType: "JSON",
				data: setInputs,
				success: function (response) {
				$( "#debug" ).html("Success! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
					resolve(response);
				},
				error: function (response) {
				 $( "#debug" ).html("Error! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
					reject(response);
				},
         	});
        });
	}
	sendPackage().then(response => {
    
			$("#input-error-alert").fadeOut(50);

		switch(response.result) {
		case "can-access":
			window.location.href = "{{ route('lobby-or-game') }}";
			break;
		case "password":
      //Password incorrect
			$("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`Password is invalid. You've got ${ 5 - response.failedLoginAttempts } attempt(s) left before you get locked out for 2 minutes.`);
      break;
		case "game-not-found":
      //Game no longer exists
      $("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`We can't find that game. Make sure link is correct and that game hasn't ended.`);
      break;
    case "banned":
      //Suspicious behaviour
      location.reload();
			break;
    default:  
     //Unexpected response
      $("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`Something went wrong. Please refresh the page.`);
		}
	})
	.catch(response => {
    //If data validation fails, Laravel responds with status code 422 & Error messages in JSON.
    if(response.status===404) {
      location.reload();
		}
		if(response.status===422) {
			let errorMsgsObj = response.responseJSON.errors;

			//Fade in alert container 
			$("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html("");
			//Extract each error message and append to input-errors as text
			for (const property in errorMsgsObj) {
				$( "#input-errors" ).append( errorMsgsObj[property] + "<br>");
			}
		} else {
			//Something else went wrong
			$("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`Something went wrong. Please refresh the page and try again. [Details: Exception Caught. HTTP status: ${response.status}]`);
		}
	});
}



function createGame(){
  event.preventDefault()

	//Get Inputs
	let setInputs = {};
	//Put all inputs into object
  	$.each($('#form-inputs').serializeArray(), function(i, field) {
      setInputs[field.name] = field.value;
	});
  
	//Send to server
  	const sendPackage= () => {
      	return new Promise((resolve, reject) => {
          	$.ajax({
				url: "{{ route('create-game') }}",
        method: 'POST',
				dataType: "JSON",
				data: setInputs,
				success: function (response) {
				$( "#debug" ).html("Success! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
					resolve(response);
				},
				error: function (response) {
				 $( "#debug" ).html("Error! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
					reject(response);
				},
         	});
        });
	}
	sendPackage().then(response => {

		switch(response.result) {
		case "lobby":
			window.location.href = "{{ route('lobby') }}";
			break;
    case "input-error":
      $("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html("Please enter your full name up to 32 characters.");
      break;
    default:  
     //Unexpected response
      $("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`Something went wrong. Please refresh the page.`);
		}
	})
	.catch(response => {
    if(response.status===404) {
      location.reload();
		}
    //If data validation fails, Laravel responds with status code 422 & Error messages in JSON.
		if(response.status===422) {
			let errorMsgsObj = response.responseJSON.errors

			//Fade in alert container 
			$("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html("");
			//Extract each error message and append to input-errors as text
			for (const property in errorMsgsObj) {
				$( "#input-errors" ).append( errorMsgsObj[property] + "<br>");
			}
		} else {
			//Something else went wrong
			$("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`Something went wrong. Please refresh the page and try again. [Details: Exception Caught. HTTP status: ${response.status}]`);
		}
	});
}


</script>