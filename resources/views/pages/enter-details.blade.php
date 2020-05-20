
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="">

    <title>New Game</title>


    <!-- Bootstrap core CSS -->
    <link href="{{ URL::to('css/bootstrap.css') }}" rel="stylesheet">

    <!-- Custom styles for this template -->
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
    <form id="form-inputs" class="form-signin">
    <h1 class="mb-1" style="font-weight: 800">hateful. [beta]</h1>
    <br>

    @if(isset($gameID))
        @if($gameID !== "gameNotFound")
        <h3 class="h3 mb-3 font-weight-normal">
          Join Game.
        </h3>
        <label for="inputPassword" class="sr-only">Game Password</label>
        <input type="password" id="inputPassword" class="form-control" placeholder="Game Password" required>
        @else
        <h5 class="h5 mb-3 font-weight-normal">
        This Game ID does not exist. <br>
        Why not start a new game?
        </h5>
        @endif
      @else
        <h3 class="h3 mb-3 font-weight-normal">
        Let's get started.
        </h3>
      @endif
      <br>
      
      <label for="inputName" class="sr-only">Please enter your full name.</label>
      <input type="input" id="inputName" class="form-control" placeholder="Enter your full name." required autofocus>
      
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
      @if(isset($gameID))
        @if($gameID !== "gameNotFound")
        <button class="btn btn-lg btn-primary btn-block" onclick="joinGame()">Join Game</button>
        @else
        <button class="btn btn-lg btn-primary btn-block" onclick="createGame()">Create New Game</button>
        @endif
      @else
      <button class="btn btn-lg btn-primary btn-block" onclick="createGame()">Create New Game</button>
      @endif
      
      <p class="mt-5 mb-3 text-muted">&copy; Julian Giambelluca</p>
    </form>
  </body>
</html>


<script>

function joinGame(){
  function createSet(){
    
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
                url: "{{ route('join.game') }}",
                type: 'POST',
                dataType: "text",
                data: setInputs,
                success: function (response) {
					// $( "#set-debug" ).html("Success! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
                    resolve(response);
                    
                },
                error: function (response) {
					// $( "#set-debug" ).html("Success! Response:<br>" + response + "<br><br>******<br><br>" + response.responseText);
                    reject(response);
                },
            });
         });
    }
    sendPackage().then(response => {
        //Get resposnse
        let setResponseObj = JSON.parse(response);
        if(setResponseObj.result==="success"){
            //The inputs were correct & the data saved to the database  
            //Set current card's ID to enable updating db instead of insert
            document.getElementById("fc-set-id").value = setResponseObj.setID;
            $( "#set-title-set" ).html("Edit set");
            $( "#set-title-cards" ).html(setResponseObj.setTitle);
            
			showCardsEditor();
        } else {
            //Unexpected response from server
            $("#input-error-alert").fadeIn(450);
            $( "#input-errors" ).html("Something went wrong. Please try again. [Details: Unexpected response from server]");
        }
    })
    .catch(response => {
        //If data validation fails, Laravel responds with status code 422 & Error messages in JSON.
        if(response.status===422) {
            let errorMsgsObj = JSON.parse(response.responseText);
            $("#input-error-alert").fadeIn(450);
            $( "#input-errors" ).html("");
            //Extract each error message and append to alert
            for (const property in errorMsgsObj) {
                $( "#input-errors" ).append( errorMsgsObj[property] + "<br>");
            }
        } else {
            //Something else went wrong
            $("#input-error-alert").fadeIn(450);
            $( "#input-errors" ).html(`Something went wrong. Please try again. [Details: Exception Caught. HTTP status: ${response.status}]`);
        }
    });
}

}


</script>