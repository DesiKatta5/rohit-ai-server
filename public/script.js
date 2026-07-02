const input = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");
const micBtn = document.getElementById("micBtn");
const voiceChatBtn = document.getElementById("voiceChatBtn");
const voiceOrbPanel = document.getElementById("voiceOrbPanel");
const voiceOrbStatus = document.getElementById("voiceOrbStatus");
const themeMenu = document.getElementById("themeMenu");
const gameMenu = document.getElementById("gameMenu");
const recentChats = document.getElementById("recentChats");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const welcomeText = document.getElementById("welcomeText");
const modelPickerButton = document.getElementById("modelPickerButton");
const modelMenu = document.getElementById("modelMenu");
const selectedModelLabel = document.getElementById("selectedModelLabel");
const thinkingToggle = document.getElementById("thinkingToggle");
const thinkingMenu = document.getElementById("thinkingMenu");
const selectedThinkingLabel = document.getElementById("selectedThinkingLabel");
const app = document.querySelector(".app");
const sidebar = document.getElementById("appSidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const gamesButton = document.getElementById("gamesButton");
const searchPopup = document.getElementById("searchPopup");
const chatSearchInput = document.getElementById("chatSearchInput");
const searchResults = document.getElementById("searchResults");

const themes = ["theme-light", "theme-dark", "theme-blue", "theme-green", "theme-dark-blue", "theme-dark-red"];
const mobileSidebarQuery = window.matchMedia("(max-width: 760px)");
const nyxoModels = {
  "nyxo-1.3": "NYXO 1.3",
  "nyxo-flash": "NYXO Flash",
  "nyxo-pro": "NYXO Pro",
  "nyxo-beta": "NYXO Beta"
};
const thinkingLevels = {
  normal: "Normal",
  medium: "Medium",
  high: "High",
  highest: "Highest"
};
const chatStorageKey = "nyxoChatHistory";
const signInHistoryText = "Log in to see saved chats";
const maxChatContextMessages = 14;
const games = {
  roblox: "Roblox",
  minecraft: "Minecraft"
};
const gameMentionPatterns = {
  roblox: /\b(roblox|robux|blox|obby|brookhaven|bloxburg|doors|adopt me|studio|lua script|avatar)\b/i,
  minecraft: /\b(minecraft|mcpe|bedrock|java edition|creeper|redstone|nether|ender|herobrine|minecart|crafting|survival mode)\b/i
};
let currentChatId = null;
let autoThemeTimer = null;
let attachedImage = null;
let selectedModelKey = localStorage.getItem("nyxoModel") || "nyxo-flash";
let selectedThinkingLevel = localStorage.getItem("nyxoThinkingLevel") || "normal";
let selectedGameKey = localStorage.getItem("nyxoSelectedGame") || "";
let openGamesAfterLogin = false;
let recognition = null;
let isListening = false;
let voiceRecognition = null;
let isVoiceModeActive = false;
let isVoiceModeListening = false;
let isVoiceModeBusy = false;
let voiceTranscriptSent = false;
let voiceAudioStream = null;
let voiceAudioContext = null;
let voiceAudioAnalyser = null;
let voiceAudioData = null;
let voiceAudioFrame = null;
let voiceInterruptStartedAt = 0;
let voiceReplyStartedAt = 0;
let isCancellingVoiceReply = false;
let currentChatMessages = [];
let activeUser = null;

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

  if (gameMenu) {
    gameMenu.classList.remove("open");
    gamesButton.classList.remove("active");
  }
}

function openGames() {
  if (!activeUser) {
    gameMenu.classList.remove("open");
    gamesButton.classList.remove("active");
    openGamesAfterLogin = true;
    openLogin();
    return;
  }

  themeMenu.classList.remove("open");
  const isOpen = gameMenu.classList.toggle("open");
  gamesButton.classList.toggle("active", isOpen);
}

function setGame(gameKey) {
  if (!games[gameKey]) return;

  selectedGameKey = gameKey;
  localStorage.setItem("nyxoSelectedGame", gameKey);
  gameMenu.classList.remove("open");
  gamesButton.classList.remove("active");

  document.querySelectorAll(".game-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.game === gameKey);
  });

  input.placeholder = `Ask anything about ${games[gameKey]}`;
  input.value = "";
  addMessage("ai", `Game mode selected: ${games[gameKey]}. Ask me anything about ${games[gameKey]}.`);
  input.focus();
}

function clearGameMode() {
  selectedGameKey = "";
  localStorage.removeItem("nyxoSelectedGame");
  input.placeholder = "Ask anything";

  document.querySelectorAll(".game-btn").forEach((button) => {
    button.classList.remove("active");
  });
}

function syncGameButtons() {
  if (!gameMenu) return;

  document.querySelectorAll(".game-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.game === selectedGameKey);
  });

  input.placeholder = selectedGameKey && games[selectedGameKey]
    ? `Ask anything about ${games[selectedGameKey]}`
    : "Ask anything";
}

function isMobileSidebar() {
  return mobileSidebarQuery.matches;
}

function syncSidebarButtons() {
  const sidebarIsOpen = app.classList.contains("sidebar-open");
  const sidebarIsCollapsed = app.classList.contains("sidebar-collapsed");
  const expanded = isMobileSidebar() ? sidebarIsOpen : !sidebarIsCollapsed;

  if (sidebarToggle) {
    sidebarToggle.setAttribute("aria-expanded", String(expanded));
    sidebarToggle.setAttribute("aria-label", expanded ? "Collapse sidebar" : "Open sidebar");
  }

  if (mobileMenuButton) {
    mobileMenuButton.setAttribute("aria-expanded", String(expanded));
    mobileMenuButton.setAttribute("aria-label", expanded ? "Close sidebar" : "Open sidebar");
  }
}

function closeSidebar() {
  if (isMobileSidebar()) {
    app.classList.remove("sidebar-open");
  } else {
    app.classList.add("sidebar-collapsed");
  }

  syncSidebarButtons();
}

function openSidebar() {
  if (isMobileSidebar()) {
    app.classList.add("sidebar-open");
    app.classList.remove("sidebar-collapsed");
  } else {
    app.classList.remove("sidebar-collapsed");
  }

  syncSidebarButtons();
}

function toggleSidebar() {
  if (isMobileSidebar()) {
    if (app.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }

    return;
  }

  if (app.classList.contains("sidebar-collapsed")) {
    openSidebar();
  } else {
    closeSidebar();
  }
}

function handleSidebarViewportChange() {
  app.classList.remove("sidebar-open");

  if (isMobileSidebar()) {
    app.classList.remove("sidebar-collapsed");
  }

  syncSidebarButtons();
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

function appendMessageImage(messageElement, image, type) {
  if (!image) return;

  const img = document.createElement("img");
  img.className = "message-image";
  img.src = image.dataUrl;
  img.alt = image.name || "Uploaded image";
  messageElement.appendChild(img);

  if (type === "ai" && image.dataUrl) {
    const download = document.createElement("a");
    download.className = "image-download";
    download.href = image.dataUrl;
    download.download = image.name || "enhanced-image.jpg";
    download.textContent = "Download image";
    messageElement.appendChild(download);
  }
}

function scrollChatToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function typeAiMessage(content, text, messageElement, image) {
  const fullText = String(text || "");
  const startedAt = performance.now();
  const charsPerSecond = Math.min(180, Math.max(80, Math.round(fullText.length / 7)));
  let lastVisibleLength = -1;

  content.classList.add("typing-text");

  function renderFrame(now) {
    const elapsedSeconds = (now - startedAt) / 1000;
    const visibleLength = Math.min(fullText.length, Math.floor(elapsedSeconds * charsPerSecond));

    if (visibleLength !== lastVisibleLength) {
      content.textContent = fullText.slice(0, visibleLength);
      lastVisibleLength = visibleLength;
      scrollChatToBottom();
    }

    if (visibleLength < fullText.length) {
      requestAnimationFrame(renderFrame);
      return;
    }

    content.classList.remove("typing-text");

    if (window.marked) {
      content.innerHTML = marked.parse(fullText);
    }

    appendMessageImage(messageElement, image, "ai");
    scrollChatToBottom();
  }

  requestAnimationFrame(renderFrame);
}

function addMessage(type, text, image = null, options = {}) {
  const div = document.createElement("div");
  div.className = type;

  const content = document.createElement("div");

  if (options.typewriter && type === "ai") {
    content.textContent = "";
  } else if (type === "ai" && window.marked) {
    content.innerHTML = marked.parse(text);
  } else {
    content.textContent = text;
  }

  div.appendChild(content);

  if (!options.typewriter) {
    appendMessageImage(div, image, type);
  }

  document.body.classList.add("has-messages");
  chatBox.appendChild(div);
  scrollChatToBottom();

  if (options.typewriter && type === "ai") {
    typeAiMessage(content, text, div, image);
  }

  return div;
}

function addThinkingMessage() {
  const div = document.createElement("div");
  div.className = "ai thinking-message";
  div.setAttribute("aria-label", "AI is thinking");

  const loader = document.createElement("div");
  loader.className = "thinking-loader";

  const dots = document.createElement("div");
  dots.className = "thinking-dots";
  dots.setAttribute("aria-hidden", "true");

  for (let i = 0; i < 3; i++) {
    dots.appendChild(document.createElement("span"));
  }

  loader.appendChild(dots);
  div.appendChild(loader);
  document.body.classList.add("has-messages");
  chatBox.appendChild(div);
  scrollChatToBottom();

  return div;
}

function isEnhancementPrompt(message) {
  const text = String(message || "").trim();

  if (!text || /^uploaded an image$/i.test(text)) {
    return true;
  }

  return /\b(enhance|improve|make better|fix|retouch|restore|upscale|clear|clarity|sharpen|denoise|brighten|color correct|colour correct|quality|beautify|clean up|photo edit)\b/i.test(text);
}

function getGameKeyForMessage(message) {
  if (!activeUser || !selectedGameKey || !gameMentionPatterns[selectedGameKey]) {
    return "";
  }

  return gameMentionPatterns[selectedGameKey].test(message) ? selectedGameKey : "";
}

function rememberChatMessage(role, text) {
  const cleanText = String(text || "").trim();

  if (!cleanText || !["user", "ai"].includes(role)) {
    return;
  }

  currentChatMessages.push({ role, text: cleanText });

  if (currentChatMessages.length > maxChatContextMessages) {
    currentChatMessages = currentChatMessages.slice(-maxChatContextMessages);
  }
}

function getChatContextForRequest() {
  return currentChatMessages
    .slice(-maxChatContextMessages)
    .map((message) => ({
      role: message.role,
      text: message.text
    }));
}

function syncCurrentChatMemory(messages = []) {
  currentChatMessages = [];

  messages.forEach((message) => {
    rememberChatMessage(message.role === "ai" ? "ai" : "user", message.text);
  });
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function enhancePixels(imageData) {
  const data = imageData.data;
  let luminanceTotal = 0;
  let luminanceSquaredTotal = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const luminance = (0.2126 * data[i]) + (0.7152 * data[i + 1]) + (0.0722 * data[i + 2]);
    luminanceTotal += luminance;
    luminanceSquaredTotal += luminance * luminance;
  }

  const averageLuminance = luminanceTotal / pixelCount;
  const variance = Math.max(0, (luminanceSquaredTotal / pixelCount) - (averageLuminance * averageLuminance));
  const contrast = variance < 1400 ? 1.16 : 1.08;
  const brightness = averageLuminance < 105 ? 16 : averageLuminance > 185 ? -7 : 5;
  const saturation = 1.08;
  const gamma = averageLuminance < 105 ? 0.94 : averageLuminance > 190 ? 1.04 : 1;

  for (let i = 0; i < data.length; i += 4) {
    let red = data[i];
    let green = data[i + 1];
    let blue = data[i + 2];

    red = 255 * Math.pow(red / 255, gamma);
    green = 255 * Math.pow(green / 255, gamma);
    blue = 255 * Math.pow(blue / 255, gamma);

    red = ((red - 128) * contrast) + 128 + brightness;
    green = ((green - 128) * contrast) + 128 + brightness;
    blue = ((blue - 128) * contrast) + 128 + brightness;

    const luminance = (0.299 * red) + (0.587 * green) + (0.114 * blue);
    data[i] = clampColor(luminance + ((red - luminance) * saturation));
    data[i + 1] = clampColor(luminance + ((green - luminance) * saturation));
    data[i + 2] = clampColor(luminance + ((blue - luminance) * saturation));
  }

  return imageData;
}

function sharpenPixels(imageData, amount = 0.16) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        const center = source[index + channel];
        const left = source[index + channel - 4];
        const right = source[index + channel + 4];
        const top = source[index + channel - (width * 4)];
        const bottom = source[index + channel + (width * 4)];
        const detail = (4 * center) - left - right - top - bottom;

        data[index + channel] = clampColor(center + (detail * amount));
      }
    }
  }

  return imageData;
}

async function createEnhancedImage(image) {
  const img = await loadImageElement(image.dataUrl);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  ctx.putImageData(sharpenPixels(enhancePixels(imageData)), 0, 0);

  const outputType = image.type === "image/png" ? "image/png" : "image/jpeg";
  const extension = outputType === "image/png" ? "png" : "jpg";
  const originalName = image.name ? image.name.replace(/\.[^.]+$/, "") : "uploaded-image";

  return {
    name: `${originalName}-enhanced.${extension}`,
    type: outputType,
    dataUrl: canvas.toDataURL(outputType, 0.92)
  };
}

async function requestAiReply(userText, image = null, options = {}) {
  const { focusInput = true, speakReply = false } = options;

  const enhancedImagePromise = image && isEnhancementPrompt(userText)
    ? createEnhancedImage(image).catch((error) => {
        console.error("Image enhancement error:", error);
        return null;
      })
    : Promise.resolve(null);

  addMessage("user", userText, image);
  saveMessage("user", userText, image);
  rememberChatMessage("user", userText);

  if (focusInput) {
    input.focus();
  }

  const thinkingMessage = addThinkingMessage();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        image: image,
        modelKey: selectedModelKey,
        thinkingLevel: selectedThinkingLevel,
        gameKey: getGameKeyForMessage(userText),
        history: getChatContextForRequest()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.reply || "AI request failed");
    }

    const enhancedImage = data.imageAction === "enhance" ? await enhancedImagePromise : null;
    const responseImage = data.image || enhancedImage;
    const replyPrefix = enhancedImage
      ? "I made an automatic enhanced preview below.\n\n"
      : "";
    const reply = `${replyPrefix}${data.reply || "No response"}`;

    thinkingMessage.remove();
    addMessage("ai", reply, responseImage, { typewriter: true });
    saveMessage("ai", reply, responseImage);
    rememberChatMessage("ai", reply);

    if (speakReply) {
      speakAiReply(reply);
    }

    return reply;
  } catch (err) {
    const errorMessage = err.message || "Connection error. Please check the server and try again.";
    thinkingMessage.remove();
    addMessage("ai", errorMessage, null, { typewriter: true });
    saveMessage("ai", errorMessage);
    rememberChatMessage("ai", errorMessage);

    if (speakReply) {
      speakAiReply(errorMessage);
    }

    return errorMessage;
  }
}

async function sendMessage() {
  const msg = input.value.trim();
  const image = attachedImage;

  if (!msg && !image) return;

  const userText = msg || "Uploaded an image";
  input.value = "";
  clearAttachedImage();
  await requestAiReply(userText, image, { focusInput: true });
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

  if (file.size > 3 * 1024 * 1024) {
    alert("Please upload an image smaller than 3MB.");
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

  thinkingMenu.classList.remove("open");
  thinkingToggle.classList.remove("open");
  thinkingToggle.setAttribute("aria-expanded", "false");
  modelMenu.classList.remove("open");
  modelPickerButton.setAttribute("aria-expanded", "false");
}

function setThinkingLevel(levelKey, closeMenu = true) {
  if (!thinkingLevels[levelKey]) return;

  selectedThinkingLevel = levelKey;
  localStorage.setItem("nyxoThinkingLevel", levelKey);
  selectedThinkingLabel.textContent = thinkingLevels[levelKey];

  document.querySelectorAll(".thinking-option").forEach((button) => {
    const isActive = button.dataset.thinking === levelKey;
    button.classList.toggle("active", isActive);
    button.querySelector(".thinking-check").textContent = isActive ? "✓" : "";
  });

  if (closeMenu) {
    thinkingMenu.classList.remove("open");
    thinkingToggle.classList.remove("open");
    thinkingToggle.setAttribute("aria-expanded", "false");
  }
}

function toggleThinkingMenu() {
  const isOpen = thinkingMenu.classList.toggle("open");
  thinkingToggle.classList.toggle("open", isOpen);
  thinkingToggle.setAttribute("aria-expanded", String(isOpen));
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
    voiceChatBtn.title = "Voice chat is not supported in this browser";
    voiceChatBtn.classList.add("unsupported");
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

  setupVoiceChatRecognition(SpeechRecognition);
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

function setupVoiceChatRecognition(SpeechRecognition) {
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = "en-US";
  voiceRecognition.interimResults = true;
  voiceRecognition.continuous = false;

  voiceRecognition.onstart = () => {
    isVoiceModeListening = true;
    voiceTranscriptSent = false;
    document.body.classList.add("voice-mode-listening");
    setVoiceStatus("Listening...");
  };

  voiceRecognition.onend = () => {
    isVoiceModeListening = false;
    document.body.classList.remove("voice-mode-listening", "voice-mode-speaking");

    if (isVoiceModeActive && !isVoiceModeBusy) {
      setVoiceStatus("Listening...");
      window.setTimeout(startVoiceModeListening, 250);
      return;
    }

    if (!isVoiceModeActive) {
      setVoiceStatus("Voice mode off");
    }
  };

  voiceRecognition.onerror = (event) => {
    console.warn("Voice chat recognition error:", event.error);
    isVoiceModeListening = false;
    document.body.classList.remove("voice-mode-listening", "voice-mode-speaking");

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      stopVoiceMode();
      alert("Please allow microphone access to use voice chat.");
    }
  };

  voiceRecognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    const visibleTranscript = (finalTranscript || interimTranscript).trim();

    if (visibleTranscript) {
      input.value = visibleTranscript;
      setVoiceStatus(interimTranscript ? "Listening..." : "Sending...");
    }

    if (finalTranscript.trim() && !voiceTranscriptSent) {
      voiceTranscriptSent = true;
      handleVoiceMessage(finalTranscript.trim());
    }
  };
}

function setVoiceStatus(status) {
  if (voiceOrbStatus) {
    voiceOrbStatus.textContent = status;
  }
}

function startVoiceModeListening() {
  if (!voiceRecognition || !isVoiceModeActive || isVoiceModeBusy || isVoiceModeListening) {
    return;
  }

  try {
    voiceRecognition.start();
  } catch (error) {
    console.warn("Voice chat start skipped:", error);
  }
}

function stopVoiceModeListening() {
  if (voiceRecognition && isVoiceModeListening) {
    try {
      voiceRecognition.stop();
    } catch (error) {
      console.warn("Voice chat stop skipped:", error);
    }
  }
}

async function startVoiceAudioMeter() {
  if (!navigator.mediaDevices?.getUserMedia || voiceAudioStream) {
    return;
  }

  try {
    voiceAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    voiceAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    voiceAudioAnalyser = voiceAudioContext.createAnalyser();
    voiceAudioAnalyser.fftSize = 256;
    voiceAudioData = new Uint8Array(voiceAudioAnalyser.frequencyBinCount);

    const source = voiceAudioContext.createMediaStreamSource(voiceAudioStream);
    source.connect(voiceAudioAnalyser);
    updateVoiceAudioLevel();
  } catch (error) {
    console.warn("Voice audio meter unavailable:", error);
  }
}

function updateVoiceAudioLevel() {
  if (!voiceAudioAnalyser || !voiceAudioData || !isVoiceModeActive) {
    return;
  }

  voiceAudioAnalyser.getByteFrequencyData(voiceAudioData);

  const average = voiceAudioData.reduce((sum, value) => sum + value, 0) / voiceAudioData.length;
  const level = Math.min(1, Math.max(0, average / 95));
  document.documentElement.style.setProperty("--voice-level", level.toFixed(2));
  detectVoiceReplyInterruption(level);

  voiceAudioFrame = requestAnimationFrame(updateVoiceAudioLevel);
}

function detectVoiceReplyInterruption(level) {
  const canInterrupt = isVoiceModeActive &&
    isVoiceModeBusy &&
    document.body.classList.contains("voice-mode-speaking") &&
    window.speechSynthesis?.speaking &&
    !isCancellingVoiceReply &&
    performance.now() - voiceReplyStartedAt > 700;

  if (!canInterrupt) {
    voiceInterruptStartedAt = 0;
    return;
  }

  if (level < 0.32) {
    voiceInterruptStartedAt = 0;
    return;
  }

  if (!voiceInterruptStartedAt) {
    voiceInterruptStartedAt = performance.now();
    return;
  }

  if (performance.now() - voiceInterruptStartedAt > 260) {
    interruptVoiceReply();
  }
}

function stopVoiceAudioMeter() {
  if (voiceAudioFrame) {
    cancelAnimationFrame(voiceAudioFrame);
    voiceAudioFrame = null;
  }

  if (voiceAudioStream) {
    voiceAudioStream.getTracks().forEach((track) => track.stop());
    voiceAudioStream = null;
  }

  if (voiceAudioContext) {
    voiceAudioContext.close().catch(() => {});
    voiceAudioContext = null;
  }

  voiceAudioAnalyser = null;
  voiceAudioData = null;
  document.documentElement.style.setProperty("--voice-level", "0");
}

async function toggleVoiceMode() {
  if (!voiceRecognition) {
    alert("Voice chat is not supported in this browser.");
    return;
  }

  if (isVoiceModeActive) {
    stopVoiceMode();
    return;
  }

  isVoiceModeActive = true;
  voiceChatBtn.classList.add("active");
  voiceChatBtn.setAttribute("aria-pressed", "true");
  voiceOrbPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("voice-mode-active");
  setVoiceStatus("Listening...");

  if (isListening && recognition) {
    recognition.stop();
  }

  await startVoiceAudioMeter();
  startVoiceModeListening();
}

function stopVoiceMode() {
  isVoiceModeActive = false;
  isVoiceModeBusy = false;
  voiceTranscriptSent = false;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  stopVoiceModeListening();
  stopVoiceAudioMeter();
  voiceChatBtn.classList.remove("active");
  voiceChatBtn.setAttribute("aria-pressed", "false");
  voiceOrbPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("voice-mode-active", "voice-mode-listening", "voice-mode-speaking", "voice-mode-thinking");
  setVoiceStatus("Voice mode off");
}

async function handleVoiceMessage(transcript) {
  if (!transcript || isVoiceModeBusy) return;

  isVoiceModeBusy = true;
  stopVoiceModeListening();
  document.body.classList.remove("voice-mode-listening", "voice-mode-speaking");
  document.body.classList.add("voice-mode-thinking");
  setVoiceStatus("Thinking...");
  input.value = "";

  if (isSimpleVoiceGreeting(transcript)) {
    respondToSimpleVoiceGreeting(transcript);
    return;
  }

  await requestAiReply(transcript, null, {
    focusInput: false,
    speakReply: true
  });
}

function isSimpleVoiceGreeting(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();

  return /^(hi|hello|hey|helo|hii|hiya|yo|good morning|good afternoon|good evening)(\s+(nyxo|ai|assistant))?$/.test(normalized);
}

function respondToSimpleVoiceGreeting(transcript) {
  const reply = "Hello! How can I help?";

  addMessage("user", transcript);
  saveMessage("user", transcript);
  rememberChatMessage("user", transcript);
  document.body.classList.remove("voice-mode-thinking");
  addMessage("ai", reply, null, { typewriter: true });
  saveMessage("ai", reply);
  rememberChatMessage("ai", reply);
  speakAiReply(reply);
}

function speakAiReply(text) {
  if (!window.speechSynthesis || !isVoiceModeActive) {
    finishVoiceReply();
    return;
  }

  const plainText = String(text || "")
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/[#*_>`~\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    finishVoiceReply();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.rate = 1;
  utterance.pitch = 1.04;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) => /en/i.test(voice.lang) && /female|natural|zira|aria|jenny|samantha/i.test(voice.name))
    || voices.find((voice) => /en/i.test(voice.lang));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    voiceReplyStartedAt = performance.now();
    isCancellingVoiceReply = false;
    voiceInterruptStartedAt = 0;
    document.body.classList.remove("voice-mode-thinking", "voice-mode-listening");
    document.body.classList.add("voice-mode-speaking");
    setVoiceStatus("Speaking...");
  };

  utterance.onend = finishVoiceReply;
  utterance.onerror = finishVoiceReply;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function interruptVoiceReply() {
  if (!window.speechSynthesis || isCancellingVoiceReply) return;

  isCancellingVoiceReply = true;
  voiceInterruptStartedAt = 0;
  setVoiceStatus("Listening...");
  window.speechSynthesis.cancel();
  finishVoiceReply(true);
}

function finishVoiceReply() {
  const wasInterrupted = isCancellingVoiceReply;

  isVoiceModeBusy = false;
  voiceTranscriptSent = false;
  isCancellingVoiceReply = false;
  voiceReplyStartedAt = 0;
  voiceInterruptStartedAt = 0;
  document.body.classList.remove("voice-mode-thinking", "voice-mode-speaking");

  if (isVoiceModeActive) {
    setVoiceStatus("Listening...");
    window.setTimeout(startVoiceModeListening, wasInterrupted ? 120 : 350);
  }
}

function openLogin() {
  document.getElementById("loginPopup").style.display = "flex";
}

function closeLogin(cancelPendingGameOpen = true) {
  document.getElementById("loginPopup").style.display = "none";

  if (cancelPendingGameOpen) {
    openGamesAfterLogin = false;
  }
}

async function login() {
  alert("Login button working");
}

async function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    await firebase.auth().signInWithPopup(provider);
    closeLogin(false);
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

function openSearchChats() {
  searchPopup.style.display = "flex";
  chatSearchInput.value = "";
  renderSearchResults();
  setTimeout(() => chatSearchInput.focus(), 0);
}

function closeSearchChats() {
  searchPopup.style.display = "none";
}

function renderSearchResults() {
  searchResults.innerHTML = "";

  if (!activeUser) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.innerText = "Log in to search saved chats";
    searchResults.appendChild(empty);
    return;
  }

  const query = chatSearchInput.value.trim().toLowerCase();
  const chats = getSavedChats().filter((chat) => {
    const title = String(chat.title || "Untitled chat").toLowerCase();
    return !query || title.includes(query);
  });

  if (!getSavedChats().length) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.innerText = "No saved chats yet";
    searchResults.appendChild(empty);
    return;
  }

  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.innerText = "No matching chats";
    searchResults.appendChild(empty);
    return;
  }

  chats.forEach((chat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerText = chat.title || "Untitled chat";
    button.addEventListener("click", () => openSavedChat(chat.id));
    searchResults.appendChild(button);
  });
}

function getSavedChats() {
  const storageKey = getUserChatStorageKey();

  if (!storageKey) return [];

  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch (err) {
    return [];
  }
}

function setSavedChats(chats) {
  const storageKey = getUserChatStorageKey();

  if (!storageKey) return;

  localStorage.setItem(storageKey, JSON.stringify(chats));
}

function getUserChatStorageKey() {
  return activeUser?.uid ? `${chatStorageKey}:${activeUser.uid}` : null;
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
  if (!activeUser) return;

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
  currentChatMessages = [];
  chatBox.innerHTML = "";
  document.body.classList.remove("has-messages");
  input.value = "";
  clearAttachedImage();
  input.focus();
}

function openSavedChat(chatId) {
  if (!activeUser) return;

  const chat = getSavedChats().find((item) => item.id === chatId);
  if (!chat) return;

  currentChatId = chat.id;
  syncCurrentChatMemory(chat.messages);
  chatBox.innerHTML = "";

  chat.messages.forEach((message) => {
    addMessage(message.role === "ai" ? "ai" : "user", message.text, message.image);
  });

  closeHistory();
  closeSearchChats();
}

function deleteSavedChat(chatId) {
  if (!activeUser) return;

  const chats = getSavedChats().filter((item) => item.id !== chatId);
  setSavedChats(chats);

  if (currentChatId === chatId) {
    currentChatId = null;
  }

  renderRecentChats();
  loadHistory();

  if (searchPopup.style.display === "flex") {
    renderSearchResults();
  }
}

function renderRecentChats() {
  if (!recentChats) return;

  recentChats.querySelectorAll(".chat-row, button").forEach((item) => item.remove());

  if (!activeUser) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.disabled = true;
    empty.innerText = signInHistoryText;
    recentChats.appendChild(empty);
    return;
  }

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
    const row = document.createElement("div");
    row.className = "chat-row";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "chat-open";
    openButton.innerText = chat.title || "Untitled chat";
    openButton.addEventListener("click", () => openSavedChat(chat.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "chat-delete";
    deleteButton.innerText = "x";
    deleteButton.setAttribute("aria-label", `Delete ${chat.title || "chat"}`);
    deleteButton.addEventListener("click", () => deleteSavedChat(chat.id));

    row.append(openButton, deleteButton);
    recentChats.appendChild(row);
  });
}

function loadHistory() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  if (!activeUser) {
    const empty = document.createElement("div");
    empty.className = "history-item history-empty";
    empty.innerText = signInHistoryText;
    historyList.appendChild(empty);
    return;
  }

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

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "history-open";
    openButton.innerText = chat.title || "Untitled chat";
    openButton.addEventListener("click", () => openSavedChat(chat.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.innerText = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${chat.title || "chat"}`);
    deleteButton.addEventListener("click", () => deleteSavedChat(chat.id));

    div.append(openButton, deleteButton);
    historyList.appendChild(div);
  });
}

function renderAccount(user) {
  const accountArea = document.getElementById("accountArea");
  if (!accountArea) return;

  if (user) {
    activeUser = user;
    const photo = user.photoURL || "logo.png";
    const name = user.displayName || user.email || "Nyxo user";
    const firstName = name.split(" ")[0].split("@")[0];
    welcomeText.textContent = `Welcome, ${firstName}. What's going on?`;

    if (openGamesAfterLogin) {
      openGamesAfterLogin = false;
      themeMenu.classList.remove("open");
      gameMenu.classList.add("open");
      gamesButton.classList.add("active");
    }

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
    activeUser = null;
    currentChatId = null;
    welcomeText.textContent = "Welcome. What's going on?";
    gameMenu.classList.remove("open");
    gamesButton.classList.remove("active");
    closeSearchChats();
    clearGameMode();
    accountArea.innerHTML = `
      <button class="login-btn" onclick="openLogin()" id="loginButton" type="button">
        Login
      </button>
    `;
  }

  renderRecentChats();
  syncGameButtons();
}

micBtn.addEventListener("click", toggleVoiceInput);
voiceChatBtn.addEventListener("click", toggleVoiceMode);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

imageInput.addEventListener("change", () => {
  handleImageUpload(imageInput.files[0]);
});

chatSearchInput.addEventListener("input", renderSearchResults);

modelPickerButton.addEventListener("click", toggleModelMenu);
thinkingToggle.addEventListener("click", toggleThinkingMenu);

sidebarToggle.addEventListener("click", toggleSidebar);
mobileMenuButton.addEventListener("click", toggleSidebar);

if (mobileSidebarQuery.addEventListener) {
  mobileSidebarQuery.addEventListener("change", handleSidebarViewportChange);
} else {
  mobileSidebarQuery.addListener(handleSidebarViewportChange);
}

document.querySelectorAll(".model-option").forEach((button) => {
  button.addEventListener("click", () => {
    setModel(button.dataset.model);
  });
});

document.querySelectorAll(".thinking-option").forEach((button) => {
  button.addEventListener("click", () => {
    setThinkingLevel(button.dataset.thinking);
  });
});

document.querySelectorAll(".game-btn").forEach((button) => {
  button.addEventListener("click", () => {
    setGame(button.dataset.game);
  });
});

document.addEventListener("click", (event) => {
  if (!modelMenu.contains(event.target) && !modelPickerButton.contains(event.target)) {
    modelMenu.classList.remove("open");
    modelPickerButton.setAttribute("aria-expanded", "false");
    thinkingMenu.classList.remove("open");
    thinkingToggle.classList.remove("open");
    thinkingToggle.setAttribute("aria-expanded", "false");
  }

  if (
    isMobileSidebar() &&
    app.classList.contains("sidebar-open") &&
    sidebar &&
    !sidebar.contains(event.target) &&
    !mobileMenuButton.contains(event.target)
  ) {
    closeSidebar();
  }

  if (
    gameMenu &&
    !gameMenu.contains(event.target) &&
    !event.target.closest("#gamesButton")
  ) {
    gameMenu.classList.remove("open");
    gamesButton.classList.remove("active");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && app.classList.contains("sidebar-open")) {
    closeSidebar();
  }

  if (event.key === "Escape" && searchPopup.style.display === "flex") {
    closeSearchChats();
  }
});

document.querySelectorAll(".quick-actions button").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.innerText === "Enhance an image"
      ? "Enhance this image and tell me what to improve."
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
  setThinkingLevel(thinkingLevels[selectedThinkingLevel] ? selectedThinkingLevel : "normal", false);
  syncGameButtons();
  setupVoiceInput();
  syncSidebarButtons();

  if (window.firebase) {
    firebase.auth().onAuthStateChanged(renderAccount);
  }
});
