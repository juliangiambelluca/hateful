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

    public function lobbyOrGame(){


        $game = DB::table('games')->where('id', '=', session('gameID'))->first(); 

        if (isset($game)) {
            //Game exists
            if($game->started==1){
                return redirect('/game');
            } else {
                return redirect('/lobby');
            }
        } else {
            //There is no such game
            return redirect('/new-game');
        }

       
    }

    private function testLobbyOrGame(){
        
        $oldGame = Game::find(session('gameID'));
        $gameStarted = $oldGame->started;
        if($gameStarted === 1){
            return "game";
        } else {
            return "lobby";
        }
    }

    public function prepareLobby(){
        
        $toLoad = $this->testLobbyOrGame();
        if ($toLoad === "lobby"){
            $password = session('gamePassword');
            $gameHash = session('gameHash');
            $response = array(
                "password" => $password,
                "gameHash" => $gameHash
            );

            return view('pages.lobby')->with('response', $response);

        } else {

            return redirect('/game');

        }
    }

    public function prepareGame(){
        
        $toLoad = $this->testLobbyOrGame();

        if ($toLoad === "game"){

            //load game    
            return view('pages.game');

        } else {

            return redirect('/lobby');

        }
    }

    // public function attributes()
    // {
    //     return [
    //         'input-name' => 'Name',
    //     ];
    // }

    public function createGame(Request $request){
        //Validate Inputs
        $attributeNames = array(
            'input-name' => 'name',
        );
        $customMessages = array();
        $rules = array(
            'input-name' => 'required|min:3|max:32',
        );
        $this->validate($request, $rules, $customMessages, $attributeNames);
        
        // $validateName = $request->input('input-name');
        // if ( ($validateName=="") || (strlen($validateName) <= 3) || (strlen($validateName) >= 32) ) {
        //     $response = array(
        //         "result" => "input-error"
        //     );
    
        //     return ($response);
        // }


        //sanitise input
        $inputFullname = htmlspecialchars($request->input('input-name'));

        $game = new Game([
            'started' => 0,
            'hash' => 0,
            'password' => 0
        ]);

        $game->password = $game->newPassword();
        $game->hash = $game->newHash();
        
        $game->save();

        $newSessionToken = Hash::make(rand());
        $player = new Player([
            'fullname' => $inputFullname,
            'session' => $newSessionToken,
            'connected' => false,
            'state' => 'active',
            'ismaster' => 1,
            'ishost' => 1,
            'score' => 0
        ]);
        //Save new player in relation to this game.
        $game->players()->save($player);
        
        //Store Necessary details in session
        session(['gameID' => $game->id]);
        session(['gameHash' => $game->hash]);
        session(['gamePassword' => $game->password]);
        session(['gameStarted' => false]);
        session(['isMaster' => true]);
        session(['isHost' => true]);
        session(['userID' => $player->id]);
        session(['fullname' => $player->fullname]);
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
               return $this->lobbyOrGame();
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