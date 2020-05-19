<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Answer extends Model
{
    public function rounds(){
        return $this->belongsToMany('App\Round')->withTimestamps();
    }
    public function questions(){
        return $this->belongsToMany('App\Question')->withTimestamps();
    }   
    public function player(){
        return $this->belongsTo('App\Player');
    }
}
