const input = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");
const sendBtn = document.getElementById("sendBtn");

function typeWriter(element, text, speed = 80) {
  element.innerHTML = "";

  const words = text.split(" ");
  let i = 0;

  function addWord() {
    if (i < words.length) {
      element.innerHTML += words[i] + " ";
      i++;
      setTimeout(addWord, speed);
    }
  }

  addWord();
}

function addMessage(type, text) {

  const div = document.createElement("div");
  div.className = type;

  if (type === "ai") {
    div.innerHTML = marked.parse(text);
  } else {
    div.textContent = text;
  }

  chatBox.appendChild(div);

  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  addMessage("user", msg);
  input.value = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    const data = await res.json();
    addMessage("ai", data.reply || "No response");

  } catch (err) {
    addMessage("ai", "Connection Error");
  }
}

/* EVENTS */
sendBtn.onclick = sendMessage;

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* THEME */
window.setTheme = function(theme) {
  const body = document.body;

  // remove all themes
  body.classList.remove(
    "theme-neon",
    "theme-blue",
    "theme-green",
    "theme-purple"
  );

  // add selected theme
  body.classList.add(theme);

  // save theme (optional but useful)
  localStorage.setItem("theme", theme);
};

/* load saved theme */
window.onload = () => {
  const saved = localStorage.getItem("theme");
  if (saved) {
    document.body.classList.add(saved);
  } else {
    document.body.classList.add("theme-neon");
  }
};