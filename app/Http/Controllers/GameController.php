<?php

namespace App\Http\Controllers;

use App\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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


   public function joinGame(Request $request, $session){

    $attributeNames = array(
        'player-name' => 'Name'
    );
    $customMessages = array();
    $rules = array(
        'player-name' => 'required|min:3|max:64'
    );

    $this->validate($request, $rules, $customMessages, $attributeNames);
    
    $oldGame = Game::find($request->input('game-id'));
    $inputPassword = Hash::make($request->input('game-password'));
    if (isset($oldGame->id)){
        //Game exists
        $gamePassword = $oldGame->password;
        if ($inputPassword === $gamePassword) {
            // The passwords match...
            $session->put('gameID', $oldGame->id)
        } else {
            //Passwords did not match
        }
    } else {
        //Game does not exist
        return view('pages.enter-details')->with('gameID','gameNotFound');
    }



    $set = new Set([
        'title' => $request->input('fc-set-title') ,
        'description' => $request->input('fc-set-desc'),
        'color' => $request->input('fc-set-color'),
    ]);

    $oldSet = Set::find($request->input('fc-set-id'));
    $request->input('fc-set-desc')


    if (isset($oldSet->id)){
        $oldSet->title = $request->input('fc-set-title');
        $oldSet->description = $request->input('fc-set-desc');
        $oldSet->color = $request->input('fc-set-color');
        $oldSet->save();
        $currentID = $oldSet->id;
        $newTitle = $oldSet->title;
    }else{
        $set->save();
        $currentID = $set->id;
        $newTitle = $set->title;
    };

    $response = array(
        "result" => "success",
        "setID" => $currentID,
        "setTitle" => $newTitle,
        );
 
    return($response);
   }


}