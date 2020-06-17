
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="Mark Otto, Jacob Thornton, and Bootstrap contributors">
    <meta name="generator" content="Jekyll v3.8.6">
    <title>@yield('title')</title>


    <link href="{{ URL::to('css/app.css') }}" rel="stylesheet">
    
    <link href="{{ URL::to('css/game.css') }}" rel="stylesheet">

  </head>


  <body>
  <!-- include('partials.topbar') -->
  <nav class="navbar navbar-dark bg-dark d-block p-0 ">

<div class="row d-sm-flex pt-1 pl-2" style="width: 100%; ">

  <div class="col-12  col-md-4  col-lg-3  text-white " ><h4 class="m-2" style="font-weight: 800"> hateful. [beta]</h4></div>  

</nav>

<div class="content-fluid">
  <div class="row" style="width: 100%">
    @include('partials.sidebar')
<script src="{{ URL::to('js/app.js') }}"></script>

    @yield('content')
  </div>
</div>



<script src="https://kit.fontawesome.com/d5ff43701b.js" crossorigin="anonymous"></script>

  </body>
</html>
