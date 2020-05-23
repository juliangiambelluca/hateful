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
    

    Route::get('/new-game', [
        'uses' => 'GameController@findGame',
        'as' => 'new-game'
    ]);

    Route::post('/create-game', [
        'uses' => 'GameController@createGame',
        'as' => 'create-game'
    ]);
    

    Route::middleware([checkPlayerSession::class])->group(function () {

        Route::get('/game', [
            'uses' => 'GameController@prepareGame',
            'as' => 'game'
        ]);
        Route::get('/lobby', [
            'uses' => 'GameController@prepareLobby',
            'as' => 'lobby'
        ]);
        Route::get('/lobby-or-game', [
            'uses' => 'GameController@lobbyOrGame',
            'as' => 'lobby-or-game'
        ]);
    });
   

    
    Route::post('/join-game', [
        'uses' => 'PlayerController@joinGame',
        'as' => 'join-game'
    ]);
    
    
    

    
    //Make sure this stays last as otherwise following route URLs will be treated as game hashes.
    Route::get('/{gameHash?}', [
        'uses' => 'GameController@findGame',
        'as' => 'find-game'
    ]);


