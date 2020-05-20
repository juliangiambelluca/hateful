<?php

namespace App\Http\Controllers;

use App\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{   

   public function findGame($gameID = -1) {
        $game = DB::table('games')->where('hash', '=', $gameID)->get(); 

        if(isset($game->id)){ 
            //Game exists - Take user to join game page
            return view('pages.enter-details')->with('gameFound',true);
        } else if ($gameID===-1) {
            //Game ID has not been set (or has been set to -1). Either way, show the Homepage
            return view('welcome');
        } else {
            //A Game ID has been entered but it doesn't exist. Show the create a game page
            //and let the user know they entered an invalid ID.
            return view('pages.enter-details')->with('gameFound',false);
        }

   }

}