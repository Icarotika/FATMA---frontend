const API_URL = "https://fatma-backend.onrender.com";

const FATMA = {
  name: "FATMA",
  avatar: "assets/fatma-avatar.png",
};

// ── DOM refs ──────────────────────────────────────────────────────────────
const chatToggle   = document.getElementById("chat-toggle");
const chatWidget   = document.getElementById("chat-widget");
const chatClose    = document.getElementById("chat-close");
const chatHistory  = document.getElementById("chat-history");
const chatForm     = document.getElementById("chat-form");
const userInput    = document.getElementById("user-input");
const suggestionsEl = document.getElementById("suggestions");

// ── State ─────────────────────────────────────────────────────────────────
let userHasSentMessage = false;   // controla visibilidade dos chips

// ── Helpers ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getSessionId() {
  let id = localStorage.getItem("fatma_session_id");
  if (!id) {
    id = (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem("fatma_session_id", id);
  }
  return id;
}

// ── Chips: só aparecem antes do usuário enviar qualquer mensagem ───────────
function hideSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.style.transition = "opacity 200ms ease, max-height 250ms ease";
  suggestionsEl.style.opacity = "0";
  suggestionsEl.style.maxHeight = "0";
  suggestionsEl.style.padding = "0";
  suggestionsEl.style.borderTop = "none";
  // remove do fluxo após animação
  setTimeout(() => {
    suggestionsEl.style.display = "none";
  }, 260);
}

// Adiciona handler nos chips: clique → preenche input → dispara envio
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const msg = chip.dataset.msg;
    if (!msg) return;
    userInput.value = msg;
    chatForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });
});

// ── Mensagens ─────────────────────────────────────────────────────────────
function addMessage(text, sender, opts = {}) {
  const row = document.createElement("div");
  row.classList.add("msg-row", sender === "bot" ? "bot" : "user");

  if (sender === "bot") {
    // --- avatar pequeno + nome + balão ---
    const avatarImg = document.createElement("img");
    avatarImg.src    = FATMA.avatar;
    avatarImg.alt    = FATMA.name;
    avatarImg.className = "conv-avatar";
    // fallback se imagem não existir
    avatarImg.onerror = () => {
      const fb = document.createElement("div");
      fb.className = "conv-avatar conv-avatar--fallback";
      fb.textContent = "F";
      avatarImg.replaceWith(fb);
    };

    const inner = document.createElement("div");
    inner.className = "msg-inner";

    const nameEl = document.createElement("span");
    nameEl.className = "bot-name";
    nameEl.textContent = FATMA.name;

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble", "bot");
    if (opts.error) bubble.classList.add("error");
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = nowTime();

    inner.appendChild(nameEl);
    inner.appendChild(bubble);
    inner.appendChild(time);

    row.appendChild(avatarImg);
    row.appendChild(inner);

  } else {
    // --- balão do usuário ---
    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble", "user");
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = nowTime();

    const wrap = document.createElement("div");
    wrap.className = "msg-inner msg-inner--user";
    wrap.appendChild(bubble);
    wrap.appendChild(time);

    row.appendChild(wrap);
  }

  chatHistory.appendChild(row);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ── Typing indicator ──────────────────────────────────────────────────────
function showTyping() {
  const row = document.createElement("div");
  row.classList.add("msg-row", "bot", "typing-row");
  row.id = "typing-indicator";

  const avatarImg = document.createElement("img");
  avatarImg.src = FATMA.avatar;
  avatarImg.alt = FATMA.name;
  avatarImg.className = "conv-avatar";
  avatarImg.onerror = () => {
    const fb = document.createElement("div");
    fb.className = "conv-avatar conv-avatar--fallback";
    fb.textContent = "F";
    avatarImg.replaceWith(fb);
  };

  const bubble = document.createElement("div");
  bubble.className = "typing-bubble";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "typing-dot";
    bubble.appendChild(dot);
  }

  row.appendChild(avatarImg);
  row.appendChild(bubble);
  chatHistory.appendChild(row);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function hideTyping() {
  document.getElementById("typing-indicator")?.remove();
}

// ── API ───────────────────────────────────────────────────────────────────
async function sendMessage(pergunta) {
  const session_id = getSessionId();
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta, session_id }),
  });
  if (!response.ok) throw new Error("Falha na comunicação com o servidor.");
  return response.json();
}

// ── Submit ────────────────────────────────────────────────────────────────
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pergunta = userInput.value.trim();
  if (!pergunta) return;

  // Primeira mensagem: esconde chips permanentemente
  if (!userHasSentMessage) {
    userHasSentMessage = true;
    hideSuggestions();
  }

  addMessage(pergunta, "user");
  userInput.value = "";
  userInput.disabled = true;
  chatForm.querySelector("button").disabled = true;

  showTyping();

  try {
    const data = await sendMessage(pergunta);
    if (data?.session_id) localStorage.setItem("fatma_session_id", data.session_id);
    hideTyping();
    addMessage(data.resposta, "bot");
  } catch (err) {
    hideTyping();
    addMessage("Não foi possível obter resposta no momento. Tente novamente em instantes.", "bot", { error: true });
  } finally {
    userInput.disabled = false;
    chatForm.querySelector("button").disabled = false;
    userInput.focus();
  }
});

// ── Toggle open/close ─────────────────────────────────────────────────────
function openChat() {
  document.body.classList.add("chat-open");
  chatWidget.setAttribute("aria-hidden", "false");

  if (!chatHistory.hasChildNodes()) {
    addMessage(
      "Olá! Eu sou a FATMA, sua assistente acadêmica da Fatec Zona Sul. 😊\n\nPosso ajudar com matrícula, trancamento, documentos, prazos e informações sobre disciplinas.\n\nComo posso te ajudar hoje?",
      "bot"
    );
  }
  userInput.focus();
}

function closeChat() {
  document.body.classList.remove("chat-open");
  chatWidget.setAttribute("aria-hidden", "true");
}

chatToggle.addEventListener("click", () => {
  document.body.classList.contains("chat-open") ? closeChat() : openChat();
});

chatClose.addEventListener("click", closeChat);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeChat();
});
