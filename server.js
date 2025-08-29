// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const users = new Map();

// --- Slur + Cuss Censor ---
function censor(text) {
  if (!text) return text;

  const banned = [
    "fuck","shit","bitch","asshole","bastard","cunt","dick","pussy","slut","whore",
    "nigger","faggot","retard","chink","spic","kike","tranny","dyke","cock","penis",
    "vagina","cum","jizz","blowjob","handjob","dildo","anal","rape","molest","sex",
    "motherfucker","goddamn","bollocks","bugger","twat","wanker","prick","arse",
    "jerkoff","tits","boobs","boob","fap","nut","nutting","orgasm","boner","hentai"
  ];

  let clean = text;
  banned.forEach(word => {
    const regex = new RegExp(word, "gi");
    clean = clean.replace(regex, match => {
      return match[0] + "*".repeat(match.length - 1);
    });
  });
  return clean;
}

function buildUserList() {
  return Array.from(users.values());
}

io.on('connection', (socket) => {
  users.set(socket.id, 'Guest_' + socket.id.slice(0,5));
  io.emit('userlist', buildUserList());

  io.emit('system', {
    text: `${users.get(socket.id)} joined the chat.`,
    time: Date.now()
  });

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
