const myUsername = localStorage.getItem("lastName") || "Guest";
const socket = io({ query: { username: myUsername } });

const usersEl = document.getElementById('users');
const messagesEl = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const notifyEl = document.getElementById('notify');

const nameInput = document.getElementById('nameInput');
const pfpInput = document.getElementById('pfpInput');
const saveSettings = document.getElementById('saveSettings');

let myPfp = null;

// Theme toggle
document.getElementById('themeToggle').onclick = () => {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
};

// Notifications
function notify(text){
  notifyEl.innerText = text;
  notifyEl.style.display = "block";
  setTimeout(()=>{notifyEl.style.display="none";},3000);
}

// Save/load name history
function saveName(name){
  let history = JSON.parse(localStorage.getItem("nameHistory")) || [];
  if(!history.includes(name)) history.push(name);
  localStorage.setItem("nameHistory", JSON.stringify(history));
  localStorage.setItem("lastName", name);
}
function loadLastName(){ return localStorage.getItem("lastName"); }

// Save settings
saveSettings.onclick = () => {
  const newName = nameInput.value.trim();
  if(newName){
    socket.emit('set-name', newName);
    saveName(newName);
    notify(`Name changed to ${newName}`);
  }
  const file = pfpInput.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = ()=> { myPfp = reader.result; socket.emit('set-pfp', myPfp); };
    reader.readAsDataURL(file);
  }
};

// Auto-load last name
const lastName = loadLastName();
if(lastName){
  socket.emit('set-name', lastName);
  nameInput.value = lastName;
}

// Send message
function sendMessage(text=null,img=null){
  socket.emit('chat-message',{ text:text||chatInput.value, img: img });
  chatInput.value = '';
}
sendBtn.onclick = ()=>sendMessage();
chatInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ sendMessage(); } });

// Send image message
document.getElementById('imageInput').onchange = e => {
  const file = e.target.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = ()=>sendMessage('',reader.result);
    reader.readAsDataURL(file);
  }
};

// Receive messages
socket.on('chat-message', msg=>{
  const li = document.createElement('li');

  // PFP
  if(msg.pfp){
    const img = document.createElement('img');
    img.src = msg.pfp;
    img.classList.add('pfp');
    li.appendChild(img);
  }

  // Role tag
  let roleTag = msg.role ? `[${msg.role}] ` : '';

  // Custom OWNER display
  let displayName = msg.name;
  if(msg.role==='OWNER' && msg.name==='GreenVR512') displayName='G^R^E^E^N^V^R';

  li.innerHTML += `<strong>${roleTag}${displayName}:</strong> ${msg.text}`;

  // Image
  if(msg.img){
    const img = document.createElement('img');
    img.src = msg.img;
    img.classList.add('chat-image');
    li.appendChild(img);
  }

  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  notify(`New message from ${displayName}`);
});

// System messages
socket.on('system', msg=>{
  const li = document.createElement('li');
  li.style.fontStyle="italic";
  li.textContent=`[SYSTEM] ${msg.text}`;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

// User list
socket.on('userlist', list=>{
  usersEl.innerHTML='';
  list.forEach(u=>{
    const li=document.createElement('li');
    li.textContent=u;
    usersEl.appendChild(li);
  });
});

// Mod Signup placeholder
document.getElementById('modSignup').onclick = ()=>{
  notify("You signed up as a moderator (placeholder).");
};
