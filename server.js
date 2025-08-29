// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// keep a map of socket.id -> name
const users = new Map();
const modRequests = [];

function buildUserList() {
  return Array.from(users.values());
}

// --- Slur Censor ---
function censor(text) {
  if (!text) return text;
  const banned = ["Bitch", "Cock", "Shit"]; // add real slurs/bad words
  let clean = text;
  banned.forEach(word => {
    const regex = new RegExp(word, "gi");
    clean = clean.replace(regex, match => {
      return match[0] + "*".repeat(match.length - 1);
    });
  });
  return clean;
}

io.on('connection', (socket) => {
  // default name
  users.set(socket.id, 'Guest_' + socket.id.slice(0,5));
  io.emit('userlist', buildUserList());

  // announce join
  io.emit('system', {
    text: `${users.get(socket.id)} joined the chat.`,
    time: Date.now()
  });

  // name change
  socket.on('set-name', (newName) => {
    if (typeof newName !== 'string') return;
    const safe = newName.trim().slice(0, 40) || ('Guest_' + socket.id.slice(0,5));
    users.set(socket.id, safe);
    io.emit('userlist', buildUserList());
    io.emit('system', {
      text: `${safe} changed their name.`,
      time: Date.now()
    });
  });

  // chat messages
  socket.on('chat-message', (msg) => {
    const payload = {
      id: socket.id,
      name: users.get(socket.id) || 'Guest',
      text: censor(typeof msg.text === 'string' ? msg.text.slice(0,2000) : ''),
      img: typeof msg.img === 'string' ? msg.img : null,
      time: Date.now()
    };
    io.emit('chat-message', payload);
  });

  // moderation signup
  socket.on("mod-signup", (name) => {
    modRequests.push({ id: socket.id, name, time: Date.now() });
    io.emit("system", { text: `${name} applied for Moderator!`, time: Date.now() });
  });

  // disconnect
  socket.on('disconnect', () => {
    const name = users.get(socket.id) || 'Guest';
    users.delete(socket.id);
    io.emit('userlist', buildUserList());
    io.emit('system', {
      text: `${name} left the chat.`,
      time: Date.now()
    });
  });
});

http.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
