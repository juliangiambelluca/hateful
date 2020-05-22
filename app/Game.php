<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    protected $fillable = ['password', 'hash', 'started'];

    //
    public function players(){
        return $this->hasMany('App\Player');
    }
    public function rounds(){
        return $this->hasMany('App\Round');
    }


    public function newPassword(){
        return substr(str_shuffle(md5(rand())), 0, 7);
    }

    public function newHash(){
        do {
            //create a random 8 character id
            $hash = substr(str_shuffle(md5(rand())), 0, 7);
            //make no other game in the database has it.
            $game = Game::where('hash', '=', $hash)->first(); 
        } while (!(isset($game->id)));
        return $hash;
    }

}
