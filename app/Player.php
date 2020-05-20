<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Player extends Model
{
    protected $fillable = ['fullname', 'score', 'game-id'];
    //
    public function game(){
        return $this->belongsTo('App\Game');
    }
    public function answers(){
        return $this->hasMany('App\Answers');
    }
}
