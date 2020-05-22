<?php

namespace App\Http\Middleware;
use Closure;

class checkBanned
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
        session_start();
        if (isset($_SESSION['bannedUntil'])) {
            $bannedUntil = $_SESSION['bannedUntil'];
            //If they are still banned
            if ($bannedUntil > time()){

                abort(404, 'TOO_MANY_LOGIN_ATTEMPTS_GET_YOU_BANNED');
            
            } else if ($bannedUntil < time() ){
                //Give them another chance before locking them out again
                unset($_SESSION['bannedUntil']) ;
            } 
           
        }
        return $next($request);
        
    }
}
