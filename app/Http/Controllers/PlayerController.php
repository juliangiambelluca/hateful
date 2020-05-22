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

    public function joinGame($request){
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
        $gameHash = $request->input('game-hash');
        $oldGame = Game::where('hash', '=', $gameHash)->first(); 
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
                session(['gameHash' => $gameHash]);
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
                
                if ($request->session()->has('loginAttempts')) {
                    $loginAttempts = session('loginAttempts');
                    session(['failedLoginAttempts' => $loginAttempts + 1]);

                    if ($loginAttempts === 5){
                        //Banned for 5 minutes after 5 failed login attempts.
                        session(['bannedUntil' => time() + 300 ]);
                    }
                    if ($loginAttempts === 10){
                        //Banned for 20 minutes after 10 failed login attempts.
                        session(['bannedUntil' => time() + 1200 ]);
                    }
                    
                } else {
                    session(['failedLoginAttempts' => 1]);
                }

                


                session(['loginAttempts' => $request->session()->has('gameHash')]);

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


    public function checkSessionForJoin(Request $request){

        //Check if a session for this game already exists

        if ($request->session()->has('gameHash')) {
            $sessionGameHash = session('gameHash');
            $newGameHash = $request->input('game-hash');

            if($sessionGameHash === $newGameHash){
                //User is already signed in to this game

                return $this->joinGame($request);
            } else {
                //User is signed in to a DIFFERENT game

                return $this->joinGame($request);
            }
        } else {
             //User has no active games.
             return $this->joinGame($request);

        }











       
    }

}