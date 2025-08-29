const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// Serve public folder
app.use(express.static('public'));

// --- Bad word filter ---
const badWords = ["fuck","shit","bitch","asshole","cunt","dick","pussy","nigger","nigga","faggot","retard","whore","slut","cock","bastard","damn"];
function censor(text) {
  if (!text) return '';
  return text.split(/\s+/).map(w => {
    const lw = w.toLowerCase();
    if (badWords.includes(lw)) return w[0] + "*".repeat(w.length - 1);
    return w;
  }).join(" ");
}

// Users map: socket.id -> {name, pfp, role}
const users = new Map();

// Roles map by username
const roles = {
  "GreenVR512": "OWNER",
  "ModUser": "MOD",
  "AdminUser": "ADMIN"
};

function buildUserList() {
  return Array.from(users.values()).map(u => u.name);
}

io.on('connection', (socket) => {
  let defaultName = 'Guest_' + socket.id.slice(0,5);
  let username = socket.handshake.query.username || defaultName;

  // Assign role
  let role = roles[username] || null;
  users.set(socket.id, { name: username, pfp: null, role });

  io.emit('userlist', buildUserList());
  io.emit('system', { text: `${username} joined the chat.`, time: Date.now() });

  socket.on('set-name', (newName) => {
    const safe = censor(newName.trim().slice(0,40)) || defaultName;
    users.get(socket.id).name = safe;
    io.emit('userlist', buildUserList());
    io.emit('system', { text: `${safe} changed their name.`, time: Date.now() });
  });

  socket.on('set-pfp', (pfp) => {
    if (typeof pfp === 'string' && pfp.startsWith('data:image')) {
      users.get(socket.id).pfp = pfp;
    }
  });

  socket.on('chat-message', (msg) => {
    const user = users.get(socket.id);
    io.emit('chat-message', {
      id: socket.id,
      name: user.name,
      role: user.role,
      text: censor(msg.text),
      img: msg.img || null,
      pfp: user.pfp || null,
      time: Date.now()
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    if(user) {
      io.emit('userlist', buildUserList());
      io.emit('system', { text: `${user.name} left the chat.`, time: Date.now() });
    }
  });
});

http.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
