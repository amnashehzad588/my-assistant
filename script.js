// ╔══════════════════════════════════════════════════╗
// ║           My Assistant v3 — script.js            ║
// ║                                                  ║
// ║  Ab koi API key input nahi hai.                  ║
// ║  Frontend → /api/chat → Groq (server side)       ║
// ╚══════════════════════════════════════════════════╝


// ══════════════════════════════════════
//  AMNA KA BIODATA — Yahan update karo
// ══════════════════════════════════════
const SYSTEM_PROMPT = `
You are "My Assistant" — a personal AI that represents Amna.
When anyone asks about Amna, respond in FIRST PERSON as if YOU ARE Amna.

━━━━━━━━━━━━━━━━━━━
ABOUT AMNA
━━━━━━━━━━━━━━━━━━━
Name:      Amna
Location:  Faisalabad, Punjab, Pakistan
Languages: Urdu, Punjabi, English

━━━━━━━━━━━━━━━━━━━
EDUCATION
━━━━━━━━━━━━━━━━━━━
- Bachelor's in Computer Science (currently studying)
- Strong in Data Structures, Algorithms, OOP
- Passionate about AI & Web Development
- Currently building AI-powered personal projects

━━━━━━━━━━━━━━━━━━━
TECHNICAL SKILLS
━━━━━━━━━━━━━━━━━━━
Languages:  Python, C++, JavaScript, HTML, CSS
AI/ML:      API integration, building AI tools
Web Dev:    Front-end development, vanilla JS
Tools:      VS Code, Git, GitHub, MySQL
Learning:   React.js, Vercel deployment, REST APIs

━━━━━━━━━━━━━━━━━━━
FAMILY & PERSONAL
━━━━━━━━━━━━━━━━━━━
- One of 4 siblings — all others are married
- Focused on education and building a tech career
- From a close-knit family in Faisalabad
- Friendly, curious, hardworking personality
- Enjoys AI tools, problem-solving, building from scratch

━━━━━━━━━━━━━━━━━━━
GOALS
━━━━━━━━━━━━━━━━━━━
- Become a Full Stack Developer + AI Engineer
- Build tools that genuinely help people
- Contribute to the Pakistani tech community

━━━━━━━━━━━━━━━━━━━
RESPONSE RULES
━━━━━━━━━━━━━━━━━━━
1. Always speak FIRST PERSON: "I am...", "My goal is..."
2. Warm, friendly, conversational tone
3. Use markdown for lists and detailed answers
4. If user writes in Urdu/Hinglish, reply the same way
5. If asked something private, say: "Main woh share nahi karti 😊"
6. End EVERY response with exactly 3 short follow-up suggestions:
   FOLLOWUPS:
   - [question 1]
   - [question 2]
   - [question 3]
`.trim();


// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let chatHistory  = [];
let isLoading    = false;
let allChats     = [];
let activeChatId = null;
let isDark       = false;


// ══════════════════════════════════════
//  SOUND (Web Audio API)
// ══════════════════════════════════════
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSend() {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  } catch(_) {}
}

function playReceive() {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch(_) {}
}


// ══════════════════════════════════════
//  THEME
// ══════════════════════════════════════
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.getElementById("theme-toggle").classList.toggle("on", isDark);
  document.getElementById("theme-text").textContent = isDark ? "Dark mode" : "Light mode";
}


// ══════════════════════════════════════
//  CHAT MANAGEMENT
// ══════════════════════════════════════
function newChat() {
  if (chatHistory.length && activeChatId) {
    const c = allChats.find(x => x.id === activeChatId);
    if (c) c.messages = [...chatHistory];
  }
  const id = Date.now().toString();
  allChats.unshift({ id, title: "New chat", messages: [] });
  activeChatId = id;
  chatHistory = [];
  document.getElementById("messages-list").innerHTML = "";
  document.getElementById("welcome-screen").style.display = "flex";
  document.getElementById("followup-bar").classList.add("hidden");
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById("chat-history");
  container.innerHTML = "";
  allChats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "history-item" + (chat.id === activeChatId ? " active" : "");
    item.innerHTML = `
      <span class="history-item-text">${escapeHtml(chat.title)}</span>
      <button class="history-delete" onclick="deleteChat('${chat.id}',event)">✕</button>
    `;
    item.addEventListener("click", () => loadChat(chat.id));
    container.appendChild(item);
  });
}

function loadChat(id) {
  if (chatHistory.length && activeChatId) {
    const c = allChats.find(x => x.id === activeChatId);
    if (c) c.messages = [...chatHistory];
  }
  const chat = allChats.find(x => x.id === id);
  if (!chat) return;
  activeChatId = id;
  chatHistory = [...chat.messages];
  document.getElementById("messages-list").innerHTML = "";
  document.getElementById("followup-bar").classList.add("hidden");
  if (!chatHistory.length) {
    document.getElementById("welcome-screen").style.display = "flex";
  } else {
    document.getElementById("welcome-screen").style.display = "none";
    chatHistory.forEach(m => appendBubble(m.role === "user" ? "user" : "ai", m.content, false));
  }
  renderHistory();
}

function deleteChat(id, event) {
  event.stopPropagation();
  allChats = allChats.filter(c => c.id !== id);
  if (activeChatId === id) newChat();
  else renderHistory();
}


// ══════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════
function ask(text) {
  document.getElementById("msg-input").value = text;
  sendMessage();
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById("msg-input");
  const userText = input.value.trim();
  if (!userText) return;

  input.value = "";
  input.style.height = "auto";
  updateSendBtn();

  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("followup-bar").classList.add("hidden");

  playSend();
  appendBubble("user", userText, true);
  chatHistory.push({ role: "user", content: userText });

  const chat = allChats.find(c => c.id === activeChatId);
  if (chat && chat.title === "New chat") {
    chat.title = userText.length > 35 ? userText.slice(0, 35) + "…" : userText;
    renderHistory();
  }

  isLoading = true;
  const typingId = showTyping();

  try {
    // ── KEY DIFFERENCE ──
    // Pehle directly Groq ko call karte the.
    // Ab apne server /api/chat ko call karte hain.
    // API key browser mein kabhi nahi aati!
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chatHistory,
        systemPrompt: SYSTEM_PROMPT
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const data = await response.json();
    const rawReply = data.reply;

    removeTyping(typingId);
    const { cleanReply, followups } = parseFollowups(rawReply);

    playReceive();
    appendBubble("ai", cleanReply, true);
    chatHistory.push({ role: "assistant", content: cleanReply });
    if (chat) chat.messages = [...chatHistory];
    if (followups.length) showFollowups(followups);

  } catch (err) {
    removeTyping(typingId);
    appendBubble("ai", `**Error:** ${err.message}`);
  }

  isLoading = false;
}


// ══════════════════════════════════════
//  PARSE FOLLOW-UPS
// ══════════════════════════════════════
function parseFollowups(raw) {
  const lines = raw.split("\n");
  const fIdx = lines.findIndex(l => l.trim().startsWith("FOLLOWUPS:"));
  let followups = [], cleanReply = raw;
  if (fIdx !== -1) {
    followups = lines.slice(fIdx + 1)
      .filter(l => l.trim().startsWith("-"))
      .map(l => l.trim().replace(/^-\s*/, "").trim())
      .filter(Boolean).slice(0, 3);
    cleanReply = lines.slice(0, fIdx).join("\n").trim();
  }
  return { cleanReply, followups };
}

function showFollowups(questions) {
  const bar = document.getElementById("followup-bar");
  bar.innerHTML = "";
  bar.classList.remove("hidden");
  questions.forEach(q => {
    const chip = document.createElement("button");
    chip.className = "followup-chip";
    chip.textContent = q;
    chip.onclick = () => ask(q);
    bar.appendChild(chip);
  });
}


// ══════════════════════════════════════
//  EXPORT CHAT
// ══════════════════════════════════════
function exportChat() {
  if (!chatHistory.length) { alert("No messages to export!"); return; }
  const lines = [
    "MY ASSISTANT — Chat Export",
    `Date: ${new Date().toLocaleString()}`,
    "═══════════════════════════\n"
  ];
  chatHistory.forEach(m => {
    lines.push(`[${m.role === "user" ? "YOU" : "ASSISTANT"}]`);
    lines.push(m.content);
    lines.push("\n───────────────────────────\n");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `chat-${Date.now()}.txt`;
  a.click();
}


// ══════════════════════════════════════
//  UI — BUBBLES
// ══════════════════════════════════════
function appendBubble(role, text, animate = true) {
  const list = document.getElementById("messages-list");
  const isUser = role === "user";
  const block = document.createElement("div");
  block.className = `message-block ${role}`;
  if (!animate) block.style.animation = "none";
  block.innerHTML = `
    <div class="message-inner">
      <div class="msg-avatar ${isUser ? "user-ava" : "ai-ava"}">${isUser ? "Y" : "M"}</div>
      <div class="msg-content">
        ${isUser ? `<p>${escapeHtml(text)}</p>` : marked.parse(text)}
        ${!isUser ? `
          <div class="msg-actions">
            <button class="msg-action-btn" onclick="copyMsg(this, \`${escapeForAttr(text)}\`)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
          </div>` : ""}
      </div>
    </div>`;
  list.appendChild(block);
  document.getElementById("messages-container").scrollTop = 99999;
}

async function copyMsg(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "✓ Copied!";
    setTimeout(() => { btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`; }, 2000);
  } catch(_) {}
}


// ══════════════════════════════════════
//  TYPING INDICATOR
// ══════════════════════════════════════
function showTyping() {
  const id = "t-" + Date.now();
  const list = document.getElementById("messages-list");
  const block = document.createElement("div");
  block.id = id; block.className = "message-block ai";
  block.innerHTML = `<div class="message-inner"><div class="msg-avatar ai-ava">M</div><div class="msg-content"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  list.appendChild(block);
  document.getElementById("messages-container").scrollTop = 99999;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}


// ══════════════════════════════════════
//  SIDEBAR + INPUT
// ══════════════════════════════════════
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

document.addEventListener("DOMContentLoaded", () => {
  newChat();
  const input = document.getElementById("msg-input");
  input.addEventListener("input", () => {
    updateSendBtn();
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 200) + "px";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.value.trim()) sendMessage();
    }
  });
});

function updateSendBtn() {
  const has = document.getElementById("msg-input").value.trim().length > 0;
  const btn = document.getElementById("send-btn");
  btn.disabled = !has;
  btn.classList.toggle("active", has);
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escapeForAttr(str) {
  return str.replace(/\\/g,"\\\\").replace(/`/g,"\\`").replace(/\$/g,"\\$");
}