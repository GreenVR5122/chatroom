const socket = io({ query:{ username: localStorage.getItem("lastName")||"Guest" } });

const usersEl = document.getElementById('users');
const messagesEl = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const modPanelBtn = document.getElementById('modPanelBtn');
let myRole = null;

// Send chat
sendBtn.onclick = ()=>{ 
  socket.emit('chat-message',{ text: chatInput.value }); 
  chatInput.value=''; 
};

// Show user list with grant MOD button
socket.on('userlist', list=>{
  usersEl.innerHTML='';
  list.forEach(u=>{
    const li=document.createElement('li');
    li.textContent=`${u.name} [ID:${u.id}]${u.role?' ['+u.role+']':''}`;

    // Grant MOD button for OWNER/ADMIN
    if(myRole==='OWNER' || myRole==='ADMIN'){
      const grantBtn=document.createElement('button');
      grantBtn.textContent='Grant MOD';
      grantBtn.onclick=()=>socket.emit('grant-mod', u.id);
      li.appendChild(grantBtn);
    }

    usersEl.appendChild(li);
  });
});

// Receive chat
socket.on('chat-message', msg=>{
  const li=document.createElement('li');
  li.dataset.id = msg.id;
  li.innerHTML = `<strong>${msg.role?`[${msg.role}] `:''}${msg.name}:</strong> ${msg.text}`;
  messagesEl.appendChild(li);
  messagesEl.scrollTop=messagesEl.scrollHeight;
});

// System messages
socket.on('system', msg=>{
  const li=document.createElement('li');
  li.style.fontStyle='italic';
  li.textContent=`[SYSTEM] ${msg.text}`;
  messagesEl.appendChild(li);
  messagesEl.scrollTop=messagesEl.scrollHeight;
});

// Delete messages
socket.on('delete-message', msgId=>{
  const el=document.querySelector(`li[data-id='${msgId}']`);
  if(el) el.remove();
});

// Show moderation panel button if MOD/ADMIN/OWNER
socket.on('userlist', list=>{
  const me = list.find(u=>u.name===localStorage.getItem("lastName")||"Guest");
  if(me) myRole = me.role;
  modPanelBtn.style.display = (['OWNER','MOD','ADMIN'].includes(myRole))?'inline-block':'none';
});

// Moderation panel actions
modPanelBtn.onclick = ()=>{
  const panel = document.getElementById('modPanel');
  panel.style.display='block';
};

// Ban user (from panel)
document.getElementById('banBtn').onclick = ()=>{
  const targetId = parseInt(document.getElementById('banInput').value);
  if(targetId) socket.emit('ban-user', targetId);
};
