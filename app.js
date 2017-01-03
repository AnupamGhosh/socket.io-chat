//var fs = require('fs');
//
//var options = {
//	key : fs.readFileSync('/var/www/vhosts/test.cozeva.com/ssl/test.cozeva.com.key'),
//	cert : fs.readFileSync('/var/www/vhosts/test.cozeva.com/ssl/test.cozeva.com.crt'),
//	ca : fs.readFileSync('/var/www/vhosts/test.cozeva.com/ssl/DigiCertCA.crt')
//};
//
//var express = require('express');
//var app = express();
//var http = require('https').createServer(options, app);
'use strict'

class User {
	constructor(id, socket, name) {
		this.id = id.substring(2); // removes `/#` prefix
		this.name = name;
		this.socket = socket;
		this.rooms = [];
	}

	toString() {
		return `id=${this.id} name=${this.name} rooms=${JSON.stringify(this.rooms)}`
	}
}

const express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

http.listen(3000, function() {
	console.log('listening on port: 3000');
});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});
app.use(express.static('public'));

var userNames = {};
io.on('connection', function(socket) {
	var user = new User(socket.id, socket, 'Guest');

	socket.on('chatMessageServer', function(data) {
		io.to(data.room).emit('chatMessageClient', data);
	});

	socket.on('user reg', function(data, callback) {
		user.name = data.name;
		userNames[user.id] = user;
		socket.join('default');
		callback(user.id);
		io.emit('users online', onlineUsers());
	});

	socket.on('userToUserServer', function(userID, callback) { // id of other user
		var room = createRoom([
			userNames[user.id],
			userNames[userID]
		]);
		socket.broadcast.to(room).emit('userToUserClient', {
			userID: user.id,
			room: room
		});
		callback(room);
	});

	socket.on('createRoom', function(buddy, callback) {
		var users = [];
		buddy.forEach(function(id) {
			users.push(userNames[id]);
		});
		var room = createRoom(users);
		callback(room);
	});

	socket.on('disconnect', function() {
		user.rooms.forEach(function(room) {
			socket.leave(room);
		});
		delete userNames[user.id];
		io.emit('users online', onlineUsers());
	});

	function onlineUsers() {
		var users = []
		for (var id in userNames) {
			let user = userNames[id];
			users.push({
				id: user.id,
				name: user.name
			});
		}
		return users;
	}

	function createRoom(users) {
		var names = '';
		for (var user of users) {
			names += user.name;
		}
		const hash = require('crypto')
			.createHash('md5').update(names).digest('hex');

		for (var user of users) {
			user.socket.join(hash);
			// io.to(hash).emit('newUserJoined', {id: user.id, room: hash});
			user.rooms.push(hash);
		}
		return hash;
		// io.to(hash).emit('newUserJoined', {id: users[0].id, room: hash});
	}
});
