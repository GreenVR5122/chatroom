const socket = io();

const messages = document.getElementById("messages");
const users = document.getElementById("users");

// Request notifications
if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

// Add message
function addMessage(msg) {
  const div = document.createElement("div");
  div.textContent = `[${new Date(msg.time).toLocaleTimeString()}] ${msg.name}: ${msg.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// send chat message
function sendMessage() {
  const msg = document.getElementById("msg").value;
  socket.emit("chat-message", { text: msg });
  document.getElementById("msg").value = "";
}

// set name
function setName() {
  const newName = document.getElementById("newName").value;
  socket.emit("set-name", newName);
}

// request mod
function requestMod() {
  const name = document.getElementById("modName").value;
  socket.emit("mod-signup", name);
}

// socket listeners
socket.on("chat-message", (msg) => {
  addMessage(msg);
  if (Notification.permission === "granted") {
    new Notification(`${msg.name}`, { body: msg.text || "[Image]" });
  }
});

socket.on("system", (msg) => addMessage({ ...msg, name: "SYSTEM" }));
socket.on("userlist", (list) => {
  users.innerHTML = "";
  list.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    users.appendChild(li);
  });
});

// --- Update Log ---
const updates = [
  "✅ Added slur censor",
  "✅ Added browser notifications",
  "✅ Added moderator sign-ups",
  "✅ Added update log"
];
const log = document.getElementById("updates");
updates.forEach(update => {
  const li = document.createElement("li");
  li.textContent = update;
  log.appendChild(li);
});
