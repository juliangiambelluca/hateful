<?php

namespace App\Http\Controllers;

use App\Game;
use App\Player;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;

class GameController extends Controller
{   

    public function createGame(Request $request){
        //Validate Inputs
        $attributeNames = array(
            'input-name' => 'Name'
        );
        $customMessages = array();
        $rules = array(
            'input-name' => 'required|min:3|max:32'
        );
        $this->validate($request, $rules, $customMessages, $attributeNames);

        $game = new Game([
            'started' => 0,
            'hash' => 0,
            'password' => 0
        ]);

        $game->password = $game->newPassword();
        $game->hash = $game->newHash();
        
        $game->save();

        $encryptedName = Crypt::encryptString($request->input('input-name'));
        $newSessionToken = Hash::make(rand());
        $player = new Player([
            'fullname' => $encryptedName,
            'session' => $newSessionToken,
            'ismaster' => 0
        ]);
        //Save new player in relation to this game.
        $game->players()->save($player);
        
        //Store Necessary details in session
        session(['gameID' => $game->id]);
        session(['ismaster' => 1]);
        session(['gameHash' => $game->hash]);
        session(['userID' => $player->id]);
        session(['sessionToken' => $player->session]);
        
        $response = array(
            "result" => "lobby"
        );

        return ($response);


    }


    private function checkGame($gameHash, $alreadyPlaying = false){
        $response = array(
            "gameHash" => null,
            "alreadyPlaying" => false,
            "gameExists" => false,
            "newGame" => false,
        );
       
        if ($gameHash===-1){
            //Game Hash has not been set (or has been set to -1).
            $response["newGame"] = true;
        } 

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