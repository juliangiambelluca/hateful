<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateRoundAnswerTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('round_answer', function (Blueprint $table) {
            $table->increments('id');
            $table->timestamps();
            $table->integer('round_id');	
            $table->integer('answer_id')->nullable();
            $table->integer('player_roaster_id')->nullable();
            $table->integer('order')->nullable();
            $table->boolean('shortlisted')->nullable();
            $table->boolean('iswinner')->nullable();
            $table->integer('player_id');	
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('round_answer');
    }
}
