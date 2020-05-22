
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="Mark Otto, Jacob Thornton, and Bootstrap contributors">
    <meta name="generator" content="Jekyll v3.8.6">
    <title>@yield('title')</title>


    <link href="{{ URL::to('css/bootstrap.css') }}" rel="stylesheet">
    
    <link href="{{ URL::to('css/game.css') }}" rel="stylesheet">

    <script src="https://kit.fontawesome.com/d5ff43701b.js" crossorigin="anonymous"></script>


    <script src="/socket.io/socket.io.js"></script>

    <script src="{{ URL::to('js/jquery.js') }}"></script>

    <script src="{{ URL::to('js/bootstrap.js') }}"></script>

    <script src="{{ URL::to('js/bootstrap.bundle.js') }}"></script>

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
									<h6>hateful.io/23rde</h6>
                  </div>
              <div class="col-md-6">	
              <h5>game password:</h5>
									<h6>fanny-fart</h6>
                  </div>
            
            </div>
									
								
            </div>
            
            <button class="btn btn-lg m-4 pt-3 pb-3 btn-secondary disabled btn-block" style="min-width: 50%; max-width: 83%;" onclick="returnToGame()">Waiting for players<br><small>[min. 3 to start]</small></button>        
          </div>
          <div class="col-md-6">

          </div>
        
        </div>
      </div>      
      <!-- End Game table -->

      <div id="my-cards">
        @include('partials.name-cards')
      </div>
     
    </main>




<!-- Modal -->
<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered"  role="document" id="write-answer-modal-dialog">
    <div class="modal-content" id="write-answer-modal-content">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
    
      <div class="modal-body">
        <div class="form-group" style="height: 100% !Important">
            <textarea class="form-control write-answer-input card-text-answer" placeholder="write something witty..." id="write-answer-input"></textarea>
          </div>
      </div>
     
    </div>
  </div>
</div>

<<script>
 
    var socket = io();
    $('form').submit(function(e){
      e.preventDefault(); // prevents page reloading
      socket.emit('chat message', $('#m').val());
      $('#m').val('');
      return false;
    });
    socket.on('chat message', function(msg){
      $('#messages').append($('<li>').text(msg));
    });
    </script>
  </div>
</div>
  </body>
</html>

  
    



