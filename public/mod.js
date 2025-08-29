const socket = io();
const el = (q)=>document.querySelector(q);
const modUserList = el("#modUserList");
const sidInput = el("#sidInput");
const muteBtn = el("#muteBtn");
const unmuteBtn = el("#unmuteBtn");
const kickBtn = el("#kickBtn");
const banBtn = el("#banBtn");

const grantSid = el("#grantSid");
const grantBtn = el("#grantBtn");
const revokeBtn = el("#revokeBtn");

const messageIdInput = el("#messageIdInput");
const deleteBtn = el("#deleteBtn");
const toast = document.querySelector("#toast");

let MY_ROLE = "USER";
socket.on("you-are", ({ role }) => {
  MY_ROLE = role;
  if (!["OWNER","ADMIN","MOD"].includes(role)) {
    alert("You do not have access to this page.");
    location.href = "index.html";
  }
});

function showToast(t){
  toast.textContent = t;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2000);
}

socket.on("userlist", (list) => {
  modUserList.innerHTML = "";
  list.forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="user-info">
        <span class="badge ${u.role}">${u.role}</span>
        <span><strong>${u.name}</strong> <span class="uid">(${u.uid})</span> <small>${u.sid}</small> ${u.muted ? "• 🔇" : ""}</span>
      </div>
      <div class="actions">
        <button class="btn" data-fill="${u.sid}">Use SID</button>
      </div>`;
    modUserList.appendChild(li);
  });

  // quick fill SID buttons
  [...modUserList.querySelectorAll("[data-fill]")].forEach(b=>{
    b.onclick = ()=>{ sidInput.value = b.getAttribute("data-fill"); grantSid.value = b.getAttribute("data-fill"); };
  });
});

muteBtn.onclick = ()=>{ if(sidInput.value) socket.emit("mute-user", sidInput.value); showToast("Muted"); };
unmuteBtn.onclick = ()=>{ if(sidInput.value) socket.emit("unmute-user", sidInput.value); showToast("Unmuted"); };
kickBtn.onclick = ()=>{ if(sidInput.value) socket.emit("kick-user", sidInput.value); showToast("Kicked"); };
banBtn.onclick = ()=>{ if(sidInput.value) socket.emit("ban-user", sidInput.value); showToast("Banned"); };

grantBtn.onclick = ()=>{ if(grantSid.value) socket.emit("grant-mod", grantSid.value); showToast("Granted MOD"); };
revokeBtn.onclick = ()=>{ if(grantSid.value) socket.emit("revoke-mod", grantSid.value); showToast("Revoked MOD"); };

deleteBtn.onclick = ()=>{ if(messageIdInput.value) socket.emit("delete-message", messageIdInput.value); showToast("Deleted (if found)"); };
