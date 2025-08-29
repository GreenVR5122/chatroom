// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// store users and roles
const users = new Map(); // socket.id -> { name, role, pfp }
let grantedMod = null; // store one mod

function buildUserList() {
  return Array.from(users).map(([id, u]) => ({
    id,
    name: u.name,
    role: u.role,
    pfp: u.pfp
  }));
}

io.on('connection', (socket) => {
  // default user
  let username = 'Guest_' + socket.id.slice(0,5);
  let role = 'USER';
  let pfp = null;

  // owner check
  if (username === "Guest_" + socket.id.slice(0,5) && socket.handshake.query.owner === "true") {
    username = "GreenVR";
    role = "OWNER";
  }

  users.set(socket.id, { name: username, role, pfp });
  io.emit('userlist', buildUserList());

  io.emit('system', { text: `${username} joined the chat.`, time: Date.now() });

  // change name
  socket.on('set-name', (newName) => {
    if (typeof newName !== 'string') return;
    const safe = newName.trim().slice(0, 40);
    users.get(socket.id).name = safe;
    io.emit('userlist', buildUserList());
  });

  // set profile picture
  socket.on('set-pfp', (imgData) => {
    if (typeof imgData !== 'string') return;
    users.get(socket.id).pfp = imgData; // base64
    io.emit('userlist', buildUserList());
  });

  // grant mod (owner only)
  socket.on('grant-mod', (userId) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "OWNER") return;

    if (users.has(userId)) {
      grantedMod = userId;
      users.get(userId).role = "MOD";
      io.emit('system', { text: `${users.get(userId).name} is now a MOD.`, time: Date.now() });
      io.emit('userlist', buildUserList());
    }
  });

  // moderation actions
  socket.on('kick-user', (id) => {
    const user = users.get(socket.id);
    if (!user || (user.role !== "OWNER" && socket.id !== grantedMod)) return;

    if (users.has(id)) {
      io.to(id).emit('kicked');
      io.sockets.sockets.get(id)?.disconnect(true);
    }
  });

  // chat message
  socket.on('chat-message', (msg) => {
    const user = users.get(socket.id);
    if (!user) return;

    const payload = {
      id: socket.id,
      name: user.name,
      role: user.role,
      text: msg.text?.slice(0,2000) || '',
      pfp: user.pfp,
      time: Date.now()
    };
    io.emit('chat-message', payload);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;
    users.delete(socket.id);
    io.emit('userlist', buildUserList());
    io.emit('system', { text: `${user.name} left the chat.`, time: Date.now() });
  });
});

http.listen(PORT, () => {
  console.log(`✅ Chat server running on http://localhost:${PORT}`);
});
