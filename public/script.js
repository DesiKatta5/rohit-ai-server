function setTheme(theme) {
  document.body.className = theme + "-theme";
  localStorage.setItem("theme", theme);
}

window.onload = function () {
  setTheme(localStorage.getItem("theme") || "default");
};

function formatMessage(text) {
  text = text.replace(/\*\*/g, "");

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text
    .replace(urlRegex, function (url) {

      // safe cleanup of trailing characters
      let cleanUrl = url;

      while (cleanUrl.length > 0) {
        const last = cleanUrl.slice(-1);

        if (last === ")" || last === "." || last === "," || last === "!" || last === "?") {
          cleanUrl = cleanUrl.slice(0, -1);
        } else {
          break;
        }
      }

      return `<a class="chat-link" href="${cleanUrl}" target="_blank">🔗 ${cleanUrl}</a>`;
    })
    .replace(/\n/g, "<br>");
}

function addMessage(content, type) {
  const chatBox = document.getElementById("chat-box");

  chatBox.innerHTML += `
    <div class="message-row ${type}-row">
      <div class="message-content">
        ${content}
      </div>
    </div>
  `;

  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("message");
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");

  input.value = "";

  const loadingId = Date.now();

  addMessage("AI is thinking...", "ai");

  try {
    const res = await fetch("https://rohit-ai-server.onrender.com/chat",{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();

    const chatBox = document.getElementById("chat-box");

    chatBox.lastElementChild.remove();

    addMessage(formatMessage(data.reply), "ai");

  } catch (err) {
    addMessage("Connection error.", "ai");
  }
}

document.getElementById("message").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});