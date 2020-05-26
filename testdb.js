const mysql = require('mysql');

var util = require('util');



const pool = mysql.createPool({
    connectionLimit : 100, //important
    host     : '127.0.0.1',
    database : 'hateful',
    user     : 'root',
    password : 'rrfKa-dd6-sCX7F',
    debug    :  false
});

async function mysqlSelect(select, from, where, equals) {
    let selectQuery = 'SELECT ?? FROM ?? WHERE ?? = ?';    
    let query = mysql.format(selectQuery,[select,from,where,equals]);
    return new Promise( (resolve) => {
        pool.query(query, (error, data) => {
            if(error) {
                console.error(error);
                return false;
            }
              resolve (data);
            });
        }); 
    } 


     (async () => {
        const result = await mysqlSelect("id", "players", "game_id", 9);
        console.log(result);
     })();







 function mysqlUpdate(update, set, setEquals, where, equals) {
    let selectQuery = 'UPDATE ?? SET ?? = ? WHERE ?? = ?';    
    let query = mysql.format(selectQuery,[update,set,setEquals,where,equals]);
    pool.query(query,(err, data) => {
        if(err) {
            console.error(err);
            return false;
        }
        // rows fetch
		console.log(data);
		return data;
    });
}