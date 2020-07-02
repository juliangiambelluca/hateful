<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePlayersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('players', function (Blueprint $table) {
            $table->increments('id');
            $table->timestamps();
            $table->string('fullname');	
            $table->integer('score')->default(0);
            $table->string('session', 64);	
            $table->boolean('connected');
            $table->boolean('ismaster');
            $table->boolean('ishost');
            $table->string('state')->nullable();;
            $table->integer('game_id');	

        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('players');
    }
}
