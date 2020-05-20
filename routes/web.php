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





Route::get('/play', function () {
    return view('pages.game');
})->name("pages.game");

Route::get('/new-game', function () {
    return view('pages.new-game');
})->name("pages.new-game");

Route::get('/{gameID?}', [
    'uses' => 'GameController@findGame',
    'as' => 'pages.find-game'
]);

