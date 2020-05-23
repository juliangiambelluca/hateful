<?php

namespace App\Http\Middleware;
use Illuminate\Session\Middleware\StartSession;
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
        
        if ($request->session()->has('bannedUntil')) {
            $bannedUntil = session('bannedUntil');
            //If they are still banned
            if ($bannedUntil > time()){

                abort(404, 'TOO_MANY_LOGIN_ATTEMPTS_GET_YOU_BANNED');
            
            } 
        }
        return $next($request);
        
    }
}
