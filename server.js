const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const path = require("path");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

// WEBSITE
app.get("/", (req, res) => {

res.sendFile(
path.join(__dirname, "public", "index.html")
);

});

// AI CHAT
app.post("/chat", async (req, res) => {

try {

```
const userMessage =
  req.body.message;

const completion =
  await client.chat.completions.create({

    model: "gpt-4o-mini",

    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]

  });

const aiReply =
  completion.choices[0].message.content;

res.json({
  reply: aiReply
});
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  error: "AI failed"
});
```

}

});

app.listen(PORT, () => {

console.log(
"Server running on port " + PORT
);

});
