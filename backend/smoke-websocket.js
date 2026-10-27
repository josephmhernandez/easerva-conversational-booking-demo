const WebSocket = require("ws");

const url = process.argv[2];
if (!url) {
  console.error("Usage: node smoke-websocket.js <wss-url>");
  process.exit(2);
}

const socket = new WebSocket(url, { perMessageDeflate: false });
const events = [];
const timeout = setTimeout(() => {
  console.error("Timed out waiting for ai.done", events);
  socket.terminate();
  process.exit(1);
}, 15_000);

socket.on("open", () => {
  socket.send(JSON.stringify({ action: "sendMessage", text: "I need help defining my brand" }));
});

socket.on("message", (data) => {
  const event = JSON.parse(data.toString());
  events.push(event.type);
  if (event.type === "ai.done") {
    clearTimeout(timeout);
    console.log(`WebSocket smoke test passed: ${events.join(" → ")}`);
    socket.close();
  }
});

socket.on("close", () => {
  if (events.includes("ai.done")) process.exit(0);
});

socket.on("error", (error) => {
  clearTimeout(timeout);
  console.error(error.message);
  process.exit(1);
});
