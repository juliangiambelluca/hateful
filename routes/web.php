<?php

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
    return view('pages.');
})->name("pages.game");

Route::get('/new-game', function () {
    return view('pages.enter-details');
})->name("new-game");

Route::get('/join-game', [
    'uses' => 'GameController@joinGame',
    'as' => 'join-game'
]);





//Make sure this stays last as otherwise following route URLs will be treated as game hashes.
Route::get('/{gameHash?}', [
    'uses' => 'GameController@findGame',
    'as' => 'find-game'
]);