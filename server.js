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

app.post("/chat", async (req, res) => {

const rawMessage = String(req.body.message || "");
const userMessage = rawMessage.toLowerCase();
const uploadedImage = req.body.image;
const selectedModelKey = nyxoModels[req.body.modelKey] ? req.body.modelKey : defaultModelKey;
const selectedModel = nyxoModels[selectedModelKey];
const activeModel = uploadedImage?.dataUrl ? nyxoModels[visionModelKey] : selectedModel;
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
  return res.json({
    reply: "Your app is using Groq right now. Groq supports image recognition and OCR with vision models, but this setup does not have a Groq text-to-image model available. Upload an image and I can recognize it, or add a separate image-generation provider later."
  });
}

if (uploadedImage?.dataUrl) {
  const completion = await groq.chat.completions.create({
    model: activeModel.groqModel,
    messages: [
      {
        role: "system",
        content: "You are NEX-GPT with vision. Describe images accurately, answer questions about them, and keep replies clean and helpful."
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
    max_completion_tokens: activeModel.maxTokens
  });

  return res.json({
    reply: completion.choices[0].message.content,
    model: activeModel.label
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
  max_completion_tokens: activeModel.maxTokens
});

res.json({
  reply: completion.choices[0].message.content,
  model: activeModel.label
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

