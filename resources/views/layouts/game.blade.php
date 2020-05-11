
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

  </head>


  <body>
  @include('partials.topbar')
  @include('partials.sidebar')
  @yield('content')
  
  </body>
</html>
