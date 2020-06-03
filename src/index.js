const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const { generateMsg, generateLocationMsg } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');
const Filter = require('bad-words');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
	console.log('New websocket connection');

	socket.on('join', ({ username, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, username, room });

		if (error) {
			return callback(error);
		}

		socket.join(user.room);
		socket.emit('message', generateMsg('System', 'Welcome'));
		socket.broadcast.to(user.room).emit('message', generateMsg(`${user.username} has joined the room!`));
		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room)
		});

		callback();
	});

	socket.on('sendMessage', (newmsg, callback) => {
		const user = getUser(socket.id);
		const filter = new Filter();

		if (filter.isProfane(newmsg)) {
			return callback('Profanity is not allowed');
		}
		io.to(user.room).emit('message', generateMsg(user.username, newmsg));
		callback();
	});

	socket.on('SendLocation', (coords, callback) => {
		const user = getUser(socket.id);
		io
			.to(user.room)
			.emit(
				'locationMessage',
				generateLocationMsg(user.username, `https://google.com/maps?q=${coords.longitude},${coords.latitude}`)
			);
		callback();
	});

	socket.on('disconnect', () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit('message', generateMsg(`${user.username} has disconnected`));
			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room)
			});
		}
	});
});

server.listen(port, () => {
	console.log(`Server up on port ${port}`);
});
