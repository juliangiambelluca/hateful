<!DOCTYPE html>
<!--
* CoreUI - Free Bootstrap Admin Template
* @version v3.2.0
* @link https://coreui.io
* Copyright (c) 2020 creativeLabs Łukasz Holeczek
* Licensed under MIT (https://coreui.io/license)
-->
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="">

    <title>Play hateful.io</title>

    <style>
      html, body {
        height: auto!important;
      }
    </style>
    <!-- Bootstrap core CSS -->
    <link href="{{ URL::to('css/app.css') }}" rel="stylesheet">
    <script src="{{ URL::to('js/app.js') }}"></script>

    <!-- Custom styles for this template -->
    <!-- <link href="{{ URL::to('css/signin.css') }}" rel="stylesheet"> -->

    <script src="https://kit.fontawesome.com/d5ff43701b.js" crossorigin="anonymous"></script>

    
    <meta name="msapplication-TileColor" content="#ffffff">
    <meta name="theme-color" content="#ffffff">
   
  </head>
  <body class="c-app flex-row align-items-center">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8">

        <h2 class="pb-2 pl-4" style="font-weight: 800">hateful.io [beta]</h2>
            <!-- Wrong inputs alert to be displayed by javascript -->
            <!-- <div id="input-error-alert" class="row" style="display:none">
              <div class="col-12">
                <div class="alert border-left-danger alert-danger fade show" role="alert">
                  <strong>Oops!</strong><br>
                  <span id="input-errors"></span>
                </button>
                </div>
              </div>
            </div> -->
            <!-- Debug response -->
            <!-- <div id="debug" style="overflow-wrap: anywhere; "></div> -->

          <div class="card-group">
          @if($response["alreadyPlaying"] === true)
          <div class="card text-white bg-primary py-5 d-md-down" style="">
              <div class="card-body text-center">
                <div>
                  
                  <h2>Ongoing Game</h2>
                  <p>You are already playing another game.<br><b>You will be signed out</b> of that one if you join or create a new game.</p>
                  <a class="btn btn-lg btn-outline-light mt-3" autofocus href="{{ route('lobby-or-game') }}">Return to current game</a>
                  <!-- else
                  <h2>Sign up</h2>
                  <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                  <button class="btn btn-lg btn-outline-light mt-3" type="button">Register Now!</button> -->
                 
                </div>
              </div>
            </div>
            @endif
            <div class="card p-4">
              <form id="form-inputs"  method="POST" action="{{ route('join-game') }}" >
               {{ csrf_field() }}

              <div class="card-body">
                @if($response["gameExists"] === true)
                  <h1>Join Game</h1>
                  <p class="text-muted">Enter the password and your full name</p>
                @elseif($response["newGame"] === false)
                  <h1>New Game</h1>
                  <p class="text-muted">The game link is invalid. Just enter your name to start a new game.</p>
                @else
                  <h1>Let's get started</h1>
                  <p class="text-muted">Just enter your name to start a new game.</p>
                @endif

                <!-- Input name, Hidden Game ID -->
                <input type="hidden" id="game-id" name="game-hash" value="{{ $response['gameHash'] ?? '' }}">

                <div id="was-validated">
                  <div class="form-group mb-4">
                    <label class="form-col-form-label" for="input-name">Full Name</label>
                    <input onfocusout='
                    $("#input-name").removeClass("is-invalid");
                    $("#input-name").removeClass("is-valid");
                    $("#input-name-invalid-feedback").removeClass("d-block");
                    $("#input-name-invalid-feedback").addClass("d-none");
                    '
                    class="form-control" name="input-name" id="input-name" placeholder="32 Max. Characters" required autofocus type="text">
                    <div class="invalid-feedback" id="input-name-invalid-feedback">Please provide a valid informations.</div>
                  </div>
                  @if($response["gameExists"] === true)
                    <div class="form-group mb-4">
                      <label class="form-col-form-label" for="input-password">Game Password</label>
                      <input onfocusout='
                    $("#input-password").removeClass("is-invalid");
                    $("#input-password").removeClass("is-valid");
                    $("#input-password-invalid-feedback").removeClass("d-block");
                    $("#input-password-invalid-feedback").addClass("d-none");
                    '
                    class="form-control" id="input-password" name="input-password" placeholder="6 Characters" required>
                      <div class="invalid-feedback" id="input-password-invalid-feedback">Please provide a valid informations.</div>
                    </div>
                  @endif
                </div>


                <div class="row">
                  <div class="col-12">
                      <!-- DYNAMIC BUTTON CREATOR -->
                      <?PHP
                      if($response["gameExists"] === true){
                        $buttonText = "Join Game";
                        $buttonClass = "btn-lg btn-primary";
                        $buttonAction = "joinGame()";
                      } else {
                        $buttonText = "Create Game";
                        $buttonClass = "btn-lg btn-success";
                        $buttonAction = "createGame()";
                      }
                      if($response["alreadyPlaying"]){
                        $buttonText = "Quit & " . $buttonText;
                        $buttonClass = "btn-md btn-warning";
                      }
                      echo "<button class='btn  px-3 " . $buttonClass . "' onclick='" . $buttonAction . "'>" . $buttonText . "</button>";
                      ?>

                  </div>
                  <!-- <div class="col-6 text-right">
                    <button class="btn btn-link px-0" type="button">Forgot password?</button>
                  </div> -->
                </div>
              </div>
              </form>
            </div>
            @if($response["alreadyPlaying"] === false)
          <div class="card text-white bg-primary py-5 d-md-down-none" style="width:44%">
              <div class="card-body text-center">
                <div>
                  
                  <h2>Roaster Cards</h2>
                  <p>Whats the name of <u>John's</u> sex tape?<br>
                  Enter your name to get custom cards aimed at you and your friends.</p>
                  <!-- else
                  <h2>Sign up</h2>
                  <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                  <button class="btn btn-lg btn-outline-light mt-3" type="button">Register Now!</button> -->
                 
                </div>
              </div>
            </div>
            @endif
          </div>
            <!-- Disclaimers -->
          <div class="ml-4 pt-2 pb-5">
            <p>
              <b>You must be 18 or older to play this game.</b><br> By continuing you accept the Privacy Policy and T&C's.
            </p>
            <div id="disclaimers" data-children=".item">
              <div class="item"><a data-toggle="collapse" id="readmore" onclick="
                if( $('#readmore').html() == 'Read More +'){
                  $('#readmore').html('Show Less ^');
                } else {$('#readmore').html('Read More +');
                }
                "data-parent="#disclaimers" href="#more-disclaimers" aria-expanded="true" aria-controls="more-disclaimers" class="">Read More +</a>
                
                <div class="collapse" id="more-disclaimers" role="tabpanel" style="">
                <ul class="mb-3 pl-0">
                  <li><b>This game is politically incorrect. DO NOT PLAY THIS GAME if you are easily offended.</b></li>
                  <li>
                  Your details are deleted when the game ends.
                  </li>
                  <li>
                  Please wash your hands with soap and water for 20 seconds before playing this game.
                  </li>
                  <li>
                  Cards you make may be stored anonymously and offered to other players.
                  </li>
                  <li>
                  If someone in your game writes a card with your name on it, 
                  we will try to identify it and delete the name from the card. 
                  We'll replace your name with a placeholder so we can make more Roaster Cards.
                  </li>
                  <li>
                  We may review user-created content.
                  </li>
                  <li>
                  The cards you make are not stored in the database unless it wins the round. We don't wanna store crap.
                  </li>
                  <li>
                  We are not responsible for whatever crap you put in those cards.
                  </li>
                  <li>
                  Please do not use cards as a way to communicate illegal ideas or organise crime.
                  </li>
                  </p>
                </div>
              </div>
            </div>
            </div>
       
        </div>
      </div>
    </div>
    <!-- CoreUI and necessary plugins-->
    <!-- <script src="vendors/@coreui/coreui/js/coreui.bundle.min.js"></script> -->
    <!--[if IE]><!-->
    <!-- <script src="vendors/@coreui/icons/js/svgxuse.min.js"></script> -->
    <!--<![endif] -->

  </body>

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
				// $( "#debug" ).html("Success! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
					resolve(response);
				},
				error: function (response) {
				//  $( "#debug" ).html("Error! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
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
			let passwordMessage = `Password incorrect. You've got ${ 5 - response.failedLoginAttempts } attempt(s) left before you get locked out for 2 minutes.`;
      
      // $("#was-validated").addClass("was-validated");
      
      //Name must be correct if the password was checked.
      $("#input-name").removeClass("is-invalid");
      $("#input-name").addClass("is-valid");

      $("#input-password").removeClass("is-valid");
      $("#input-password").addClass("is-invalid");
      $("#input-password-invalid-feedback").html(passwordMessage);
      $("#input-password-invalid-feedback").addClass("d-block");

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
      // $("#was-validated").addClass("was-validated");
      
      $("#input-name").removeClass("is-invalid");
      $("#input-name").addClass("is-valid");
      $("#input-name-invalid-feedback").removeClass("d-block");
      $("#input-name-invalid-feedback").addClass("d-none");
      $("#input-password").removeClass("is-invalid");
      $("#input-password-invalid-feedback").removeClass("d-block");
      $("#input-password-invalid-feedback").addClass("d-none");

			let errorMsgsObj = response.responseJSON.errors;
        let cleanProperty;
			for (const property in errorMsgsObj) {
        cleanProperty =  JSON.stringify(property).replace(/['"]+/g, '');
        $(`#${cleanProperty}`).removeClass("is-valid");
        $(`#${cleanProperty}`).addClass("is-invalid");
        $(`#${cleanProperty}-invalid-feedback`).html(errorMsgsObj[property]);
        $(`#${cleanProperty}-invalid-feedback`).addClass("d-block");
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
				// $( "#debug" ).html("Success! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
					resolve(response);
				},
				error: function (response) {
				//  $( "#debug" ).html("Error! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
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
			// let errorMsgsObj = response.responseJSON.errors

			// //Fade in alert container 
			// $("#input-error-alert").fadeIn(450);
			// $( "#input-errors" ).html("");
			// //Extract each error message and append to input-errors as text
			// for (const property in errorMsgsObj) {
			// 	$( "#input-errors" ).append( errorMsgsObj[property] + "<br>");
			// }
      // $("#was-validated").addClass("was-validated");
      $("#input-name").addClass("is-valid");
      $("#input-name-invalid-feedback").addClass("d-none");
      $("#input-password").addClass("is-valid");
      $("#input-password-invalid-feedback").addClass("d-none");

			let errorMsgsObj = response.responseJSON.errors;
        let cleanProperty;
			for (const property in errorMsgsObj) {
        cleanProperty =  JSON.stringify(property).replace(/['"]+/g, '');
        $(`#${cleanProperty}`).removeClass("is-valid");
        $(`#${cleanProperty}`).addClass("is-invalid");
        $(`#${cleanProperty}-invalid-feedback`).html(errorMsgsObj[property]);
        $(`#${cleanProperty}-invalid-feedback`).addClass("d-block");

			}
		} else {
			//Something else went wrong
			$("#input-error-alert").fadeIn(450);
			$( "#input-errors" ).html(`Something went wrong. Please refresh the page and try again. [Details: Exception Caught. HTTP status: ${response.status}]`);
		}
	});
}


</script>



</html>