<?php

use App\Http\Middleware\checkPlayerSession;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

    Route::get('/', function () {
        return view('welcome');
    })->name("homepage");
    

    Route::post('/new-game', [
        'uses' => 'GameController@loadNewGame',
        'as' => 'new-game'
    ]);
    

    Route::middleware([checkPlayerSession::class])->group(function () {
        Route::get('/play', function () {
            return view('pages.game');
        })->name("pages.game");
        
        Route::get('/lobby', function () {
            return view('pages.lobby');
        })->name("lobby");
    });
   

    
    Route::post('/join-game', [
        'uses' => 'PlayerController@checkSessionForJoin',
        'as' => 'join-game'
    ]);
    
    
    

    
    //Make sure this stays last as otherwise following route URLs will be treated as game hashes.
    Route::get('/{gameHash?}', [
        'uses' => 'GameController@findGame',
        'as' => 'find-game'
    ]);


