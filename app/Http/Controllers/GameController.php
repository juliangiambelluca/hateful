<?php

namespace App\Http\Controllers;

use App\Game;
use App\Player;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
// use Illuminate\Support\Facades\Hash;
// use Illuminate\Support\Facades\Crypt;

class GameController extends Controller
{   
    private function checkGame($gameHash, $alreadyPlaying = false){
        if ($gameHash===-1){
            //Game Hash has not been set (or has been set to -1). Either way, show the Homepage
            return view('welcome');
        } 

        $response = array(
            "gameHash" => null,
            "alreadyPlaying" => false,
            "gameExists" => false,
        );

        $game = Game::where('hash', '=', $gameHash)->first(); 
            
        if($alreadyPlaying === true){
            $response["alreadyPlaying"] = true;
        }
        if(isset($game->id)){ 
            //Game exists - Take user to join game page
            $response["gameHash"] = $gameHash;
            $response["gameExists"] = true;
        } 
        return view('pages.enter-details')->with('response', $response);
    }
   
    public function findGame(Request $request, $gameHash = -1) {
        //Check if user already has an active game in session
        //Check if a session for this game already exists
        if ($request->session()->has('gameHash')) {
            $sessionGameID = session('gameHash');
            $newGameID = $gameHash;
            //hash is generated with substr(md5(time()), 0, 8); and checked for unique

            if($sessionGameID === $newGameID){
                //User is already signed in to this game

                return "You're already in this game";
            } else {
                //User is signed in to a DIFFERENT game
               return $this->checkGame($gameHash, true);
            }
        } else {
            //User has no active games.
             return $this->checkGame($gameHash);
        }

    }


}