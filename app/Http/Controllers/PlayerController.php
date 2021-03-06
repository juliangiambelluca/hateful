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

    public function updateHost($newHostID){
        session(['isMaster' => true]);
        return;
    }


    public function joinGame(Request $request){
         //Validate Inputs
         $attributeNames = array(
            'input-name' => 'name',
            'input-password' => 'password'
        );
        $customMessages = array();
        $rules = array(
            'input-name' => 'required|min:3|max:32',
            'input-password' => 'required'
        );
        $this->validate($request, $rules, $customMessages, $attributeNames);
        //Validation END

        //Sanitise inputs
        //Generated Password and Hash will never contain special characters under normal/safe circumstances.
        $inputGameHash = htmlspecialchars($request->input('game-hash'));
        $inputFullname = htmlspecialchars($request->input('input-name'));
        $inputPassword = htmlspecialchars($request->input('input-password'));
               
        //init login attempts
        $loginAttempts = 0;

        //Check if game exists
        $oldGame = Game::where('hash', '=', $inputGameHash)->first(); 
        if (isset($oldGame->id)){
            //Game exists

            //Check password
            $gamePassword = $oldGame->password;
            if ($inputPassword === $gamePassword) {
                // The passwords match...

                //Create New Player
                //HOW TO DECRYPT: $decrypted = Crypt::decryptString($encrypted);
                $newSessionToken = Hash::make(rand());
                $player = new Player([
                    'fullname' => $inputFullname,
                    'session' => $newSessionToken,
                    'connected' => false,
                    'state' => 'active',
                    'ismaster' => 0,
                    'ishost' => 0,
                    'score' => 0
                ]);
                //Save new player in relation to this game.
                $oldGame->players()->save($player);
                //New player created
                
                //Store Necessary details in session
                session(['gameID' => $oldGame->id]);
                session(['gameHash' => $inputGameHash]);
                session(['gamePassword' => $oldGame->password]);
                session(['fullname' => $player->fullname]);
                session(['userID' => $player->id]);
                session(['isMaster' => false]);
                session(['isHost' => false]);
                session(['sessionToken' => $player->session]);
                session(['failedLoginAttempts' => 0]);
                session(['bannedUntil' => 0]);
                
                $result = "can-access";

            } else {
                //Passwords did not match
                $result = "password";
 
                //Using php session so web routes has access.
                if ($request->session()->has('failedLoginAttempts')) {
                    
                    $loginAttempts = session('failedLoginAttempts') + 1;                    
                    session(['failedLoginAttempts' => $loginAttempts]);

                    if ($loginAttempts >= 5){
                        //Banned for 2 minutes after 5 failed login attempts.
                        //+2 minutes for every dodgy login after that.
                        session(['bannedUntil' => (time() + 120)]);
                        $result = "banned";
                    }
                } else {
                    session(['failedLoginAttempts' => 1]);
                    $loginAttempts = 1;
                }
            }
            //Password match if end

        } else {
            //Game does not exist
            $result = "game-not-found";
        }
        //Game exist if end

        $response = array(
            "result" => $result,
            "failedLoginAttempts" => $loginAttempts
        );

        return ($response);

    }


    // public function checkSessionForJoin(Request $request){

    //     //Check if a session for this game already exists

    //     if ($request->session()->has('gameHash')) {
    //         $sessionGameHash = session('gameHash');
    //         $newGameHash = $request->input('game-hash');

    //         if($sessionGameHash === $newGameHash){
    //             //User is already signed in to this game

    //             $response = array(
    //                 "result" => "alreadyIn"
    //             );
    //             return ($response);
    //         } else {
    //             //User is signed in to a DIFFERENT game

    //             return $this->joinGame($request);
    //         }
    //     } else {
    //          //User has no active games.
    //          return $this->joinGame($request);

    //     }
    // }

}