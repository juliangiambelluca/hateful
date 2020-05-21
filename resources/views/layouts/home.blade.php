
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
    <link href="{{ URL::to('css/home.css') }}" rel="stylesheet">
    
    <script src="{{ URL::to('js/jquery.js') }}"></script>

    <script src="{{ URL::to('js/bootstrap.js') }}"></script>

  </head>
  <body>

  @yield('content')

  </body>

<footer>

</footer>
</body>
</html>
