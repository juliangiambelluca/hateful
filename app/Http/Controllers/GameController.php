<?php

namespace App\Http\Controllers;

use App\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{   

   public function findGame($gameHash = -1) {
        $game = DB::table('games')->where('hash', '=', $gameHash)->get(); 

        if(isset($game->id)){ 
            //Game exists - Take user to join game page
            return view('pages.enter-details')->with('gameID',$game->id);
        } else if ($gameHash===-1) {
            //Game Hash has not been set (or has been set to -1). Either way, show the Homepage
            return view('welcome');
        } else {
            //A Game Hash has been entered but it doesn't exist. Show the create a game page
            //and let the user know they entered an invalid ID.
            return view('pages.enter-details')->with('gameID','gameNotFound');
        }

   }

}