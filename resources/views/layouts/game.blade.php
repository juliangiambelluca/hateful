
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
    <meta name="author" content="Mark Otto, Jacob Thornton, and Bootstrap contributors">
    <meta name="generator" content="Jekyll v3.8.6">
    <title>@yield('title')</title>


    <link href="{{ URL::to('css/app.css') }}" rel="stylesheet">
    
    <link href="{{ URL::to('css/game.css') }}" rel="stylesheet">
    <style>
      
@media (min-width: 768px) {
  html:not([dir="rtl"]) .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed ~ .c-wrapper, html:not([dir="rtl"])
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed ~ .c-wrapper {
    margin-left: 256px;
  }
  *[dir="rtl"] .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed ~ .c-wrapper, *[dir="rtl"]
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed ~ .c-wrapper {
    margin-right: 256px;
  }
  html:not([dir="rtl"]) .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-sm ~ .c-wrapper, html:not([dir="rtl"])
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-sm ~ .c-wrapper {
    margin-left: 192px;
  }
  *[dir="rtl"] .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-sm ~ .c-wrapper, *[dir="rtl"]
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-sm ~ .c-wrapper {
    margin-right: 192px;
  }
  html:not([dir="rtl"]) .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-lg ~ .c-wrapper, html:not([dir="rtl"])
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-lg ~ .c-wrapper {
    margin-left: 320px;
  }
  *[dir="rtl"] .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-lg ~ .c-wrapper, *[dir="rtl"]
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-lg ~ .c-wrapper {
    margin-right: 320px;
  }
  html:not([dir="rtl"]) .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-xl ~ .c-wrapper, html:not([dir="rtl"])
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-xl ~ .c-wrapper {
    margin-left: 384px;
  }
  *[dir="rtl"] .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-xl ~ .c-wrapper, *[dir="rtl"]
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-xl ~ .c-wrapper {
    margin-right: 384px;
  }
  html:not([dir="rtl"]) .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-minimized ~ .c-wrapper, html:not([dir="rtl"])
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-minimized ~ .c-wrapper {
    margin-left: 56px;
  }
  *[dir="rtl"] .c-sidebar.c-sidebar-md-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-minimized ~ .c-wrapper, *[dir="rtl"]
  .c-sidebar.c-sidebar-show:not(.c-sidebar-right).c-sidebar-fixed.c-sidebar-minimized ~ .c-wrapper {
    margin-right: 56px;
  }
}

      </style>
  </head>
  </head>
  <body class="c-app">
  @include('partials.topbar')

   @include('partials.sidebar')
    <div class="c-wrapper c-fixed-components">
      <div class="d-lg-none"><div class="m-4 pt-3"></div></div>
      <div class="c-body">
        <main class="c-main" >
          <div class="container-fluid">
            <div class="fade-in">

            
            <script src="{{ URL::to('js/app.js') }}"></script>
            <script src="{{ URL::to('js/coreui.bundle.min.js') }}"></script>
            <!-- <script src="{{ URL::to('js/main.js') }}"></script> -->

@yield('content')


            </div>
          </div>
        </main>
        <!-- <footer class="c-footer">
          <div><a href="https://coreui.io">CoreUI</a> © 2020 creativeLabs.</div>
          <div class="ml-auto">Powered by&nbsp;<a href="https://coreui.io/">CoreUI</a></div>
        </footer> -->
      </div>
    </div>
    <script src="https://kit.fontawesome.com/d5ff43701b.js" crossorigin="anonymous"></script>

    <!--<![endif]-->

  </body>
</html>