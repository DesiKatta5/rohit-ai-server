async function sendMessage() {

const input =
document.getElementById("userInput");

const chatBox =
document.getElementById("chatBox");

const userMessage =
input.value;

if (!userMessage) return;

chatBox.innerHTML +=
"<br><b>You:</b> " + userMessage;

input.value = "";

try {

```
const res = await fetch(
  "https://rohit-ai-server.onrender.com/chat",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      message: userMessage
    })

  }
);

const data = await res.json();

chatBox.innerHTML +=
  "<br><b>AI:</b> " + data.reply;
```

} catch (error) {

```
console.error(error);

chatBox.innerHTML +=
  "<br><span style='color:red;'>Connection Error</span>";
```

}

}
