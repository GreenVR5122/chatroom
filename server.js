const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// Users: socket.id -> {name, pfp, role, id}
const users = new Map();

// Roles map by username
const roles = {
  "GreenVR512": "OWNER",
  "AdminUser": "ADMIN"
};

// Bad words
const badWords = ["fuck","shit","bitch","asshole","cunt","dick","pussy","nigger","nigga","faggot","retard","whore","slut","cock","bastard","damn"];
function censor(text){ 
  return text.split(/\s+/).map(w=>{
    const lw=w.toLowerCase();
    if(badWords.includes(lw)) return w[0]+'*'.repeat(w.length-1);
    return w;
  }).join(" ");
}

let nextUserId = 1;

function buildUserList(){ 
  return Array.from(users.values()).map(u=>({name:u.name, id:u.id, role:u.role})); 
}

io.on('connection', socket=>{
  let defaultName = 'Guest_' + nextUserId;
  const userId = nextUserId++;
  let username = socket.handshake.query.username || defaultName;
  let role = roles[username] || null;

  users.set(socket.id, {name: username, pfp:null, role, id:userId});

  io.emit('userlist', buildUserList());
  io.emit('system',{ text: `${username} joined the chat.` });

  // Set name
  socket.on('set-name', newName=>{
    const safe = censor(newName.trim().slice(0,40)) || defaultName;
    users.get(socket.id).name = safe;
    io.emit('userlist', buildUserList());
    io.emit('system', { text: `${safe} changed their name.` });
  });

  // Set pfp
  socket.on('set-pfp', pfp=>{
    if(typeof pfp==='string' && pfp.startsWith('data:image')){
      users.get(socket.id).pfp = pfp;
    }
  });

  // Chat message
  socket.on('chat-message', msg=>{
    const user = users.get(socket.id);
    io.emit('chat-message',{
      id: socket.id,
      userId: user.id,
      name: user.name,
      role: user.role,
      text: censor(msg.text),
      img: msg.img||null,
      pfp: user.pfp||null,
      time: Date.now()
    });
  });

  // Grant MOD access (OWNER/ADMIN only)
  socket.on('grant-mod', targetId=>{
    const sender = users.get(socket.id);
    if(sender.role==='OWNER' || sender.role==='ADMIN'){
      for(const u of users.values()){
        if(u.id===targetId){
          u.role='MOD';
          io.emit('system',{ text:`${u.name} has been granted MOD access by ${sender.name}` });
        }
      }
      io.emit('userlist', buildUserList());
    }
  });

  // Delete message
  socket.on('delete-message', msgId=>{
    const user = users.get(socket.id);
    if(['OWNER','MOD','ADMIN'].includes(user.role)){
      io.emit('delete-message', msgId);
    }
  });

  // Ban user
  socket.on('ban-user', targetId=>{
    const user = users.get(socket.id);
    if(['OWNER','MOD','ADMIN'].includes(user.role)){
      for(const [id,u] of users){
        if(u.id===targetId){
          io.to(id).emit('system',{ text: "You have been banned." });
          io.sockets.sockets.get(id)?.disconnect();
          users.delete(id);
        }
      }
      io.emit('system',{ text: `User ID ${targetId} has been banned.` });
      io.emit('userlist', buildUserList());
    }
  });

  socket.on('disconnect', ()=>{
    const user = users.get(socket.id);
    users.delete(socket.id);
    io.emit('userlist', buildUserList());
    if(user) io.emit('system',{ text:`${user.name} left the chat.` });
  });

});

http.listen(PORT, ()=>console.log(`Chat server running on http://localhost:${PORT}`));
