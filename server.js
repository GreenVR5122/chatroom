// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

// Serve frontend files
app.use(express.static("public"));

// keep a map of socket.id -> name
const users = new Map();
const mods = new Set(); // keep track of moderators

function buildUserList() {
  return Array.from(users.entries()).map(([id, name]) => ({
    id,
    name,
    role: mods.has(id) ? "MOD" : "USER",
  }));
}

io.on("connection", (socket) => {
  // default name
  users.set(socket.id, "Guest_" + socket.id.slice(0, 5));
  io.emit("userlist", buildUserList());

  io.emit("system", {
    text: `${users.get(socket.id)} joined the chat.`,
    time: Date.now(),
  });

  // handle name change
  socket.on("set-name", (newName) => {
    if (typeof newName !== "string") return;
    const safe =
      newName.trim().slice(0, 40) || "Guest_" + socket.id.slice(0, 5);
    users.set(socket.id, safe);
    io.emit("userlist", buildUserList());
    io.emit("system", {
      text: `${safe} changed their name.`,
      time: Date.now(),
    });
  });

  // moderation grant
  socket.on("grant-mod", (userId) => {
    if (!users.has(userId)) return;
    mods.add(userId);
    io.to(userId).emit("mod-granted");
    io.emit("system", {
      text: `${users.get(userId)} is now a moderator.`,
      time: Date.now(),
    });
    io.emit("userlist", buildUserList());
  });

  // ban user
  socket.on("ban-user", (userId) => {
    if (!mods.has(socket.id)) return; // only mods can ban
    if (users.has(userId)) {
      const name = users.get(userId);
      io.to(userId).emit("banned");
      io.sockets.sockets.get(userId)?.disconnect(true);
      users.delete(userId);
      io.emit("system", { text: `${name} was banned.`, time: Date.now() });
      io.emit("userlist", buildUserList());
    }
  });

  // messages
  socket.on("chat-message", (msg) => {
    const payload = {
      id: socket.id,
      name: users.get(socket.id) || "Guest",
      text:
        typeof msg.text === "string" ? msg.text.slice(0, 2000) : "",
      time: Date.now(),
    };
    io.emit("chat-message", payload);
  });

  socket.on("disconnect", () => {
    const name = users.get(socket.id) || "Guest";
    users.delete(socket.id);
    mods.delete(socket.id);
    io.emit("userlist", buildUserList());
    io.emit("system", {
      text: `${name} left the chat.`,
      time: Date.now(),
    });
  });
});

http.listen(PORT, () => {
  console.log(`✅ Chat server running on http://localhost:${PORT}`);
});
