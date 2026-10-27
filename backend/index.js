const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { nextStep } = require("./workflow");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.TABLE_NAME;

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

exports.handler = async (event) => {
  const { connectionId, routeKey, domainName, stage } = event.requestContext;
  const client = new ApiGatewayManagementApiClient({ endpoint: `https://${domainName}/${stage}` });

  if (routeKey === "$connect") {
    await db.send(new PutCommand({ TableName: tableName, Item: { connectionId, state: 0, expiresAt: expiry() } }));
    return response();
  }
  if (routeKey === "$disconnect") {
    await db.send(new DeleteCommand({ TableName: tableName, Key: { connectionId } }));
    return response();
  }
  if (routeKey === "reset") {
    await db.send(new PutCommand({ TableName: tableName, Item: { connectionId, state: 0, expiresAt: expiry() } }));
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
  const result = nextStep(state, text);
  await db.send(new PutCommand({ TableName: tableName, Item: { connectionId, state: result.state, expiresAt: expiry() } }));
  await send(client, connectionId, { type: "message.accepted", messageId: crypto.randomUUID(), ts: new Date().toISOString() });
  await stream(client, connectionId, result.message);
  if (result.event) await send(client, connectionId, result.event);
  return response();
};
