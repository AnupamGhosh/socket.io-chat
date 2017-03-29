'use strict'

class ChatData {
	constructor(room, owner, message) {
		this.room = room;
		this.time = new Date().getTime();
		this.owner = owner; // chat author
		this.message = message
	}
	toString() {
		return `room=${this.room} by=${this.owner} message=${this.message}`
	}
}
class User {
	constructor(id, socket, name) {
		this.id = id;
		this.name = name;
		this.socket = socket;
		this.rooms = [];
		this.buddies = {};
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

var publicRoom = {
	id	: 'public-room',
	name: 'Public Room',
	room: 'default',
};
var userNames = {}
var chatHistory = {}
io.on('connection', function(socket) {
	var user = new User(socket.id.substring(2), socket, 'Guest'); // removes `/#` prefix
	socket.emit('init', {
		publicRoom: publicRoom
	});
	socket.join(publicRoom.room);
	user.rooms.push(publicRoom.room);

	chatHistory[publicRoom.room] = [];
	user.buddies[publicRoom.id] = publicRoom.room;

	socket.on('chatMessageServer', function(data) {
		if (!data || !io.sockets.adapter.rooms[data.room]) {
			console.log('Invalid data')
			return;
		}
		chatHistory[data.room].push(new ChatData(data.room, data.id, data.msg)); // save message
		io.to(data.room).emit('chatMessageClient', data);
	});

	// After user registration
	socket.on('user reg', function(data, callback) {
		user.name = data.name; // user who registered
		for (var id in userNames) {
			var buddy = userNames[id];
			let room = createRoom([user, buddy]);
			chatHistory[room] = [];
			user.buddies[buddy.id] = room;
			buddy.buddies[user.id] = room;
			buddy.socket.emit('addUserOnline', {
				id: user.id,
				name: user.name,
				room: room
			});
		}
		userNames[user.id] = user;

		callback({
			id: user.id,
			buddies: user.buddies,
			name: user.name,
			onlineUsers: onlineUsers()
		});
	});

	socket.on('createGroup', function(buddies, callback) {
		var users = [];
		buddies.forEach(function(id) {
			users.push(userNames[id]);
		});
		var room = createRoom(users);
		for (var user of users) {
			user.buddies[room] = room;
		}

		var names = '';
		for (var user of users) {
			names += user.name + ', ';
		}
		names = names.substring(0, names.length - 2); // removes last comma

		userNames[room] = new User(room, socket, names); // socket irrelevent
		userNames[room].buddies[room] = room;
		chatHistory[room] = [];
		io.to(room).emit('addUserOnline', {
			id: room,
			room: room,
			name: names
		});
		callback();
	});

	socket.on('disconnect', function() {
		// user.rooms.forEach(function(room) {
		// 	socket.leave(room);
		// });
		delete userNames[user.id];
		io.emit('users online', onlineUsers());
	});

	function onlineUsers() {
		var users = []
		for (var id in userNames) {
			let user = userNames[id];
			users.push({
				id: user.id,
				name: user.name,
				buddies: user.buddies
			});
		}

		users.push({
			id: publicRoom.id,
			name: publicRoom.name,
			buddies: {[publicRoom.id]: publicRoom.room}
		});

		return users;
	}

	function createRoom(users) {
		var names = '';
		for (var user of users) {
			names += user.name;
		}
		const room = require('crypto')
			.createHash('md5').update(names).digest('hex');

		for (var user of users) {
			user.socket.join(room);
			user.rooms.push(room);
		}
		return room;
	}
});
