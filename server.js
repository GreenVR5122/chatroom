// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// Serve public folder
app.use(express.static('public'));

// --- BAD WORD FILTER ---
const badWords = ["fuck","shit","bitch","asshole","cunt","dick","pussy","nigger","nigga","faggot","retard","whore","slut","cock","bastard","damn"];
function censor(text) {
  if (!text) return '';
  return text.split(/\s+/).map(w => {
    const lw = w.toLowerCase();
    if (badWords.includes(lw)) return w[0] + "*".repeat(w.length - 1);
    return w;
  }).join(" ");
}

// Keep users map: socket.id -> {name, pfp}
const users = new Map();

function buildUserList() {
  return Array.from(users.values()).map(u => u.name);
}

io.on('connection', (socket) => {
  // default name + pfp
  users.set(socket.id, { name: 'Guest_' + socket.id.slice(0,5), pfp: null });
  io.emit('userlist', buildUserList());

  io.emit('system', { text: `${users.get(socket.id).name} joined the chat.`, time: Date.now() });

  // set name
  socket.on('set-name', (newName) => {
    const safe = censor(newName.trim().slice(0,40)) || ('Guest_' + socket.id.slice(0,5));
    users.get(socket.id).name = safe;
    io.emit('userlist', buildUserList());
    io.emit('system', { text: `${safe} changed their name.`, time: Date.now() });
  });

  // set PFP
  socket.on('set-pfp', (pfp) => {
    if (typeof pfp === 'string' && pfp.startsWith('data:image')) {
      users.get(socket.id).pfp = pfp;
    }
  });

  // chat messages
  socket.on('chat-message', (msg) => {
    const user = users.get(socket.id);
    io.emit('chat-message', {
      id: socket.id,
      name: user.name,
      text: censor(msg.text),
      img: msg.img || null,
      pfp: user.pfp || null,
      time: Date.now()
    });
  });

  // disconnect
  socket.on('disconnect', () => {
    const name = users.get(socket.id)?.name || 'Guest';
    users.delete(socket.id);
    io.emit('userlist', buildUserList());
    io.emit('system', { text: `${name} left the chat.`, time: Date.now() });
  });
});

http.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
