// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// ====== CONFIGURE ROLES ======
const OWNER_NAME = "GreenVR";                  // <— YOU (Owner)
const ADMIN_NAMES = new Set(["AdminOne"]);     // Add any fixed admins here (optional)
// =============================

/**
 * users: Map<socketId, {
 *   uid: string,          // short stable display id (from socketId)
 *   name: string,
 *   role: "OWNER"|"ADMIN"|"MOD"|"USER",
 *   pfp: string|null,     // data URL
 *   muted: boolean
 * }>
 */
const users = new Map();

// only ONE mod slot (grantable)
let grantedModSocketId = null;

// banned set by socketId (demo level)
const bannedSockets = new Set();

const genUid = (sid) => sid.slice(0, 5);

// helper
const isStaff = (role) => ["OWNER", "ADMIN", "MOD"].includes(role);
const isOwnerOrAdmin = (role) => ["OWNER", "ADMIN"].includes(role);

function computeRole(name) {
  if (name === OWNER_NAME) return "OWNER";
  if (ADMIN_NAMES.has(name)) return "ADMIN";
  return "USER";
}

function userRole(socketId) {
  const u = users.get(socketId);
  return u ? u.role : "USER";
}

function buildUserList() {
  return Array.from(users.entries()).map(([sid, u]) => ({
    sid,
    uid: u.uid,
    name: u.name,
    role: u.role,
    muted: u.muted
  }));
}

io.on("connection", (socket) => {
  if (bannedSockets.has(socket.id)) {
    socket.emit("system", { text: "You are banned from this server." });
    return socket.disconnect(true);
  }

  const uid = genUid(socket.id);
  let defaultName = "Guest_" + uid;
  const role = computeRole(defaultName); // default (will update when user sets name)

  users.set(socket.id, {
    uid,
    name: defaultName,
    role,
    pfp: null,
    muted: false
  });

  io.emit("userlist", buildUserList());
  io.emit("system", { text: `${defaultName} joined the chat.` });

  // name change
  socket.on("set-name", (newNameRaw) => {
    if (typeof newNameRaw !== "string") return;
    const newName = newNameRaw.trim().slice(0, 40) || ("Guest_" + uid);

    const user = users.get(socket.id);
    if (!user) return;

    // if user chooses OWNER_NAME or an ADMIN name, auto-assign role
    user.name = newName;
    user.role = computeRole(newName);

    // Keep MOD if this is the granted mod and they rename
    if (grantedModSocketId === socket.id && user.role === "USER") {
      user.role = "MOD";
    }

    io.emit("userlist", buildUserList());
    io.emit("system", { text: `${user.name} changed their name.` });

    // Tell client their own role (to toggle UI)
    socket.emit("you-are", { role: user.role, uid: user.uid, sid: socket.id });
  });

  // send PFP
  socket.on("set-pfp", (dataUrl) => {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) return;
    const u = users.get(socket.id);
    if (!u) return;
    u.pfp = dataUrl;
    io.emit("userlist", buildUserList());
  });

  // receive chat message
  socket.on("chat-message", (msg) => {
    const u = users.get(socket.id);
    if (!u) return;
    if (u.muted) return socket.emit("system", { text: "You are muted." });
    const text = (typeof msg?.text === "string" ? msg.text : "").slice(0, 2000);
    const image = (typeof msg?.img === "string" && msg.img.startsWith("data:image")) ? msg.img : null;

    const messageId = `${Date.now()}_${socket.id.slice(-6)}`;
    io.emit("chat-message", {
      messageId,
      sid: socket.id,
      uid: u.uid,
      name: u.name,
      role: u.role,
      pfp: u.pfp,
      text,
      img: image,
      time: Date.now()
    });
  });

  // ====== MODERATION SOCKET EVENTS ======

  // Grant/Revoke MOD (Owner/Admin only), only ONE mod at a time
  socket.on("grant-mod", (targetSid) => {
    const me = users.get(socket.id);
    if (!me || !isOwnerOrAdmin(me.role)) return;

    if (!users.has(targetSid)) return;

    if (grantedModSocketId && grantedModSocketId !== targetSid) {
      // revoke existing mod first
      const old = users.get(grantedModSocketId);
      if (old) old.role = computeRole(old.name); // revert to USER or ADMIN/OWNER if named
      io.to(grantedModSocketId).emit("system", { text: "Your MOD privileges were revoked." });
    }

    grantedModSocketId = targetSid;
    const target = users.get(targetSid);
    if (target) {
      target.role = "MOD";
      io.emit("system", { text: `${target.name} is now a MOD.` });
      io.emit("userlist", buildUserList());
      io.to(targetSid).emit("you-are", { role: target.role, uid: target.uid, sid: targetSid });
    }
  });

  socket.on("revoke-mod", (targetSid) => {
    const me = users.get(socket.id);
    if (!me || !isOwnerOrAdmin(me.role)) return;

    if (grantedModSocketId !== targetSid) return;
    const target = users.get(targetSid);
    if (!target) return;

    target.role = computeRole(target.name); // back to USER/ADMIN/OWNER if name matches
    grantedModSocketId = null;
    io.to(targetSid).emit("system", { text: "Your MOD privileges were revoked." });
    io.emit("system", { text: `${target.name} is no longer a MOD.` });
    io.emit("userlist", buildUserList());
    io.to(targetSid).emit("you-are", { role: target.role, uid: target.uid, sid: targetSid });
  });

  // Delete message (any staff)
  socket.on("delete-message", (messageId) => {
    const me = users.get(socket.id);
    if (!me || !isStaff(me.role)) return;
    io.emit("delete-message", messageId);
  });

  // Mute/Unmute user (staff)
  socket.on("mute-user", (targetSid) => {
    const me = users.get(socket.id);
    if (!me || !isStaff(me.role)) return;
    const t = users.get(targetSid);
    if (!t) return;
    t.muted = true;
    io.to(targetSid).emit("system", { text: "You have been muted." });
    io.emit("system", { text: `${t.name} has been muted.` });
    io.emit("userlist", buildUserList());
  });

  socket.on("unmute-user", (targetSid) => {
    const me = users.get(socket.id);
    if (!me || !isStaff(me.role)) return;
    const t = users.get(targetSid);
    if (!t) return;
    t.muted = false;
    io.to(targetSid).emit("system", { text: "You have been unmuted." });
    io.emit("system", { text: `${t.name} has been unmuted.` });
    io.emit("userlist", buildUserList());
  });

  // Kick (staff)
  socket.on("kick-user", (targetSid) => {
    const me = users.get(socket.id);
    if (!me || !isStaff(me.role)) return;
    if (!users.has(targetSid)) return;
    io.to(targetSid).emit("kicked");
    io.sockets.sockets.get(targetSid)?.disconnect(true);
  });

  // Ban (Owner/Admin only)
  socket.on("ban-user", (targetSid) => {
    const me = users.get(socket.id);
    if (!me || !isOwnerOrAdmin(me.role)) return;
    if (!users.has(targetSid)) return;
    bannedSockets.add(targetSid);
    io.to(targetSid).emit("banned");
    io.sockets.sockets.get(targetSid)?.disconnect(true);
    io.emit("system", { text: `A user was banned.` });
  });

  // tell a client who they are (useful after initial connect)
  socket.emit("you-are", { role: users.get(socket.id).role, uid, sid: socket.id });

  socket.on("disconnect", () => {
    const u = users.get(socket.id);
    if (!u) return;
    if (grantedModSocketId === socket.id) grantedModSocketId = null;
    users.delete(socket.id);
    io.emit("userlist", buildUserList());
    io.emit("system", { text: `${u.name} left the chat.` });
  });
});

http.listen(PORT, () => {
  console.log(`✅ Chat server running on http://localhost:${PORT}`);
});
