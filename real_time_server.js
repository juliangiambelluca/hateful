var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
	res.send('<h1>Hello world</h1>');
});

http.listen(3000, () => {
	console.log('listening on *:3000');
});



let notify = io.on('connection', (socket) => {
  console.log('a user connected');

    //join users own 'room'
    socket.on('join', function (lobby_id) {


    	console.log('user joining ' + lobby_id)

        socket.join(lobby_id);

        
        var joinMsg = `User joined lobby:` +lobby_id;
        io.emit('user_join', joinMsg);
    });

});
