const socket = io();

// DOM elements
const messages = document.getElementById("messages");
const usersList = document.getElementById("users");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const setNameBtn = document.getElementById("setNameBtn");
const modPanelBtn = document.getElementById("modPanelBtn");
const modPanel = document.getElementById("modPanel");
const grantInput = document.getElementById("grantInput");
const grantBtn = document.getElementById("grantBtn");
const banInput = document.getElementById("banInput");
const banBtn = document.getElementById("banBtn");

// Send message
sendBtn.onclick = () => {
  if (input.value.trim()) {
    socket.emit("chat-message", { text: input.value });
    input.value = "";
  }
};

// Change name
setNameBtn.onclick = () => {
  if (nameInput.value.trim()) {
    socket.emit("set-name", nameInput.value);
    nameInput.value = "";
  }
};

// Grant mod
grantBtn.onclick = () => {
  if (grantInput.value.trim()) {
    socket.emit("grant-mod", grantInput.value);
    grantInput.value = "";
  }
};

// Ban user
banBtn.onclick = () => {
  if (banInput.value.trim()) {
    socket.emit("ban-user", banInput.value);
    banInput.value = "";
  }
};

// Receive messages
socket.on("chat-message", (msg) => {
  const li = document.createElement("li");
  li.innerHTML = `<strong>[${msg.name}]</strong>: ${msg.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// System messages
socket.on("system", (msg) => {
  const li = document.createElement("li");
  li.className = "system";
  li.textContent = msg.text;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// User list
socket.on("userlist", (list) => {
  usersList.innerHTML = "";
  list.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = `${u.name} (${u.id})${u.role === "MOD" ? " [MOD]" : ""}`;
    usersList.appendChild(li);
  });
});

// Become mod
socket.on("mod-granted", () => {
  modPanelBtn.style.display = "inline-block";
});

// Toggle mod panel
modPanelBtn.onclick = () => {
  modPanel.style.display =
    modPanel.style.display === "none" ? "block" : "none";
};

// Banned
socket.on("banned", () => {
  alert("You have been banned!");
  document.body.innerHTML = "<h1>BANNED</h1>";
});
