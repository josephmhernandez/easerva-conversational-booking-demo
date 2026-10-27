const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const { nextStep } = require("./workflow");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});
const tableName = process.env.TABLE_NAME;
const modelId = process.env.BEDROCK_MODEL_ID;

function response(statusCode = 200) { return { statusCode }; }
function expiry() { return Math.floor(Date.now() / 1000) + 60 * 60; }

async function send(client, connectionId, payload) {
  await client.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: Buffer.from(JSON.stringify(payload)) }));
}

async function stream(client, connectionId, message) {
  const streamId = crypto.randomUUID();
  const words = message.split(/(\s+)/).filter(Boolean);
  for (let i = 0; i < words.length; i += 4) {
    await send(client, connectionId, { type: "ai.delta", streamId, chunk: words.slice(i, i + 4).join(""), seq: i });
  }
  await send(client, connectionId, { type: "ai.done", streamId });
}

async function createClaudeReply({ state, userText, workflowResult, history }) {
  const eventSummary = workflowResult.event
    ? JSON.stringify(workflowResult.event)
    : "No structured UI event is emitted for this turn.";
  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const prompt = [
    "You are the Easerva conversational booking assistant from the original product demo.",
    "You help a visitor identify a professional service, narrow preferences, review matching providers, and choose a consultation time.",
    "This is a public portfolio sandbox: providers and availability are synthetic, no payment is taken, and no real appointment is created.",
    "Respond naturally to what the person actually wrote. Do not claim an action happened unless the workflow result says it did.",
    "When the workflow emits provider cards or time slots, introduce them briefly instead of repeating every item.",
    "If the person asks an unrelated question, answer briefly and then guide them back to the current booking step.",
    "Use one or two concise paragraphs. Do not use Markdown tables.",
    `Current workflow state before this message: ${state}.`,
    `Deterministic workflow guidance: ${workflowResult.message}`,
    `Structured UI event: ${eventSummary}`,
    `Recent conversation: ${JSON.stringify(recentHistory)}`,
    `Visitor message: ${userText}`,
  ].join("\n");

  const result = await bedrock.send(new ConverseCommand({
    modelId,
    system: [{ text: "Act as a warm, precise service-booking assistant. Never invent real businesses, prices, availability, or confirmed bookings." }],
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 260, temperature: 0.35 },
  }));
  const text = result.output?.message?.content?.find((part) => part.text)?.text?.trim();
  return text || workflowResult.message;
}

exports.handler = async (event) => {
  const { connectionId, routeKey, domainName, stage } = event.requestContext;
  const client = new ApiGatewayManagementApiClient({ endpoint: `https://${domainName}/${stage}` });

  if (routeKey === "$connect") {
    await db.send(new PutCommand({ TableName: tableName, Item: { connectionId, state: 0, turnCount: 0, history: [], expiresAt: expiry() } }));
    return response();
  }
  if (routeKey === "$disconnect") {
    await db.send(new DeleteCommand({ TableName: tableName, Key: { connectionId } }));
    return response();
  }
  if (routeKey === "reset") {
    await db.send(new PutCommand({ TableName: tableName, Item: { connectionId, state: 0, turnCount: 0, history: [], expiresAt: expiry() } }));
    await send(client, connectionId, { type: "session.reset" });
    return response();
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  const text = String(body.text || "").trim();
  if (!text || text.length > 500) {
    await send(client, connectionId, { type: "error", code: "INVALID_MESSAGE", message: "Enter between 1 and 500 characters." });
    return response();
  }

  const current = await db.send(new GetCommand({ TableName: tableName, Key: { connectionId } }));
  const state = Number(current.Item?.state || 0);
  const turnCount = Number(current.Item?.turnCount || 0);
  const history = Array.isArray(current.Item?.history) ? current.Item.history : [];
  if (turnCount >= 12) {
    await send(client, connectionId, { type: "error", code: "SESSION_LIMIT", message: "This demo session reached its 12-message limit. Reset the demo to start over." });
    return response();
  }
  const result = nextStep(state, text);
  let reply = result.message;
  try {
    reply = await createClaudeReply({ state, userText: text, workflowResult: result, history });
  } catch (error) {
    console.error("Claude response failed; using workflow fallback", error?.name || error);
  }
  const updatedHistory = [...history, { role: "user", text }, { role: "assistant", text: reply }].slice(-8);
  await db.send(new PutCommand({ TableName: tableName, Item: { connectionId, state: result.state, turnCount: turnCount + 1, history: updatedHistory, expiresAt: expiry() } }));
  await send(client, connectionId, { type: "message.accepted", messageId: crypto.randomUUID(), ts: new Date().toISOString() });
  await stream(client, connectionId, reply);
  if (result.event) await send(client, connectionId, result.event);
  return response();
};
