
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="">

    <title>Temporarily banned.</title>


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
    <form class="form-signin" >
    <h1 class="mb-1" style="font-weight: 800">hateful. [beta]</h1>
          <h2 class="h2 mb-3 mt-5 font-weight-normal">
            404.<br>
            Page not found.
          </h2>
         
          @if(strpos($response, "TOO_MANY_LOGIN_ATTEMPTS_GET_YOU_BANNED"))  
          <h4 class="h4 mb-3 mt-5 font-weight-normal">
           You are temporarily banned
          </h4>
          <small>You may return and try again in {{ session('bannedUntil') - time()  }} seconds.</small>
          <br>
          <small>You failed {{ session('failedLoginAttempts')-1 }} login attempts.</small>
          @else
          <h4 class="h4 mb-3 mt-5 font-weight-normal">
           Well done mate!<br>
           You broke it.
          </h4>
          <a class="btn btn-md btn-secondary btn-block" href="{{ route('homepage') }}">Go back to the homepage</a>        
          @endif
    </form>
  </body>
</html>
