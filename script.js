const API_URL = "https://fatma-backend.onrender.com";

const FATMA = {
  name:   "FATMA",
  avatar: "assets/fatma-avatar.png",
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const chatToggle    = document.getElementById("chat-toggle");
const chatWidget    = document.getElementById("chat-widget");
const chatClose     = document.getElementById("chat-close");
const chatHistory   = document.getElementById("chat-history");
const chatForm      = document.getElementById("chat-form");
const userInput     = document.getElementById("user-input");
const topicsWrapper = document.getElementById("topics-wrapper");
const topicsToggle  = document.getElementById("topics-toggle");
const topicsPanel   = document.getElementById("topics-panel");

// ── State ─────────────────────────────────────────────────────────────────────
let userHasSentMessage = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
}

function getSessionId() {
  let id = localStorage.getItem("fatma_session_id");
  if (!id) {
    id = crypto.randomUUID?.() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem("fatma_session_id", id);
  }
  return id;
}

// ── Aba de tópicos recolhível ──────────────────────────────────────────────────
topicsToggle.addEventListener("click", () => {
  const isOpen = topicsPanel.classList.toggle("open");
  topicsToggle.setAttribute("aria-expanded", String(isOpen));
  topicsPanel.setAttribute("aria-hidden",    String(!isOpen));
});

// Chips: clique → preenche input → dispara envio
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const msg = chip.dataset.msg;
    if (!msg) return;
    userInput.value = msg;
    chatForm.dispatchEvent(new Event("submit", { cancelable:true, bubbles:true }));
  });
});

// Esconde a aba inteira após a primeira mensagem
function hideTopics() {
  if (!topicsWrapper) return;
  topicsWrapper.style.transition = "opacity 200ms ease, max-height 250ms ease";
  topicsWrapper.style.opacity    = "0";
  topicsWrapper.style.maxHeight  = "0";
  topicsWrapper.style.overflow   = "hidden";
  topicsWrapper.style.borderTop  = "none";
  setTimeout(() => { topicsWrapper.style.display = "none"; }, 260);
}

// ── Mensagens ─────────────────────────────────────────────────────────────────
function makeBotAvatar() {
  const img   = document.createElement("img");
  img.src     = FATMA.avatar;
  img.alt     = FATMA.name;
  img.className = "conv-avatar";
  img.onerror = () => {
    const fb = document.createElement("div");
    fb.className = "conv-avatar conv-avatar--fallback";
    fb.textContent = "F";
    img.replaceWith(fb);
  };
  return img;
}

function addMessage(text, sender, opts = {}) {
  const row = document.createElement("div");
  row.classList.add("msg-row", sender === "bot" ? "bot" : "user");

  if (sender === "bot") {
    const inner  = document.createElement("div");
    inner.className = "msg-inner";

    const nameEl = document.createElement("span");
    nameEl.className   = "bot-name";
    nameEl.textContent = FATMA.name;

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble", "bot");
    if (opts.error) bubble.classList.add("error");
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    const time = document.createElement("span");
    time.className   = "msg-time";
    time.textContent = nowTime();

    inner.appendChild(nameEl);
    inner.appendChild(bubble);
    inner.appendChild(time);

    row.appendChild(makeBotAvatar());
    row.appendChild(inner);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "msg-inner msg-inner--user";

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble", "user");
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    const time = document.createElement("span");
    time.className   = "msg-time";
    time.textContent = nowTime();

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    row.appendChild(wrap);
  }

  chatHistory.appendChild(row);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function showTyping() {
  const row = document.createElement("div");
  row.classList.add("msg-row", "bot", "typing-row");
  row.id = "typing-indicator";

  const bubble = document.createElement("div");
  bubble.className = "typing-bubble";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "typing-dot";
    bubble.appendChild(dot);
  }

  row.appendChild(makeBotAvatar());
  row.appendChild(bubble);
  chatHistory.appendChild(row);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function hideTyping() {
  document.getElementById("typing-indicator")?.remove();
}

// ── API ───────────────────────────────────────────────────────────────────────
async function sendMessage(pergunta) {
  const session_id = getSessionId();
  const resp = await fetch(`${API_URL}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ pergunta, session_id }),
  });
  if (!resp.ok) throw new Error("Falha na comunicação.");
  return resp.json();
}

// ── Envio ─────────────────────────────────────────────────────────────────────
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pergunta = userInput.value.trim();
  if (!pergunta) return;

  // Primeira mensagem: fecha e remove a aba de tópicos
  if (!userHasSentMessage) {
    userHasSentMessage = true;
    hideTopics();
  }

  addMessage(pergunta, "user");
  userInput.value = "";

  const submitBtn = chatForm.querySelector("button[type='submit']");
  userInput.disabled  = true;
  submitBtn.disabled  = true;
  showTyping();

  try {
    const data = await sendMessage(pergunta);
    if (data?.session_id) localStorage.setItem("fatma_session_id", data.session_id);
    hideTyping();
    addMessage(data.resposta, "bot");
  } catch {
    hideTyping();
    addMessage("Não foi possível obter resposta agora. Tente novamente em instantes.", "bot", { error: true });
  } finally {
    userInput.disabled = false;
    submitBtn.disabled = false;
    userInput.focus();
  }
});

// ── Abrir/fechar widget ───────────────────────────────────────────────────────
function openChat() {
  document.body.classList.add("chat-open");
  chatWidget.setAttribute("aria-hidden", "false");
  if (!chatHistory.hasChildNodes()) {
    addMessage(
      "Olá! Eu sou a FATMA, sua assistente acadêmica da Fatec Zona Sul. 😊\n\n" +
      "Clique em \"Tópicos rápidos\" abaixo ou digite sua dúvida para começar!",
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
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeChat(); });
