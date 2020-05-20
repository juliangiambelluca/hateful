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

    public function findGame($gameHash = -1) {
     $game = DB::table('games')->where('hash', '=', $gameHash)->first(); 
        
        if(isset($game->id)){ 
            //Game exists - Take user to join game page
            return view('pages.enter-details')->with('gameID', $game->id);
        } else if ($gameHash===-1) {
            //Game Hash has not been set (or has been set to -1). Either way, show the Homepage
            return view('welcome');
        } else {
            //A Game Hash has been entered but it doesn't exist. Show the create a game page
            //and let the user know they entered an invalid ID.
            return view('pages.enter-details')->with('gameID','gameNotFound');
        }

    }


    public function joinGame(Request $request, Store $session){

        //Validate Inputs
        $attributeNames = array(
            'input-name' => 'Name'
        );
        $customMessages = array();
        $rules = array(
            'input-name' => 'required|min:3|max:32'
        );
        $this->validate($request, $rules, $customMessages, $attributeNames);
        //Validation END

        //Check if game exists
        $oldGame = Game::find($request->input('game-id'));
        if (isset($oldGame->id)){
            //Game exists

            //Check password
            $gamePassword = $oldGame->password;
            $inputPassword = Hash::make($request->input('input-password'));
            if ($inputPassword === $gamePassword) {
                // The passwords match...

                //Create New Player
                $encryptedName = Crypt::encryptString($request->input('input-name'));
                //HOW TO DECRYPT: $decrypted = Crypt::decryptString($encrypted);
                $newSessionToken = Hash::make(rand());
                $player = new Player([
                    'fullname' => $encryptedName,
                    'game_id' => $oldGame->id,
                    'session' => $newSessionToken
                ]);
                //Save new player in relation to this game.
                $oldGame->players()->save($player);
                //New player created
                
                //Store Necessary details in session
                $session->put('gameID', $oldGame->id);
                $session->put('userID', $player->id);
                $session->put('sessionToken', $player->session);

                if($oldGame->started == 1){
                    //Load game 
                    $result = "game";
                } else {
                    //Load lobby
                    $result = "lobby";
                }
                //Game started if end

            } else {
                //Passwords did not match
                $result = "password";
            }
            //Password match if end

        } else {
            //Game does not exist
            $result = "gameNotFound";
        }
        //Game exist if end

        $response = array(
            "result" => $result
        );

        return ($response);
    }


}