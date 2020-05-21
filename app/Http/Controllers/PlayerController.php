<?php

namespace App\Http\Controllers;

use App\Game;
use App\Player;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;

class PlayerController extends Controller
{   
    public function joinGame(Request $request){

        //Validate Inputs
        $attributeNames = array(
            'input-name' => 'Name',
            'input-password' => 'Password'
        );
        $customMessages = array();
        $rules = array(
            'input-name' => 'required|min:3|max:32',
            'input-password' => 'required'
        );
        $this->validate($request, $rules, $customMessages, $attributeNames);
        //Validation END

        //Check if game exists
        $oldGame = Game::find($request->input('game-id'));
        if (isset($oldGame->id)){
            //Game exists

            //Check password
            $gamePassword = $oldGame->password;
            // $inputPassword = Hash::make($request->input('input-password'));
            $inputPassword = ($request->input('input-password'));
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
                session(['gameID' => $oldGame->id]);
                session(['userID' => $player->id]);
                session(['sessionToken' => $player->session]);
                
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