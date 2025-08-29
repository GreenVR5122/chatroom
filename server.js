// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// --- BAD WORD FILTER ---
const badWords = ["fuck","shit","bitch","asshole","cunt","dick","pussy","nigger","nigga","faggot","retard","whore","slut","cock","bastard","damn"];
function censor(text) {
  let words = text.split(/\s+/);
  return words.map(w => {
    const lw = w.toLowerCase();
    if (badWords.includes(lw)) {
      return w[0] + "*".repeat(w.length - 1);
    }
    return w;
  }).join(" ");
}

// keep a map of socket.id -> name
const users = new Map();

function buildUserList() {
  return Array.from(users.values());
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

  socket.on('set-name', (newName) => {
    if (typeof newName !== 'string') return;
    const safe = censor(newName.trim().slice(0, 40)) || ('Guest_' + socket.id.slice(0,5));
    users.set(socket.id, safe);
    io.emit('userlist', buildUserList());
    io.emit('system', {
      text: `${safe} changed their name.`,
      time: Date.now()
    });
  });

  socket.on('chat-message', (msg) => {
    const payload = {
      id: socket.id,
      name: users.get(socket.id) || 'Guest',
      text: typeof msg.text === 'string' ? censor(msg.text.slice(0,2000)) : '',
      time: Date.now()
    };
    io.emit('chat-message', payload);
  });

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
