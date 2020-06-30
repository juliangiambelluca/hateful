<style>
.c-header, .c-header a, .c-header a:hover, .c-header a:active, .c-header a:focus{
	font-size:1rem;
	color: #2f3c54;
}

.badge-topbar{
    display: inline-block;
    padding: 0.25em 0.4em;
    font-size: 75%;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.c-header-topbar-name, .c-header-topbar-name-long {
	text-overflow: ellipsis;
	white-space: nowrap;
	display: inline-block !important;
	max-width: 150px;
	overflow: hidden;
	vertical-align: middle;
    -ms-flex-align: center;
    align-items: center;
    padding-right: 0.5rem;
    padding-left: 0.5rem;
}
.c-header-topbar-name-long {
	max-width: 232px;
}
@media screen and (min-width: 370px) {
	.c-header-topbar-name {
	max-width: 200px;
}
.c-header-topbar-name-long {
	max-width: 282px;
}
}
@media screen and (min-width: 400px) {
	.c-header-topbar-name {
	max-width: 230px;
}
.c-header-topbar-name-long {
	max-width: 312px;
}
}
</style>

<header id="mobile-topbar" class="c-header c-header-light d-lg-none c-header-fixed">
    
	<a onclick="toggleTopbar();" style="width: 100%" href="#">
    
    <ul class="c-header-nav" style="width: 100%">
		<li class="c-header-nav-item px-3" style="width: 20%;
    display: inline-block;
    vertical-align: middle;
}
"><span class="c-sidebar-nav-title text-left m-0 p-2" href="#">Timer</span>
		<br>
		<span class="c-header-topbar-name" id="topbar-timer"></span>
		</li>
		<li class="c-header-nav-item px-3" style="width: 75%;
    display: inline-block;
    vertical-align: middle;
}
"><span class="c-sidebar-nav-title text-left m-0 p-2" href="#">Round Master</span>
		<br>		
		<div><div class="c-header-topbar-name">000000000000000000000000000000000000000</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>

		</li>
</a>
		
	</ul>
	<div id="topbar-more-details" style="transition: 0.4s; overflow-y: hidden; width: 100%; display: none">
		<ul class="c-header-nav" style="width: 100%">
			<li class="c-header-nav-item px-3"><span class="c-sidebar-nav-title text-left m-0 p-2" href="#">Leaderboard</span>
			<br>
			<div><div class="c-header-topbar-name-long">Juan Pereira del La Cruz</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>
			<div><div class="c-header-topbar-name-long">John G</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>
			<div><div class="c-header-topbar-name-long">Leo Edwards</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>
			<div><div class="c-header-topbar-name-long">Tariq Poonwsasie</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>
			<div><div class="c-header-topbar-name-long">Jess Ball</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>
			<div><div class="c-header-topbar-name-long">El Priniciptito</div><span class="badge-topbar badge-primary d-inline-block mx-2">800</span></div>

			</li>
			
		</ul>

		<ul class="c-header-nav mt-2" style="width: 50%; float: left;">
			<li class="c-header-nav-item px-3"><span class="c-sidebar-nav-title text-left m-0 p-2" href="#">Game Link</span>
			<span class="c-header-topbar-name-long" href="#">hateful.io/234432</span>
			</li>
		</ul>
		<ul class="c-header-nav mt-2" style="width: 50%">
			<li class="c-header-nav-item px-3"><span class="c-sidebar-nav-title text-left m-0 p-2" href="#">Game Password</span>
			<span class="c-header-topbar-name-long" href="#">fd2234</span>
			</li>
		</ul>
	</div>
<!-- 
	<ul class="c-header-nav mt-3" style="width: 100%">
		<li class="c-header-nav-item px-3"><span class="c-sidebar-nav-title text-left m-0 p-2" href="#">Settings</span>
		<a class="c-header-nav-link" href="#">Change your display name</a>
		<a class="c-header-nav-link text-danger" href="#">End Game</a>
		</li>
	</ul> -->
	<br>
	<a onclick="toggleTopbar();" style="width: 100%" href="#">
		<div id="topbar-toggle-button" style="width: 100%" class="text-center">
			<i class="fas fa-lg fa-angle-down my-1"  ></i>
		</div>
	</a>

	</header>
    <script>
		let mobileTopbarOpen = false

		function toggleTopbar(){
			if(mobileTopbarOpen){
				//Topbar is open
				$("#topbar-more-details").css("height", "0px");
				setTimeout(() => {
					$("#topbar-more-details").css("display", "none");
					$("#topbar-toggle-button").html("<i class='fas fa-lg fa-angle-down my-1'></i>")

				}, 250);
				

				mobileTopbarOpen = false;
			} else {
				//Topbar is closed
				$("#topbar-more-details").css("display", "block");
				$("#topbar-more-details").css("height", "auto");
				let topbarFullHeight = $("#topbar-more-details").height();
				$("#topbar-more-details").css("height", "0px");
				setTimeout((topbarFullHeight) => {
					$("#topbar-more-details").css("height", topbarFullHeight);

				}, 50, topbarFullHeight);
			
				setTimeout((topbarFullHeight) => {
				$("#topbar-toggle-button").html("<i class='fas fa-lg fa-angle-up my-3'></i>")

				}, 200, topbarFullHeight);
				mobileTopbarOpen = true;

			}
		}

	</script>
    
