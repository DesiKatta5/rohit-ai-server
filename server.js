const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.use(express.static(path.join(__dirname, "public")));

const groq = new Groq({
apiKey: process.env.GROQ_API_KEY
});

const nyxoModels = {
  "nyxo-1.3": {
    label: "NYXO 1.3",
    groqModel: "llama-3.1-8b-instant",
    maxTokens: 1024
  },
  "nyxo-flash": {
    label: "NYXO Flash",
    groqModel: "llama-3.3-70b-versatile",
    maxTokens: 2048
  },
  "nyxo-pro": {
    label: "NYXO Pro",
    groqModel: "openai/gpt-oss-120b",
    maxTokens: 4096
  },
  "nyxo-beta": {
    label: "NYXO Beta",
    groqModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    maxTokens: 2048,
    vision: true
  }
};

const defaultModelKey = "nyxo-flash";
const visionModelKey = "nyxo-beta";

const thinkingLevels = {
  normal: {
    label: "Normal",
    maxTokenMultiplier: 0.75,
    instruction: "Use normal depth, but still prioritize correctness. Keep the answer direct and clear."
  },
  medium: {
    label: "Medium",
    maxTokenMultiplier: 1,
    instruction: "Use medium depth. Add useful explanation and context when it improves correctness."
  },
  high: {
    label: "High",
    maxTokenMultiplier: 1.25,
    instruction: "Use high depth. Check assumptions, explain important tradeoffs, and give examples when useful."
  },
  highest: {
    label: "Highest",
    maxTokenMultiplier: 1.5,
    instruction: "Use the highest depth. Be thorough, structured, careful, and explicit about uncertainty."
  }
};

const gameModes = {
  roblox: {
    label: "Roblox",
    instruction: "Help with Roblox gameplay, Roblox Studio, Lua scripting, maps, avatars, safety, performance, and ideas. Keep code examples beginner-friendly unless the user asks for advanced help."
  },
  minecraft: {
    label: "Minecraft",
    instruction: "Help with Minecraft survival, building, redstone, commands, mods, servers, farms, crafting, and troubleshooting. Mention Java or Bedrock differences when it matters."
  }
};

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {

res.sendFile(
path.join(__dirname, "public", "index.html")
);

});

const systemRule = `
You are an AI assistant.

Always follow:
- respond in step-by-step format
- use separate paragraphs
- never write everything in one line
`;

const accuracyRules = `
Accuracy-first rules:
- Correctness is more important than speed or sounding confident.
- Think carefully before answering, and check the answer for mistakes before finalizing it.
- Never invent facts, dates, links, statistics, laws, prices, patches, versions, or names.
- If the question needs current/live information or official sources and you cannot verify it, clearly say it may need checking.
- If important details are missing, ask a short clarifying question instead of guessing.
- For maths, code, logic, and troubleshooting, verify the result before giving the final answer.
- For medical, legal, financial, or safety topics, be careful, mention uncertainty, and recommend a qualified source when needed.
- Prefer saying "I am not sure" over giving a wrong answer.
`;

function extractSvg(text) {
  const match = String(text || "").match(/<svg[\s\S]*<\/svg>/i);
  return match ? match[0] : "";
}

function sanitizeSvg(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function isImageEnhancementRequest(message) {
  const text = String(message || "").trim();

  if (!text || /^uploaded an image$/i.test(text)) {
    return true;
  }

  return /\b(enhance|improve|make better|fix|retouch|restore|upscale|clear|clarity|sharpen|denoise|brighten|color correct|colour correct|quality|beautify|clean up|photo edit)\b/i.test(text);
}

function buildImageEnhancementPrompt(message) {
  const userRequest = String(message || "").trim();

  return `
${userRequest || "Enhance this image and tell me what to do for better enhancement."}

Analyze the uploaded image for enhancement.

Give the user:
1. What the image appears to be and the best likely use for it.
2. What should be improved first.
3. Specific editing actions and setting ranges for light, contrast, color, crop, sharpness, noise, background, and export.
4. Any limits, such as blur, low resolution, bad focus, or overexposure.

The app may show an automatic enhanced preview using local brightness, contrast, color, and sharpening corrections. Do not say the Groq model edited the pixels directly.
`;
}

app.post("/chat", async (req, res) => {

const rawMessage = String(req.body.message || "");
const userMessage = rawMessage.toLowerCase();
const uploadedImage = req.body.image;
const selectedGameKey = gameModes[req.body.gameKey] ? req.body.gameKey : "";
const selectedGame = selectedGameKey ? gameModes[selectedGameKey] : null;
const selectedModelKey = nyxoModels[req.body.modelKey] ? req.body.modelKey : defaultModelKey;
const selectedModel = nyxoModels[selectedModelKey];
const activeModel = uploadedImage?.dataUrl ? nyxoModels[visionModelKey] : selectedModel;
const selectedThinkingKey = thinkingLevels[req.body.thinkingLevel] ? req.body.thinkingLevel : "normal";
const selectedThinking = thinkingLevels[selectedThinkingKey];
const maxCompletionTokens = activeModel.maxTokens;
const wantsImageGeneration = /\b(create|generate|draw|make)\b.*\b(image|picture|photo|art|wallpaper|logo)\b/i.test(rawMessage);
const gameInstruction = selectedGame
  ? `The user selected ${selectedGame.label}. Answer as a ${selectedGame.label} helper. ${selectedGame.instruction}`
  : "";

if (
  /\bwho\s+(is|are)\s+(your|ur)\s+(promoter|promotor|tester)\b/i.test(rawMessage)
) {
  return res.json({
    reply: "My Tester is ItzRealLight."
  });
}

if (
  userMessage.includes("who made you") ||
  userMessage.includes("who is your owner") ||
  userMessage.includes("who created you") ||
  userMessage.includes("developer")
) {
  return res.json({
    reply: "My owner is MR ROHIT."
  });
}

try {

if (wantsImageGeneration) {
  const imageCompletion = await groq.chat.completions.create({
    model: selectedModel.groqModel,
    messages: [
      {
        role: "system",
        content: `
You create clean SVG images from text prompts.

Return only one complete SVG document.

Rules:
- Start with <svg and end with </svg>.
- Use viewBox="0 0 1024 1024".
- Include width="1024" height="1024" xmlns="http://www.w3.org/2000/svg".
- Use gradients, shapes, paths, filters, and text only when useful.
- Do not use script, foreignObject, external images, external links, markdown, code fences, or explanation.
- Make the visual polished and detailed for the user's prompt.
${selectedGame ? `- Match the image to ${selectedGame.label} when the prompt is game-related.` : ""}
`
      },
      {
        role: "user",
        content: `Create an SVG image for this prompt: ${rawMessage}`
      }
    ],
    temperature: 0.9,
    max_completion_tokens: 4096
  });

  const svg = sanitizeSvg(extractSvg(imageCompletion.choices[0].message.content));

  if (!svg) {
    return res.status(500).json({
      reply: "I tried to create the image, but the image output was invalid. Please try a simpler prompt."
    });
  }

  return res.json({
    reply: "Generated image",
    image: {
      name: "generated-image.svg",
      type: "image/svg+xml",
      dataUrl: svgToDataUrl(svg)
    },
    model: selectedModel.label
  });
}

if (uploadedImage?.dataUrl) {
  const wantsImageEnhancement = isImageEnhancementRequest(rawMessage);

  const completion = await groq.chat.completions.create({
    model: activeModel.groqModel,
    messages: [
      {
        role: "system",
        content: wantsImageEnhancement
          ? `You are NEX-GPT with vision and photo enhancement expertise. Give practical, image-specific enhancement advice in clear steps. Mention exact actions the user can take in any editor. Keep the tone helpful and direct. ${accuracyRules} ${gameInstruction} ${selectedThinking.instruction}`
          : `You are NEX-GPT with vision. Describe images accurately, answer questions about them, and keep replies clean and helpful. ${accuracyRules} ${gameInstruction} ${selectedThinking.instruction}`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: wantsImageEnhancement
              ? buildImageEnhancementPrompt(rawMessage)
              : rawMessage || "Describe this image and answer anything useful about it."
          },
          {
            type: "image_url",
            image_url: {
              url: uploadedImage.dataUrl
            }
          }
        ]
      }
    ],
    temperature: 0.25,
    max_completion_tokens: maxCompletionTokens
  });

  return res.json({
    reply: completion.choices[0].message.content,
    model: activeModel.label,
    thinkingLevel: selectedThinking.label,
    imageAction: wantsImageEnhancement ? "enhance" : "analyze"
  });
}

const messages = [
  {
    role: "system",
    content: `
You are NEX-GPT.

Reply like ChatGPT.
${accuracyRules}
${selectedGame ? `
The user selected game mode: ${selectedGame.label}.
Answer as a helpful ${selectedGame.label} assistant.
${selectedGame.instruction}
If a question depends on live updates, patches, or server-specific rules, say that it may need checking in the game or official sources.
` : ""}

Be natural, helpful, and conversational.

Keep answers clean and medium-length.

Do not give unnecessary introductions.

Use proper spacing and separate paragraphs.

When explaining steps:
- put each step on a new line
- keep steps clear and readable

Use markdown formatting only when useful.

Make links clean and clickable.

Do not make replies too short or too long.

Thinking level: ${selectedThinking.label}.
${selectedThinking.instruction}
`
  },
  {
    role: "user",
    content: rawMessage
  }
];

const completion = await groq.chat.completions.create({
  messages: messages,
  model: activeModel.groqModel,
  temperature: selectedModelKey === "nyxo-1.3" ? 0.2 : 0.25,
  max_completion_tokens: maxCompletionTokens
});

res.json({
  reply: completion.choices[0].message.content,
  model: activeModel.label,
  thinkingLevel: selectedThinking.label,
  game: selectedGame?.label || null
});


} catch (error) {


console.error(error);

res.status(500).json({
  reply: "AI Error"
});

function cleanAI(text) {
  return text
    // remove JSON escaping
    .replace(/\\\//g, "/")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}


}

});

app.listen(PORT, () => {

console.log(
"Server running on port " + PORT
);

});

