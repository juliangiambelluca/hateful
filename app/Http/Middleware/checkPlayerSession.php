<?php

namespace App\Http\Middleware;

use Illuminate\Support\Facades\DB;
use Closure;

class checkPlayerSession
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        
        $player = DB::table('players')->where('session', '=', session('sessionToken'))->first(); 
        //Make sure everyone has the is master information before they enter lobby or game
        if (isset($player)) {
            if($player->ismaster==1){
                session(['isMaster' => true]);
            } else {
                session(['isMaster' => false]);
            }
            return $next($request);
        } else {
            return redirect('/new-game');
        }

    }

}