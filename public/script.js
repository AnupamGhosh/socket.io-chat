'use strict';

function User(id, name, socket, buddies) {
	this.id = id;
	this.name = name;
	this.socket = socket;
	this.buddies = buddies; // room nos
}
User.prototype.sendChatMsg = function (msg, room) {
	this.socket.emit('chatMessageServer', {
		id  : this.id,
		name: this.name,
		msg : msg,
		room: room
	});
};

$(function() {
	var socket = io();
	var lastID = null;
	var rooms = {}; // stores chat msg for all rooms
	var user = null; // this user
	var curRoom = null;
	var publicRoom = null;

	socket.on('init', function(data) {
		publicRoom = data.publicRoom;
		curRoom = publicRoom.room;
		rooms[publicRoom.room] = [];
	});

	socket.on('chatMessageClient', function(data) {
		var room = data.room;
		rooms[room].push(data);
		if ($('#'+data.room+'-chat-form').length > 0) { // if msg is sent from curRoom
			renderSingleMsg(data);
		} else {
			$('#'+data.room + ' .fa-envelope').removeClass('invisible');
		}
	});

	socket.on('users online', function(users) {
		if (!user) return; // will be removed later

		showOnlineList(users);
	});

	socket.on('addUserOnline', function(newUser) {
		user.buddies[newUser.id] = newUser.room;
		addUserToOnlineList(newUser.id, newUser.room, newUser.name);
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
		}, function(data) {
			user = new User(data.id, name, socket, data.buddies);
			showOnlineList(data.onlineUsers);
			console.log('personID='+data.id);
		});
		return false;
	});

	function openChatWindow(room) {
		curRoom = room;
		$('.messages')
		.empty()
		.attr('id', room+'-chat-form');

		//loads chat messages
		lastID = null;
		$.each(rooms[room], function() {
			renderSingleMsg(this);
		});
	}

	function renderSingleMsg(data) {
		var $id = $('#'+data.room+'-chat-form');
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

	function showOnlineList(users) {
		$('#users').empty();
		$(users).each(function() {
			var userID = this.id;
			if (user.id == userID) {
				user.buddies = this.buddies;
				return true; // continue statement
			}

			addUserToOnlineList(userID, user.buddies[userID], this.name);
		});
	}

	function addUserToOnlineList(userID, room, name) {
		if (!rooms[room]) {
			rooms[room] = [];
		}
		$('#users').append(
			$('<li id="'+room+'" class="list-group-item">\
				<label class="form-check-inline invisible">\
					<input class="form-check-input" type="checkbox" value="'+userID+'">\
				</label>'
				+ name +
				'<i class="fa fa-envelope pull-right invisible"></i>\
			 </li>')
			.click(function() {
				$(this).find('.fa-envelope').addClass('invisible'); // hides fa-envelope
				openChatWindow(room);
			})
		);
	}

	$("#add-users").click(function() { // .fa-user-plus
		$('#users .form-check-inline').removeClass('invisible');
		$(this).prop('hidden', true);
		$('#create-room').prop('hidden', false);
	});

	$('#create-room').click(function() {
		var buddies = [user.id];
		$("#users :checkbox:checked").each(function() {
			buddies.push($(this).val());
		});
		if (buddies.length == 1) {
			showAlert('Select atleast 1 person');
			return;
		}
		socket.emit('createGroup', buddies, function() {
			$("#add-users").prop('hidden', false);
			$('#create-room').prop('hidden', true);
			$('#users .form-check-inline').addClass('invisible');
		});
	});

	function showAlert(msg) {
		$('#chat-box').prepend(
			'<div class="alert alert-danger alert-dismissible show" role="alert">\
  				<button type="button" class="close" data-dismiss="alert" aria-label="Close">\
    				<span aria-hidden="true">&times;</span>\
  				</button>'
  				+ msg +
			'</div>'
		);
	}
});
