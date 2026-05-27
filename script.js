const API_URL = "https://fatma-backend.onrender.com";
const FATMA   = { name:"FATMA", avatar:"assets/fatma-avatar.png" };

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
let activeTTSBtn       = null;   // rastreia botão TTS atualmente tocando

// ══════════════════════════════════════════════════════════════════════════════
// TEXT-TO-SPEECH
// ══════════════════════════════════════════════════════════════════════════════

// Ícone de alto-falante (estado normal)
const ICON_SPEAKER = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
</svg>`;

// Ícone de parar (estado tocando)
const ICON_STOP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"
  stroke="none">
  <rect x="4" y="4" width="16" height="16" rx="2"/>
</svg>`;

// Carrega vozes — necessário porque a API Web Speech carrega de forma assíncrona
let cachedVoice = null;

function loadVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Prioridade 1: pt-BR feminino explícito
  let v = voices.find(v => v.lang === "pt-BR" &&
    /female|feminina|woman|fem/i.test(v.name));

  // Prioridade 2: "Google português do Brasil" (padrão feminino no Chrome)
  if (!v) v = voices.find(v => v.lang === "pt-BR" &&
    /google/i.test(v.name));

  // Prioridade 3: qualquer pt-BR
  if (!v) v = voices.find(v => v.lang === "pt-BR");

  // Prioridade 4: qualquer português
  if (!v) v = voices.find(v => v.lang.startsWith("pt"));

  cachedVoice = v || null;
  return cachedVoice;
}

// Tenta carregar na inicialização e quando as vozes ficam disponíveis
loadVoice();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = () => { loadVoice(); };
}

// Limpa estado do botão ativo sem parar fala (chamado quando utterance termina)
function clearActiveTTSBtn() {
  if (activeTTSBtn) {
    activeTTSBtn.innerHTML = ICON_SPEAKER;
    activeTTSBtn.classList.remove("playing");
    activeTTSBtn.setAttribute("aria-label", "Ouvir mensagem");
    activeTTSBtn = null;
  }
}

// Para qualquer TTS em andamento e reseta o botão
function stopTTS() {
  window.speechSynthesis.cancel();
  clearActiveTTSBtn();
}

// Cria e retorna um botão TTS para um texto específico
function makeTTSButton(text) {
  const btn = document.createElement("button");
  btn.className = "tts-btn";
  btn.setAttribute("aria-label", "Ouvir mensagem");
  btn.title     = "Ouvir mensagem";
  btn.innerHTML = ICON_SPEAKER;

  btn.addEventListener("click", () => {
    // Se este botão já está tocando → parar
    if (btn === activeTTSBtn) {
      stopTTS();
      return;
    }

    // Parar qualquer outro que esteja tocando
    stopTTS();

    // Preparar utterance
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = "pt-BR";
    utt.rate  = 0.92;    // um pouco mais devagar que o padrão — mais calma
    utt.pitch = 1.05;    // leve elevação para soar mais feminino/atento

    const voice = cachedVoice || loadVoice();
    if (voice) utt.voice = voice;

    utt.onend = () => {
      if (activeTTSBtn === btn) clearActiveTTSBtn();
    };
    utt.onerror = () => {
      if (activeTTSBtn === btn) clearActiveTTSBtn();
    };

    // Atualizar visual do botão
    btn.innerHTML = ICON_STOP;
    btn.classList.add("playing");
    btn.setAttribute("aria-label", "Parar leitura");
    activeTTSBtn = btn;

    window.speechSynthesis.speak(utt);
  });

  return btn;
}

// ── Helpers gerais ────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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

// ── Aba de tópicos ────────────────────────────────────────────────────────────
topicsToggle.addEventListener("click", () => {
  const open = topicsPanel.classList.toggle("open");
  topicsToggle.setAttribute("aria-expanded", String(open));
  topicsPanel.setAttribute("aria-hidden",    String(!open));
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const msg = chip.dataset.msg;
    if (!msg) return;
    userInput.value = msg;
    chatForm.dispatchEvent(new Event("submit", { cancelable:true, bubbles:true }));
  });
});

function hideTopics() {
  if (!topicsWrapper) return;
  topicsWrapper.style.transition = "opacity 200ms ease, max-height 250ms ease";
  topicsWrapper.style.opacity   = "0";
  topicsWrapper.style.maxHeight = "0";
  topicsWrapper.style.overflow  = "hidden";
  topicsWrapper.style.borderTop = "none";
  setTimeout(() => { topicsWrapper.style.display = "none"; }, 260);
}

// ── Mensagens ─────────────────────────────────────────────────────────────────
function makeBotAvatar() {
  const img     = document.createElement("img");
  img.src       = FATMA.avatar;
  img.alt       = FATMA.name;
  img.className = "conv-avatar";
  img.onerror   = () => {
    const fb = document.createElement("div");
    fb.className   = "conv-avatar conv-avatar--fallback";
    fb.textContent = "F";
    img.replaceWith(fb);
  };
  return img;
}

function addMessage(text, sender, opts = {}) {
  const row = document.createElement("div");
  row.classList.add("msg-row", sender === "bot" ? "bot" : "user");

  if (sender === "bot") {
    const inner = document.createElement("div");
    inner.className = "msg-inner";

    const nameEl = document.createElement("span");
    nameEl.className   = "bot-name";
    nameEl.textContent = FATMA.name;

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble", "bot");
    if (opts.error) bubble.classList.add("error");
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    // Rodapé: hora + botão TTS (lado direito da hora)
    const footer = document.createElement("div");
    footer.className = "msg-footer";

    const time = document.createElement("span");
    time.className   = "msg-time";
    time.textContent = nowTime();

    // TTS — não mostrar para links puros (easter egg secreto)
    const isLink = /^https?:\/\/\S+$/.test(text.trim());
    if (!isLink) {
      footer.appendChild(time);
      footer.appendChild(makeTTSButton(text));
    } else {
      footer.appendChild(time);
    }

    inner.appendChild(nameEl);
    inner.appendChild(bubble);
    inner.appendChild(footer);

    row.appendChild(makeBotAvatar());
    row.appendChild(inner);

  } else {
    const wrap = document.createElement("div");
    wrap.className = "msg-inner msg-inner--user";

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble", "user");
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

    const footer = document.createElement("div");
    footer.className = "msg-footer";
    const time = document.createElement("span");
    time.className   = "msg-time";
    time.textContent = nowTime();
    footer.appendChild(time);

    wrap.appendChild(bubble);
    wrap.appendChild(footer);
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

function hideTyping() { document.getElementById("typing-indicator")?.remove(); }

// ── API ───────────────────────────────────────────────────────────────────────
async function sendMessage(pergunta) {
  const session_id = getSessionId();
  const resp = await fetch(`${API_URL}/chat`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ pergunta, session_id }),
  });
  if (!resp.ok) throw new Error("Falha na comunicação.");
  return resp.json();
}

// ── Envio ─────────────────────────────────────────────────────────────────────
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pergunta = userInput.value.trim();
  if (!pergunta) return;

  if (!userHasSentMessage) { userHasSentMessage = true; hideTopics(); }
  stopTTS();  // para qualquer áudio ao enviar nova mensagem

  addMessage(pergunta, "user");
  userInput.value = "";

  const btn = chatForm.querySelector("button[type='submit']");
  userInput.disabled = btn.disabled = true;
  showTyping();

  try {
    const data = await sendMessage(pergunta);
    if (data?.session_id) localStorage.setItem("fatma_session_id", data.session_id);
    hideTyping();
    addMessage(data.resposta, "bot");
  } catch {
    hideTyping();
    addMessage("Não foi possível obter resposta agora. Tente novamente em instantes.", "bot", { error:true });
  } finally {
    userInput.disabled = btn.disabled = false;
    userInput.focus();
  }
});

// ── Abrir/fechar ──────────────────────────────────────────────────────────────
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
  stopTTS();
  document.body.classList.remove("chat-open");
  chatWidget.setAttribute("aria-hidden", "true");
}

chatToggle.addEventListener("click", () => {
  document.body.classList.contains("chat-open") ? closeChat() : openChat();
});
chatClose.addEventListener("click", closeChat);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeChat(); });
