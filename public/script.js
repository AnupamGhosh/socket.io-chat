'use strict';

function User(id, name) {
	this.id = id;
	this.name = name;
	this.buddy = {};
}
User.prototype.sendChatMsg = function (msg, room) {
	socket.emit('chatMessageServer', {
		id  : this.id,
		name: this.name,
		msg : msg,
		room: room
	});
};
User.prototype.userToUser = function(userID) { // create channel for user to user chat
	var user = this;
	if (!user.buddy[userID]) {
		socket.emit('userToUserServer', userID, function(room) {
			rooms[room] = [];
			user.buddy[userID] = room;
			user.openChatWindow(room);
		});
	} else {
		user.openChatWindow(user.buddy[userID]);
	}
};

var socket = io();
var lastID = null;
var rooms = {default: []}; // stores chat msg for all rooms
var user = null;
var publicRoom = {
	id: 'public-room',
	name: 'Public Room',
	room: 'default',
};
var curRoom = publicRoom.room;

$(function() {
	socket.on('chatMessageClient', function(data) {
		var room = data.room;
		rooms[room].push(data);
		renderSingleMsg(data);
	});

	socket.on('users online', function(users) {
		users.push({
			id: publicRoom.id,
			name: publicRoom.name
		});
		$('#users').empty();
		$(users).each(function() {
			var userID = this.id;
			if (user && user.id == userID) return true;
			$('#users').append(
				$('<li id="'+userID+'" class="list-group-item">' + this.name + '</li>')
				.click(function() {
					if (user) {
						user.userToUser(userID);
					}
				})
			);
		});
	});

	// event after createRoom emit
	// socket.on('newUserJoined', function(data) {
	// 	rooms[data.room] = [];
	// 	onlineUsers[data.id].room = data.room;
	// });
	socket.on('userToUserClient', function(data) {
		rooms[data.room] = [];
		user.buddy[data.userID] = data.room;
	});

	$('#name').submit(function(event) { // submits user name
		$('#name').parent().load('chat-form.html', function() {
			openChatWindow(publicRoom.room);
			$('#chat-box')
			.submit(function() { // submits message
				user.sendChatMsg($('#message').val(), curRoom);
				$('#message').val('');
				return false;
			});
		});
		var name = $('#username').val();
		socket.emit('user reg', {
			name: name,
		}, function(id) {
			user = new User(id, name);
			user.buddy[publicRoom.id] = publicRoom.room
			console.log('personID=' + id);
		});
		return false;
	});

	function openChatWindow(room) {
		curRoom = room;
		$('.messages')
		.empty()
		.attr('id', room);

		//loads chat messages
		lastID = null;
		$.each(rooms[room], function() {
			renderSingleMsg(this);
		});
	}

	function renderSingleMsg(data) {
		var $id = $('#' + data.room);
		var outline = 'primary';
		var tag = 'primary';
		if (data.id == user.id) {
			outline = 'secondary';
			tag = 'default';
		}
		if (lastID != data.id) {
			$id.append(
				'<li class="list-group-item '+outline+'">\
					<div class="tag tag-pill tag-'+tag+'">' + data.name + '</div>\
				</li>'
			);
		}
		$id.children('li').last().append('<div class="message">' + data.msg + '</div>');
		lastID = data.id;
	}

	User.prototype.openChatWindow = openChatWindow;
});
