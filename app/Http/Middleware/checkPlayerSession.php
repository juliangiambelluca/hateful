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
        
        $game = DB::table('games')->where('hash', '=', session('gameHash'))->first(); 
        
        if (isset($game)) {
            return $next($request);
            
        } else {
            $response = array(
                "gameHash" => null,
                "alreadyPlaying" => false,
                "gameExists" => false,
            );
            return redirect('/new-game');
        
        }

    }

}