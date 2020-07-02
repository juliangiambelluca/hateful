<div class="c-sidebar c-sidebar-dark c-sidebar-fixed c-sidebar-lg-show" id="sidebar">
      <div class="c-sidebar-brand d-md-down-none">
         <h4 class="p-1" style="font-weight: 800">hateful.io [beta]</h4>

      </div>
      <ul class="c-sidebar-nav ">
        <li class="c-sidebar-nav-title">Timer</li>
        <li class="c-sidebar-nav-item"><a class="c-sidebar-nav-link h4 font-weight-bold" id="sidebar-timer">
           00:00
           <!-- 00:45<span class="badge badge-danger">Time's Up!</span> -->
           </a></li>
           
         
 
           <div class="row">           
               <div class="col-6 pr-0">  
                 <li class="c-sidebar-nav-title" style=" ">Game Link&nbsp;</li>
                 <li class="c-sidebar-nav-item"style=""><span class="c-sidebar-nav-link">
                  hateful.io/{{ session("gameHash") ?? ''}}&nbsp;
                 </span></li>
               </div>
               <div class="col-6"> 
                <li class="c-sidebar-nav-title" style="">Password&nbsp;</li>
                 <li class="c-sidebar-nav-item" style=""><a class="c-sidebar-nav-link">{{ session("gamePassword") ?? ''}}</a>
                </li>
                </div>
              </div>

          
              <li class="c-sidebar-nav-title">Round Master</li>
       
         <li class="c-sidebar-nav-item">
            <a class="c-sidebar-nav-link" id="sidebar-round-master">
              
            </a>
         </li>

          
         <li class="c-sidebar-nav-title">Leaderboard</li>


         <span id="sidebar-leaderboard">

         </span>
         

       
      </ul>
      <!-- <button class="c-sidebar-minimizer c-class-toggler" type="button" data-target="_parent" data-class="c-sidebar-minimized"></button> -->
    </div>