
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
        <h2 class="h3 mb-3 font-weight-normal">
          Join Game.
        </h2>
        <label for="inputPassword" class="sr-only">Game Password</label>
        <input type="password" id="inputPassword" class="form-control" placeholder="Game Password" required>
        @else
        <h2 class="h3 mb-3 font-weight-normal">
        This Game ID does not exist. <br>
        Why not start a new game?
        </h2>
        @endif
      @else
        <h2 class="h3 mb-3 font-weight-normal">
        Let's get started.
        </h2>
      @endif
      <br>
      <label for="inputScreenName" class="sr-only">Witty Screen Name</label>
      <input type="input" id="inputScreenName" class="form-control" placeholder="Witty Screen Name" required autofocus>
      <br>      
      <label for="inputName" class="sr-only">Your Actual Name</label>
      <input type="input" id="inputName" class="form-control" placeholder="Your Actual Name" required autofocus>
      
      <div class="checkbox mb-3">
        <br>
        <label>
          <input type="checkbox" value="remember-me"> Remember me
        </label>
      </div>
      <button class="btn btn-lg btn-primary btn-block" type="submit">Create New Game</button>
      <p class="mt-5 mb-3 text-muted">&copy; Julian Giambelluca</p>
    </form>
  </body>
</html>
