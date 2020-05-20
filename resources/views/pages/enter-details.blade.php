
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
    <form class="form-signin">
    <h1 class="mb-1" style="font-weight: 800">hateful. [beta]</h1>
    <br>

      @if(isset($gameFound))
        @if($gameFound === true)
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
      <button class="btn btn-lg btn-primary btn-block" type="submit">Create New Game</button>
      <p class="mt-5 mb-3 text-muted">&copy; Julian Giambelluca</p>
    </form>
  </body>
</html>
