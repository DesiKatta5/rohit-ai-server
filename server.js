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
    instruction: "Use normal depth. Keep the answer direct, clear, and not too long."
  },
  medium: {
    label: "Medium",
    maxTokenMultiplier: 1,
    instruction: "Use medium depth. Add useful explanation and a little context when it helps."
  },
  high: {
    label: "High",
    maxTokenMultiplier: 1.25,
    instruction: "Use high depth. Explain the reasoning, include important tradeoffs, and give examples when useful."
  },
  highest: {
    label: "Highest",
    maxTokenMultiplier: 1.5,
    instruction: "Use the highest depth. Be thorough, structured, and careful, while still avoiding unnecessary filler."
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

app.post("/chat", async (req, res) => {

const rawMessage = String(req.body.message || "");
const userMessage = rawMessage.toLowerCase();
const uploadedImage = req.body.image;
const selectedModelKey = nyxoModels[req.body.modelKey] ? req.body.modelKey : defaultModelKey;
const selectedModel = nyxoModels[selectedModelKey];
const activeModel = uploadedImage?.dataUrl ? nyxoModels[visionModelKey] : selectedModel;
const selectedThinkingKey = thinkingLevels[req.body.thinkingLevel] ? req.body.thinkingLevel : "normal";
const selectedThinking = thinkingLevels[selectedThinkingKey];
const maxCompletionTokens = Math.round(activeModel.maxTokens * selectedThinking.maxTokenMultiplier);
const wantsImageGeneration = /\b(create|generate|draw|make)\b.*\b(image|picture|photo|art|wallpaper|logo)\b/i.test(rawMessage);

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
  const completion = await groq.chat.completions.create({
    model: activeModel.groqModel,
    messages: [
      {
        role: "system",
        content: `You are NEX-GPT with vision. Describe images accurately, answer questions about them, and keep replies clean and helpful. ${selectedThinking.instruction}`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: rawMessage || "Describe this image and answer anything useful about it."
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
    temperature: 0.7,
    max_completion_tokens: maxCompletionTokens
  });

  return res.json({
    reply: completion.choices[0].message.content,
    model: activeModel.label,
    thinkingLevel: selectedThinking.label
  });
}

const messages = [
  {
    role: "system",
    content: `
You are NEX-GPT.

Reply like ChatGPT.

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
  temperature: selectedModelKey === "nyxo-1.3" ? 0.5 : 0.75,
  max_completion_tokens: maxCompletionTokens
});

res.json({
  reply: completion.choices[0].message.content,
  model: activeModel.label,
  thinkingLevel: selectedThinking.label
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

