const input = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");
const micBtn = document.getElementById("micBtn");
const themeMenu = document.getElementById("themeMenu");
const recentChats = document.getElementById("recentChats");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const welcomeText = document.getElementById("welcomeText");
const modelPickerButton = document.getElementById("modelPickerButton");
const modelMenu = document.getElementById("modelMenu");
const selectedModelLabel = document.getElementById("selectedModelLabel");

const themes = ["theme-light", "theme-dark", "theme-blue", "theme-green", "theme-dark-blue", "theme-dark-red"];
const nyxoModels = {
  "nyxo-1.3": "NYXO 1.3",
  "nyxo-flash": "NYXO Flash",
  "nyxo-pro": "NYXO Pro",
  "nyxo-beta": "NYXO Beta"
};
const chatStorageKey = "nyxoChatHistory";
let currentChatId = null;
let autoThemeTimer = null;
let attachedImage = null;
let selectedModelKey = localStorage.getItem("nyxoModel") || "nyxo-flash";
let recognition = null;
let isListening = false;

function setTheme(themeName, saveChoice = true) {
  document.body.classList.remove(...themes);
  document.body.classList.add(themeName);

  if (saveChoice) {
    clearInterval(autoThemeTimer);
    localStorage.setItem("theme", themeName);
    localStorage.setItem("themeMode", "manual");
  }
}

function toggleThemes() {
  themeMenu.classList.toggle("open");
}

function startAutoTheme() {
  localStorage.setItem("themeMode", "auto");
  cycleTheme();
  clearInterval(autoThemeTimer);
  autoThemeTimer = setInterval(cycleTheme, 15000);
  themeMenu.classList.remove("open");
}

function cycleTheme() {
  const currentTheme = themes.find((theme) => document.body.classList.contains(theme)) || themes[0];
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  setTheme(nextTheme, false);
}

function addMessage(type, text, image = null) {
  const div = document.createElement("div");
  div.className = type;

  const content = document.createElement("div");

  if (type === "ai" && window.marked) {
    content.innerHTML = marked.parse(text);
  } else {
    content.textContent = text;
  }

  div.appendChild(content);

  if (image) {
    const img = document.createElement("img");
    img.className = "message-image";
    img.src = image.dataUrl;
    img.alt = image.name || "Uploaded image";
    div.appendChild(img);
  }

  document.body.classList.add("has-messages");
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const msg = input.value.trim();
  const image = attachedImage;

  if (!msg && !image) return;

  const userText = msg || "Uploaded an image";
  addMessage("user", userText, image);
  saveMessage("user", userText, image);
  input.value = "";
  clearAttachedImage();
  input.focus();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        image: image,
        modelKey: selectedModelKey
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.reply || "AI request failed");
    }

    const reply = data.reply || "No response";
    addMessage("ai", reply, data.image || null);
    saveMessage("ai", reply, data.image || null);
  } catch (err) {
    const errorMessage = err.message || "Connection error. Please check the server and try again.";
    addMessage("ai", errorMessage);
    saveMessage("ai", errorMessage);
  }
}

function openImagePicker() {
  imageInput.click();
}

function clearAttachedImage() {
  attachedImage = null;
  imageInput.value = "";
  imagePreview.innerHTML = "";
  imagePreview.classList.remove("active");
}

function renderImagePreview(image) {
  imagePreview.innerHTML = "";
  imagePreview.classList.add("active");

  const img = document.createElement("img");
  img.src = image.dataUrl;
  img.alt = image.name;

  const name = document.createElement("span");
  name.textContent = image.name;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "x";
  remove.setAttribute("aria-label", "Remove image");
  remove.addEventListener("click", clearAttachedImage);

  imagePreview.append(img, name, remove);
}

function handleImageUpload(file) {
  if (!file || !file.type.startsWith("image/")) return;

  if (file.size > 4 * 1024 * 1024) {
    alert("Please upload an image smaller than 4MB.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    attachedImage = {
      name: file.name,
      type: file.type,
      dataUrl: reader.result
    };

    renderImagePreview(attachedImage);
  };

  reader.readAsDataURL(file);
}

function setModel(modelKey) {
  if (!nyxoModels[modelKey]) return;

  selectedModelKey = modelKey;
  localStorage.setItem("nyxoModel", modelKey);
  selectedModelLabel.textContent = nyxoModels[modelKey];

  document.querySelectorAll(".model-option").forEach((button) => {
    const isActive = button.dataset.model === modelKey;
    button.classList.toggle("active", isActive);
    button.querySelector(".model-check").textContent = isActive ? "✓" : "";
  });

  modelMenu.classList.remove("open");
  modelPickerButton.setAttribute("aria-expanded", "false");
}

function toggleModelMenu() {
  const isOpen = modelMenu.classList.toggle("open");
  modelPickerButton.setAttribute("aria-expanded", String(isOpen));
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.title = "Voice input is not supported in this browser";
    micBtn.classList.add("unsupported");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    micBtn.setAttribute("aria-label", "Stop voice input");
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    micBtn.setAttribute("aria-label", "Voice input");
  };

  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };

  recognition.onresult = (event) => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    input.value = transcript.trim();
    input.focus();
  };
}

function toggleVoiceInput() {
  if (!recognition) {
    alert("Voice input is not supported in this browser.");
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function openLogin() {
  document.getElementById("loginPopup").style.display = "flex";
}

function closeLogin() {
  document.getElementById("loginPopup").style.display = "none";
}

async function login() {
  alert("Login button working");
}

async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    await firebase.auth().signInWithPopup(provider);
    closeLogin();
  } catch (error) {
    console.error(error);
    alert("Google login failed");
  }
}

function toggleAccountMenu() {
  const menu = document.getElementById("accountMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

async function logout() {
  await firebase.auth().signOut();
  location.reload();
}

async function changeAccount() {
  await firebase.auth().signOut();
  openLogin();
}

function openHistory() {
  document.getElementById("historyPopup").style.display = "flex";
  loadHistory();
}

function closeHistory() {
  document.getElementById("historyPopup").style.display = "none";
}

function getSavedChats() {
  try {
    return JSON.parse(localStorage.getItem(chatStorageKey)) || [];
  } catch (err) {
    return [];
  }
}

function setSavedChats(chats) {
  localStorage.setItem(chatStorageKey, JSON.stringify(chats));
}

function createChat(firstMessage) {
  const title = firstMessage.substring(0, 48) || "New chat";

  return {
    id: Date.now().toString(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
}

function saveMessage(role, text, image = null) {
  try {
    const chats = getSavedChats();
    let chat = chats.find((item) => item.id === currentChatId);

    if (!chat) {
      chat = createChat(text);
      currentChatId = chat.id;
      chats.unshift(chat);
    }

    chat.messages.push({ role, text, image, createdAt: new Date().toISOString() });
    chat.updatedAt = new Date().toISOString();

    if (role === "user" && chat.messages.filter((message) => message.role === "user").length === 1) {
      chat.title = text.substring(0, 48);
    }

    setSavedChats(chats);
    renderRecentChats();
  } catch (err) {
    console.log("History save error:", err);
  }
}

function startNewChat() {
  currentChatId = null;
  chatBox.innerHTML = "";
  document.body.classList.remove("has-messages");
  input.value = "";
  clearAttachedImage();
  input.focus();
}

function openSavedChat(chatId) {
  const chat = getSavedChats().find((item) => item.id === chatId);
  if (!chat) return;

  currentChatId = chat.id;
  chatBox.innerHTML = "";

  chat.messages.forEach((message) => {
    addMessage(message.role === "ai" ? "ai" : "user", message.text, message.image);
  });

  closeHistory();
}

function renderRecentChats() {
  if (!recentChats) return;

  recentChats.querySelectorAll("button").forEach((button) => button.remove());

  const chats = getSavedChats().slice(0, 8);

  if (!chats.length) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.disabled = true;
    empty.innerText = "No saved chats yet";
    recentChats.appendChild(empty);
    return;
  }

  chats.forEach((chat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerText = chat.title || "Untitled chat";
    button.addEventListener("click", () => openSavedChat(chat.id));
    recentChats.appendChild(button);
  });
}

function loadHistory() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  const chats = getSavedChats();

  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.innerText = "No saved chats yet";
    historyList.appendChild(empty);
    return;
  }

  chats.forEach((chat) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerText = chat.title || "Untitled chat";
    div.addEventListener("click", () => openSavedChat(chat.id));
    historyList.appendChild(div);
  });
}

function renderAccount(user) {
  const accountArea = document.getElementById("accountArea");
  if (!accountArea) return;

  if (user) {
    const photo = user.photoURL || "logo.png";
    const name = user.displayName || user.email || "Nyxo user";
    const firstName = name.split(" ")[0].split("@")[0];
    welcomeText.textContent = `Welcome, ${firstName}. What's going on?`;

    accountArea.innerHTML = `
      <div class="account-wrapper">
        <div class="account-box" onclick="toggleAccountMenu()">
          <img src="${photo}" class="account-pfp" alt="">
          <span>${name}</span>
        </div>
        <div class="account-menu" id="accountMenu">
          <button onclick="changeAccount()" type="button">Change Account</button>
          <button onclick="logout()" type="button">Logout</button>
        </div>
      </div>
    `;
  } else {
    welcomeText.textContent = "Welcome. What's going on?";
    accountArea.innerHTML = `
      <button class="login-btn" onclick="openLogin()" id="loginButton" type="button">
        Login
      </button>
    `;
  }
}

micBtn.addEventListener("click", toggleVoiceInput);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

imageInput.addEventListener("change", () => {
  handleImageUpload(imageInput.files[0]);
});

modelPickerButton.addEventListener("click", toggleModelMenu);

document.querySelectorAll(".model-option").forEach((button) => {
  button.addEventListener("click", () => {
    setModel(button.dataset.model);
  });
});

document.addEventListener("click", (event) => {
  if (!modelMenu.contains(event.target) && !modelPickerButton.contains(event.target)) {
    modelMenu.classList.remove("open");
    modelPickerButton.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll(".quick-actions button").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.innerText === "Analyze an image"
      ? "What is in this image?"
      : button.innerText;
    input.focus();
  });
});

window.addEventListener("load", () => {
  const saved = localStorage.getItem("theme");
  const themeMode = localStorage.getItem("themeMode");

  setTheme(themes.includes(saved) ? saved : "theme-light", false);

  if (themeMode === "auto") {
    startAutoTheme();
  }

  renderRecentChats();
  setModel(nyxoModels[selectedModelKey] ? selectedModelKey : "nyxo-flash");
  setupVoiceInput();

  if (window.firebase) {
    firebase.auth().onAuthStateChanged(renderAccount);
  }
});
