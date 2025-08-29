const socket = io();

const usersEl = document.getElementById('users');
const messagesEl = document.getElementById('messages');
const msgBox = document.getElementById('msgBox');
const sendBtn = document.getElementById('sendBtn');
const notifyEl = document.getElementById('notify');

// Name elements
const nameInput = document.getElementById('nameInput');
const setNameBtn = document.getElementById('setNameBtn');

// --- Dark/Light Mode Toggle ---
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
});

// --- Notifications ---
function notify(text) {
  notifyEl.innerText = text;
  notifyEl.style.display = "block";
  setTimeout(() => { notifyEl.style.display = "none"; }, 3000);
}

// --- Save / Load Name History ---
function saveName(name) {
  let history = JSON.parse(localStorage.getItem("nameHistory")) || [];
  if (!history.includes(name)) {
    history.push(name);
  }
  localStorage.setItem("nameHistory", JSON.stringify(history));
  localStorage.setItem("lastName", name);
}

function loadLastName() {
  return localStorage.getItem("lastName");
}

// --- Function to send message ---
function sendMessage() {
  if (msgBox.value.trim() !== "") {
    socket.emit('chat-message', { text: msgBox.value });
    msgBox.value = "";
  }
}

// --- Send button click ---
sendBtn.addEventListener('click', sendMessage);

// --- Press Enter key for message ---
msgBox.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// --- Set name ---
setNameBtn.addEventListener('click', () => {
  const newName = nameInput.value.trim();
  if (newName) {
    socket.emit("set-name", newName);
    saveName(newName);
    notify(`Name changed to ${newName}`);
  }
});

// Auto-load last used name
const lastName = loadLastName();
if (lastName) {
  socket.emit("set-name", lastName);
  nameInput.value = lastName;
}

// --- Receiving messages ---
socket.on('chat-message', (msg) => {
  const el = document.createElement('div');
  el.textContent = `${msg.name}: ${msg.text}`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  notify(`New message from ${msg.name}`);
});

socket.on('system', (msg) => {
  const el = document.createElement('div');
  el.style.fontStyle = "italic";
  el.textContent = `[SYSTEM] ${msg.text}`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

socket.on('userlist', (list) => {
  usersEl.innerHTML = "";
  list.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    usersEl.appendChild(li);
  });
});

// --- Mod Signup ---
document.getElementById('modSignup').addEventListener('click', () => {
  notify("You signed up as a moderator (placeholder).");
});
