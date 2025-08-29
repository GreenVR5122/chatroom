// client.js
const socket = io();

// elements
const nameInput = document.getElementById('nameInput');
const saveNameBtn = document.getElementById('saveName');
const usersList = document.getElementById('usersList');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const imageInput = document.getElementById('imageInput');

// load name from localStorage
let myName = localStorage.getItem('chat_name') || ('Guest_' + Math.random().toString(36).slice(2,7));
nameInput.value = myName;
socket.emit('set-name', myName);

// helpers
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function addSystem(text, ts) {
  const el = document.createElement('div');
  el.className = 'system';
  el.textContent = `${text} — ${formatTime(ts)}`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}

function addMessage(data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message';

  const left = document.createElement('div');
  left.style.flex = '1';

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = data.name;
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = formatTime(data.time);
  meta.appendChild(time);

  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = data.text || '';

  left.appendChild(meta);
  left.appendChild(text);

  if (data.img) {
    const img = document.createElement('img');
    img.className = 'msg-img';
    img.src = data.img;
    img.alt = 'image';
    left.appendChild(img);
  }

  wrapper.appendChild(left);
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

// UI events
saveNameBtn.addEventListener('click', () => {
  const newName = nameInput.value.trim().slice(0,40) || ('Guest_' + Math.random().toString(36).slice(2,7));
  myName = newName;
  localStorage.setItem('chat_name', myName);
  socket.emit('set-name', myName);
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  const file = imageInput.files && imageInput.files[0];

  if (!text && !file) return;

  if (file) {
    // simple file size guard (client-side)
    if (file.size > 700 * 1024) {
      alert('Image too large. Please use images under ~700KB.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    socket.emit('chat-message', { text, img: dataUrl });
  } else {
    socket.emit('chat-message', { text });
  }

  messageInput.value = '';
  imageInput.value = '';
});

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// socket listeners
socket.on('chat-message', (data) => addMessage(data));
socket.on('system', (data) => addSystem(data.text, data.time));
socket.on('userlist', (list) => {
  usersList.innerHTML = '';
  list.forEach((n) => {
    const li = document.createElement('li');
    li.textContent = n;
    usersList.appendChild(li);
  });
});

// allow pressing Enter to send when message input focused
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit', {cancelable:true}));
  }
});
