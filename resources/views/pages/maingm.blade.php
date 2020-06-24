
<main role="main" >

<div id="game-table">
  <div class="row">
  
    <div class="col-6 col-md-5 col-lg-4 col-xl-3">
      <div class="card game-card current-question question-card">
        <div class="card-body game-card-body center">
          <div class="card-text-question ">
            They said we were crazy. They said we couldn’t put __________________ inside of _________.<br> They were wrong.
          </div>
        </div>
      </div>
    </div>  
    
    <div id="confirm-answer"  class="col-6 col-md-7 col-lg-6 col-xl-9">
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
<div class="modal" id="myModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
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