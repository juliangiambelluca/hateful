@extends('layouts.game')

@section('title')
play hateful
@endsection

@section('content')
  
    <main role="main" class="col-md-9 col-lg-10 ml-sm-auto">

      <div id="game-table">
        <div class="row pt-3 pl-2">
        
          <div class="col-6 col-md-5 col-lg-4 col-xl-3">
            <div class="card game-card current-question question-card">
              <div class="card-body game-card-body p-2 center">
                <div class="card-text-question ">
                  They said we were crazy. They said we couldn’t put __________________ inside of _________.<br> They were wrong.
                </div>
              </div>
            </div>
          </div>  
          
          <div id="confirm-answer"  class="col-6 col-md-7 col-lg-6 col-xl-9 p-0">
            @include('partials.confirm-answer')
          </div>
          <div id="card-backs" style="display:none" class="col-6 col-sm-8 col-lg-9">
            @include('partials.card-backs')
          </div>
        </div> 
        <!-- End row  -->
      </div>      
      <!-- End Game table -->

      <div id="my-cards">
        @include('partials.my-cards')
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

<script>
  $('#myModal').on('shown.bs.modal', function () {
  $('#write-answer-input').trigger('focus')

  answerModalWidth = $('#write-answer-modal-content').width();
  answerModalHeight = $('#write-answer-modal-content').height();
  
  if (answerModalHeight > answerModalWidth){
    //landscape. card height at 90%
    $('#write-answer-modal-content').width((answerModalHeight * 0.7) + "px")

  } else {
    //portrait. card width at 90%
    $('#write-answer-modal-content').height((answerModalWidth * 1.5) + "px")
  }

  

})
</script>






@endsection