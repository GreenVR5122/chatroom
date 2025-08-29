const socket = io();

const el = (q) => document.querySelector(q);
const messages = el("#messages");
const userList = el("#userList");
const nameInput = el("#nameInput");
const pfpInput = el("#pfpInput");
const saveBtn = el("#saveBtn");
const themeToggle = el("#themeToggle");
const msgInput = el("#msgInput");
const sendBtn = el("#sendBtn");
const imageInput = el("#imageInput");
const openMod = el("#openMod");
const meBadge = el("#meBadge");
const meId = el("#meId");
const mePfpPreview = el("#mePfpPreview");
const toast = el("#toast");

let MY_ROLE = "USER";
let MY_SID = "";
let MY_UID = "";
let pendingImage = null;

function showToast(t){
  toast.textContent = t;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2000);
}

themeToggle.onclick = () => {
  document.body.classList.toggle("theme-dark");
};

saveBtn.onclick = () => {
  const newName = nameInput.value.trim();
  if (newName) socket.emit("set-name", newName);
  if (pfpInput.files[0]) {
    const reader = new FileReader();
    reader.onload = () => socket.emit("set-pfp", reader.result);
    reader.readAsDataURL(pfpInput.files[0]);
    mePfpPreview.src = URL.createObjectURL(pfpInput.files[0]);
  }
  showToast("Saved!");
};

sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text && !pendingImage) return;
  socket.emit("chat-message", { text, img: pendingImage });
  msgInput.value = "";
  pendingImage = null;
  imageInput.value = "";
};

imageInput.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { pendingImage = reader.result; showToast("Image ready to send"); };
  reader.readAsDataURL(f);
};

socket.on("you-are", ({ role, uid, sid }) => {
  MY_ROLE = role;
  MY_UID = uid;
  MY_SID = sid;
  meBadge.textContent = role;
  meBadge.className = `badge ${role}`;
  meId.textContent = `ID: ${uid}`;
  if (["OWNER", "ADMIN", "MOD"].includes(role)) {
    openMod.style.display = "block";
  } else {
    openMod.style.display = "none";
  }
});

socket.on("system", (msg) => {
  const wrapper = document.createElement("div");
  wrapper.className = "msg";
  wrapper.innerHTML = `
    <div></div>
    <div class="meta"><span class="name">[SYSTEM]</span></div>
    <div class="text">${msg.text}</div>
  `;
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("userlist", (list) => {
  userList.innerHTML = "";
  list.forEach((u) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="user-info">
        <span class="badge ${u.role}">${u.role}</span>
        <span><strong>${u.name}</strong> <span class="uid">(${u.uid})</span>${u.muted ? " • 🔇" : ""}</span>
      </div>
      <span></span>
    `;
    userList.appendChild(li);
  });
});

socket.on("chat-message", (m) => {
  const wrap = document.createElement("div");
  wrap.className = "msg";
  wrap.dataset.messageId = m.messageId;

  const pfp = m.pfp ? `<img class="pfp" src="${m.pfp}" alt="">` : `<div class="pfp" style="background:#2a2e4d"></div>`;
  const roleTag = `<span class="role-tag ${m.role}">${m.role}</span>`;
  const displayName = (m.role === "OWNER" && m.name === "GreenVR") ? "G^R^E^E^N^V^R" : m.name;

  wrap.innerHTML = `
    ${pfp}
    <div class="meta">
      <span class="name">${displayName}</span>
      ${roleTag}
      <span class="uid">#${m.uid}</span>
    </div>
    <div class="text">${m.text || ""}</div>
    ${m.img ? `<img class="msg-img" src="${m.img}" />` : ""}
    <div class="mid">
      <span class="hint">ID: ${m.messageId}</span>
      ${["OWNER","ADMIN","MOD"].includes(MY_ROLE)
        ? `<button class="btn danger" data-del="${m.messageId}">Delete</button>`
        : ""}
    </div>
  `;

  if (["OWNER","ADMIN","MOD"].includes(MY_ROLE)) {
    const delBtn = wrap.querySelector("[data-del]");
    if (delBtn) delBtn.onclick = () => socket.emit("delete-message", m.messageId);
  }

  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("delete-message", (messageId) => {
  const el = document.querySelector(`[data-message-id="${messageId}"]`);
  if (el) el.remove();
});

socket.on("kicked", () => {
  alert("You have been kicked.");
  location.reload();
});
socket.on("banned", () => {
  alert("You have been banned.");
  location.href = "about:blank";
});

openMod.onclick = () => location.href = "mod.html";

// Load any saved name on start
const last = localStorage.getItem("name");
if (last) nameInput.value = last;
nameInput.addEventListener("change", () => {
  localStorage.setItem("name", nameInput.value.trim());
});
