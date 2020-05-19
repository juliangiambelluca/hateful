<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    //
    public function round(){
        return $this->belongsTo('App\Round');
    }
    public function answers(){
        return $this->belongsToMany('App\Answer')->withTimestamps();
    }
}
