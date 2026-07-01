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
  const userMessage = input.value;

saveChat(userMessage);
  
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
function openLogin() {
  document.getElementById("loginPopup").style.display = "flex";
}

function closeLogin() {
  document.getElementById("loginPopup").style.display = "none";
}
async function login() {

  const gmail = document.getElementById("gmail").value;

  const password = document.getElementById("password").value;

  alert("Login button working");

}
async function googleLogin() {

  const provider = new firebase.auth.GoogleAuthProvider();

  try {

    const result = await firebase.auth().signInWithPopup(provider);

    const user = result.user;

    closeLogin();

    // REMOVE LOGIN BUTTON
    document.getElementById("loginButton").style.display = "none";

    // SHOW ACCOUNT NAME
    

  } catch (error) {

    console.error(error);

    alert("Google login failed");

  }

}
function toggleAccountMenu() {

  const menu = document.getElementById("accountMenu");

  if (menu.style.display === "block") {

    menu.style.display = "none";

  } else {

    menu.style.display = "block";

  }

}
async function logout() {

  await firebase.auth().signOut();

  location.reload();

}
async function changeAccount() {

  await firebase.auth().signOut();

  openLogin();

}

function toggleThemes() {

  const menu = document.getElementById("themeMenu");

  if (menu.style.display === "block") {

    menu.style.display = "none";

  } else {

    menu.style.display = "block";

  }

}

function setTheme(themeName) {

  document.body.className = themeName;

  localStorage.setItem("theme", themeName);

}
function openHistory() {

  const user = firebase.auth().currentUser;

  // USER NOT LOGGED IN
  if (!user) {

    openLogin();

    alert("Login first to use history");

    return;
  }

  document.getElementById("historyPopup").style.display = "flex";

  loadHistory();

}

function closeHistory() {

  document.getElementById("historyPopup").style.display = "none";

}
function saveChat(message) {

  try {

    const user = firebase.auth().currentUser;

    // STOP IF NOT LOGGED IN
    if (!user) return;

    let chats = JSON.parse(localStorage.getItem("chatHistory")) || [];

    chats.push(message);

    localStorage.setItem("chatHistory", JSON.stringify(chats));

  } catch (err) {

    console.log("History save error:", err);

  }

}
function loadHistory() {

  const historyList = document.getElementById("historyList");

  historyList.innerHTML = "";

  let chats = JSON.parse(localStorage.getItem("chatHistory")) || [];

  chats.forEach(chat => {

    const div = document.createElement("div");

    div.className = "history-item";

    // FIRST MESSAGE TITLE
    div.innerText = chat.substring(0, 40);

    historyList.appendChild(div);

  });

}
window.addEventListener("load", () => {

  firebase.auth().onAuthStateChanged((user) => {

    const accountArea = document.getElementById("accountArea");

    if (!accountArea) return;

    // USER LOGGED IN
    if (user) {

      accountArea.innerHTML = `

        <div class="account-wrapper">

          <div class="account-box" onclick="toggleAccountMenu()">

            <img src="${user.photoURL}" class="account-pfp">

            <span>${user.displayName}</span>

          </div>

          <div class="account-menu" id="accountMenu">

            <button onclick="changeAccount()">
              Change Account
            </button>

            <button onclick="logout()">
              Logout
            </button>

          </div>

        </div>

      `;

    }

    // USER LOGGED OUT
    else {

      accountArea.innerHTML = `

        <button class="login-btn" onclick="openLogin()" id="loginButton">
          Login
        </button>

      `;

    }

  });

});