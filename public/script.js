// DOM elements
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const historyBtn = document.getElementById("historyBtn");
const historyPanel = document.getElementById("historyPanel");
const historyContent = document.getElementById("historyContent");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const themeToggle = document.getElementById("themeToggle");

const API_URL = "/api/chat";
const HISTORY_KEY = "chatHistory";
const THEME_KEY = "chatTheme";

// Event listeners
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
historyBtn.addEventListener("click", toggleHistoryPanel);
closeHistoryBtn.addEventListener("click", () => historyPanel.hidden = true);
clearHistoryBtn.addEventListener("click", clearHistory);
themeToggle.addEventListener("click", toggleTheme);

window.addEventListener("load", () => {
  renderHistoryPanel();
  applySavedTheme();
});

function getHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistoryItem(role, content) {
  const history = getHistory();
  history.push({ role, content, timestamp: Date.now() });
  setHistory(history);
}

function renderMessage(message, container) {
  const el = document.createElement("div");
  el.className = `message ${message.role}`;
  el.innerText = message.content;
  container.appendChild(el);
}

function renderHistoryMessage(message) {
  const el = document.createElement("div");
  el.className = `history-message ${message.role}`;
  el.innerText = message.content;
  historyContent.appendChild(el);
}

function renderChat(messages) {
  chatBox.innerHTML = "";
  messages.forEach((message) => renderMessage(message, chatBox));
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderHistoryPanel() {
  historyContent.innerHTML = "";
  const history = getHistory();

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-message ai";
    empty.innerText = "No saved history yet. Your chats will appear here.";
    historyContent.appendChild(empty);
    return;
  }

  history.forEach(renderHistoryMessage);
}

function toggleHistoryPanel() {
  historyPanel.hidden = !historyPanel.hidden;
  if (!historyPanel.hidden) {
    renderHistoryPanel();
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.className = "message user";
  userMsg.innerText = text;
  chatBox.appendChild(userMsg);
  addHistoryItem("user", text);

  userInput.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  const typingMsg = document.createElement("div");
  typingMsg.className = "message ai";
  typingMsg.innerHTML = `
    <div class="typing">
      <span></span><span></span><span></span>
    </div>
  `;
  chatBox.appendChild(typingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = errorText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.reply || errorText;
      } catch {}
      throw new Error(`Server returned ${res.status}: ${errorMessage}`);
    }

    const data = await res.json();
    const replyText = data.reply || "Sorry, I cannot reply right now.";
    typingMsg.innerText = replyText;
    addHistoryItem("ai", replyText);
  } catch (err) {
    console.error("Chat error:", err);
    typingMsg.innerText = err.message.includes("Failed to fetch")
      ? "Server connection failed. Is backend running on port 3000?"
      : err.message;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  historyContent.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "history-message ai";
  empty.innerText = "No saved history yet. Your chats will appear here.";
  historyContent.appendChild(empty);
}

function applySavedTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "light";
  document.body.classList.toggle("dark-theme", theme === "dark");
  themeToggle.innerText = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.innerText = isDark ? "☀️" : "🌙";
}
