@extends('layouts.game')

@section('title')
play hateful
@endsection

@section('content')
<div class="content-fluid">
  
    <main role="main" class="col-md-9 col-lg-10 ml-sm-auto">

      <div id="game-table">
        <div class="row pt-3">
        
          <div class="col-6 col-sm-4 col-lg-3">
            <div class="card game-card current-question question-card">
              <div class="card-body game-card-body p-2 center">
                <div class="card-text-question ">
                  They said we were crazy. They said we couldn’t put __________________ inside of _________.<br> They were wrong.
                </div>
              </div>
            </div>
          </div>  
          
          <div id="answer-table" class="col-6 col-sm-8 col-lg-9">
            @include('partials.answer-table')
          </div>
        </div> 
        <!-- End row  -->
      </div>      
      <!-- End Game table -->

      <div class="row" style="width: 100%; ">
        <div class="col-2">
          <hr>
           <h6 class="text-center" style="font-weight: 800">00:45</h6>
          <hr>
        </div>
        <div class="col-8 col-lg-5">
          <hr>
           <h6 class="text-center" style="font-weight: 800"><i class="fas fa-crown"></i> john cena is question master <i class="fas fa-crown"></i></h6>
          <hr>
        </div>
      </div>

      <div id="my-cards">
        @include('partials.my-cards')
      </div>
     
    </main>
  
</div>
<script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" integrity="sha384-J6qa4849blE2+poT4WnyKhv5vZF5SrPo0iEjwBvKU7imGFAV0wwj1yYfoRSJoZ+n" crossorigin="anonymous"></script>
      <script>window.jQuery || document.write('<script src="/docs/4.4/assets/js/vendor/jquery.slim.min.js"><\/script>')</script><script src="/docs/4.4/dist/js/bootstrap.bundle.min.js" integrity="sha384-6khuMg9gaYr5AxOqhkVIODVIvm9ynTT5J4V1cfthmT+emCG6yVmEZsRHdxlotUnm" crossorigin="anonymous"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/feather-icons/4.9.0/feather.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.min.js"></script>
        <script src="dashboard.js"></script>


@endsection