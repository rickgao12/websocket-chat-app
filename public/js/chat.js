const socket = io();

const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $locationButton = document.querySelector('#location-button');
const $messages = document.querySelector('#messages');

const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

const { username, room } = Qs.parse(location.search, {
	ignoreQueryPrefix: true
});

const autoscroll = () => {
	const $newMessage = $messages.lastElementChild;
	const newMessageStyles = getComputedStyle($newMessage);
	const newMessageMargin = parseInt(newMessageStyles.marginBottom);
	const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

	const visibleHeight = $messages.offsetHeight;
	const containerHeight = $messages.scrollHeight;
	const scrollOffset = $messages.scrollTop + visibleHeight;

	if (containerHeight - newMessageHeight <= scrollOffset) {
		$messages.scrollTop = $messages.scrollHeight;
	}
};

socket.on('message', (message) => {
	const html = Mustache.render(messageTemplate, {
		username: message.username,
		message: message.text,
		createdAt: moment(message.createdAt).format('h:mm a')
	});
	$messages.insertAdjacentHTML('beforeend', html);
	autoscroll();
});

socket.on('locationMessage', (locationMsg) => {
	const html = Mustache.render(locationTemplate, {
		username: locationMsg.username,
		url: locationMsg.url,
		createdAt: moment(locationMsg.createdAt).format('h:mm a')
	});
	$messages.insertAdjacentHTML('beforeend', html);
	autoscroll();
});

$messageForm.addEventListener('submit', (e) => {
	e.preventDefault();
	$messageFormButton.setAttribute('disabled', 'disabled');
	const search = e.target.elements.message.value;

	socket.emit('sendMessage', search, (error) => {
		$messageFormButton.removeAttribute('disabled');
		$messageFormInput.value = '';
		$messageFormInput.focus();
		if (error) {
			return console.log(error);
		}
		console.log('message delivered');
	});
});

$locationButton.addEventListener('click', (e) => {
	$locationButton.setAttribute('disabled', 'disabled');
	if (!navigator.geolocation) {
		return alert('Geolocation not supported');
	}

	navigator.geolocation.getCurrentPosition((position) => {
		socket.emit(
			'SendLocation',
			{
				longitude: position.coords.latitude,
				latitude: position.coords.longitude
			},
			() => {
				$locationButton.removeAttribute('disabled');
				console.log('location delivered');
			}
		);
	});
});

socket.emit('join', { username, room }, (error) => {
	if (error) {
		alert(error);
		location.href = '/';
	}
});

socket.on('roomData', ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, {
		room,
		users
	});
	document.querySelector('#sidebar').innerHTML = html;
});
