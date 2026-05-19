const API_URL = "https://fatma-backend.onrender.com";

// Personalização da FATMA (troque apenas estas opções)
const FATMA = {
  name: "FATMA",
  avatar: "assets/fatma-avatar.png",
  avatarSize: 40,
  avatarBorder: "2px solid rgba(255,255,255,0.6)",
};

const chatToggle = document.getElementById("chat-toggle");
const chatWidget = document.getElementById("chat-widget");
const chatClose = document.getElementById("chat-close");
const chatHistory = document.getElementById("chat-history");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const fatmaAvatarEl = document.getElementById("fatma-avatar");

if (fatmaAvatarEl) {
  fatmaAvatarEl.src = FATMA.avatar;
  fatmaAvatarEl.style.width = "48px";
  fatmaAvatarEl.style.height = "48px";
  fatmaAvatarEl.style.borderRadius = "10px";
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function addMessage(text, sender) {
  const row = document.createElement("div");
  row.classList.add("msg-row");
  row.classList.add(sender === "bot" ? "bot" : "user");

  const bubble = document.createElement("div");
  bubble.classList.add("msg-bubble");
  bubble.classList.add(sender === "bot" ? "bot" : "user");
  const safe = escapeHtml(String(text));
  bubble.innerHTML = safe.replace(/\n/g, "<br>");

  if (sender === "bot") {
    const meta = document.createElement("div");
    meta.classList.add("msg-meta");
    const img = document.createElement("img");
    img.src = FATMA.avatar;
    img.alt = FATMA.name;
    meta.appendChild(img);
    const wrapper = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.style.fontSize = "0.78rem";
    nameEl.style.fontWeight = "600";
    nameEl.style.color = "var(--primary)";
    nameEl.textContent = FATMA.name;
    wrapper.appendChild(nameEl);
    wrapper.appendChild(bubble);
    meta.appendChild(wrapper);
    row.appendChild(meta);
  } else {
    row.appendChild(bubble);
  }

  chatHistory.appendChild(row);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function getSessionId() {
  let id = localStorage.getItem("assistente_session_id");
  if (!id) {
    if (window.crypto && crypto.randomUUID) id = crypto.randomUUID();
    else id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem("assistente_session_id", id);
  }
  return id;
}

async function sendMessage(pergunta) {
  const session_id = getSessionId();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta, session_id }),
  });

  if (!response.ok) {
    throw new Error("Falha na comunicação com o backend.");
  }

  return response.json();
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const pergunta = userInput.value.trim();
  if (!pergunta) return;

  addMessage(pergunta, "user");
  userInput.value = "";

  try {
    const data = await sendMessage(pergunta);
    if (data?.session_id)
      localStorage.setItem("assistente_session_id", data.session_id);
    addMessage(data.resposta, "bot");
  } catch (error) {
    addMessage("Não foi possível obter resposta no momento.", "bot");
  }
});

// Toggle chat open/close
function openChat() {
  document.body.classList.add("chat-open");
  chatWidget.setAttribute("aria-hidden", "false");
  if (!chatHistory.hasChildNodes()) {
    addMessage(
      `Olá! Eu sou ${FATMA.name}, sua assistente acadêmica. \n\nPosso ajudar com matrícula, trancamento, documentos, prazos ou informações sobre disciplinas. Como posso ajudar hoje?`,
      "bot",
    );
  }
  userInput.focus();
}

function closeChat() {
  document.body.classList.remove("chat-open");
  chatWidget.setAttribute("aria-hidden", "true");
}

chatToggle.addEventListener("click", () => {
  if (document.body.classList.contains("chat-open")) closeChat();
  else openChat();
});

chatClose.addEventListener("click", closeChat);

// allow Esc to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeChat();
});
