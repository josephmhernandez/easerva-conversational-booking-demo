# Contributing Guide

Welcome to the Chat App repository! This guide will help you understand our patterns and conventions for contributing to this WebSocket-based chat application.

## Table of Contents

1. [WebSocket Event Pattern](#websocket-event-pattern)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Guidelines](#testing-guidelines)

## WebSocket Event Pattern

### Overview

This repository follows a strict pattern for all backend WebSocket events. All server-to-client communication must use the `ServerEvent` types defined in `shared/protocol.ts` and follow the standardized sending pattern.

### Required Pattern for Backend WebSocket Events

**ALL backend `ws.send()` calls MUST follow this pattern:**

```typescript
const errorEvent: ServerEvent = {
  type: "error",
  code: "NEW_SESSION_ERROR",
  message: "Failed to create new session",
  ts: new Date().toISOString(),
};
ws.send(JSON.stringify(errorEvent));
```

### Key Requirements

1. **Type Safety**: Always use the `ServerEvent` type from `shared/protocol.ts`
2. **Timestamp**: Always include `ts: new Date().toISOString()`
3. **JSON Serialization**: Always use `JSON.stringify()` when sending
4. **Proper Typing**: Declare the event with explicit `ServerEvent` typing

### Available ServerEvent Types

The following event types are available in `shared/protocol.ts`:

#### Core Events

- `connection.established` - Initial connection setup
- `session.created` - New session created
- `session.snapshot` - Session state snapshot
- `session.state` - Session state changes
- `error` - Error messages

#### Message Events

- `message.accepted` - User message accepted
- `message.rejected` - User message rejected
- `ai.delta` - AI response streaming chunk
- `ai.done` - AI response complete

#### Legacy Events (To be removed)

- `company.recommendations` - Company selection data
- `time.slots.recommendations` - Time slot data
- `company.selection.confirmed` - Company selection confirmed
- `time.selection.confirmed` - Time selection confirmed

### Examples

#### Error Event

```typescript
const errorEvent: ServerEvent = {
  type: "error",
  code: "AUTHENTICATION_FAILED",
  message: "Invalid authentication token",
  ts: new Date().toISOString(),
};
ws.send(JSON.stringify(errorEvent));
```

#### Connection Established

```typescript
const connectionEstablishedEvent: ServerEvent = {
  type: "connection.established",
  sessionId: sessionId,
  connectionId: ws.connectionId!,
  headSeq: headSeq,
  ts: new Date().toISOString(),
  turn: "idle",
};
ws.send(JSON.stringify(connectionEstablishedEvent));
```

#### AI Response Delta

```typescript
const aiDeltaEvent: ServerEvent = {
  type: "ai.delta",
  sessionId: sessionId,
  streamId: streamId,
  seq: sequenceNumber,
  chunk: responseChunk,
  ts: new Date().toISOString(),
};
ws.send(JSON.stringify(aiDeltaEvent));
```

#### Session Snapshot

```typescript
const sessionSnapshotEvent: ServerEvent = {
  type: "session.snapshot",
  sessionId: sessionId,
  headSeq: headSeq,
  messages: messages,
  ts: new Date().toISOString(),
  turn: "idle",
};
ws.send(JSON.stringify(sessionSnapshotEvent));
```

### Helper Functions

Use the `emitPersisted` function from `websocketUtils.ts` for events that need to be persisted to the database:

```typescript
import { emitPersisted } from "./websocketUtils";

// This will persist the event and send it to the client
await emitPersisted(ws, sessionId, "message.accepted", {
  messageId: messageId,
  seq: sequenceNumber,
});
```

### Anti-Patterns (DO NOT DO)

❌ **Don't send raw objects without ServerEvent typing:**

```typescript
// WRONG
ws.send(
  JSON.stringify({
    type: "some_event",
    data: "something",
  })
);
```

❌ **Don't forget the timestamp:**

```typescript
// WRONG
const event: ServerEvent = {
  type: "error",
  code: "ERROR",
  message: "Something failed",
  // Missing ts field
};
```

❌ **Don't use non-standard event types:**

```typescript
// WRONG - not in ServerEvent union
const event = {
  type: "custom_event", // This type doesn't exist in protocol.ts
  data: "something",
};
```

## Project Structure

```
chat-app/
├── shared/
│   └── protocol.ts          # Shared types between frontend/backend
├── backend/
│   ├── src/
│   │   ├── websocket/
│   │   │   ├── handler.ts    # Main WebSocket event handling
│   │   │   └── websocketUtils.ts # WebSocket helper functions
│   │   ├── database/         # Database operations
│   │   ├── auth/            # Authentication logic
│   │   └── mcp/             # MCP (Model Context Protocol) integration
└── frontend/
    ├── app/                 # Next.js app directory
    ├── components/          # React components
    └── lib/                 # Frontend utilities
```

## Development Workflow

### Setting Up

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd chat-app
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env` in both backend and frontend directories
   - Fill in required environment variables

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Follow the WebSocket event pattern** (see above)

3. **Update types in `shared/protocol.ts`** if adding new events

4. **Test your changes** in both backend and frontend

5. **Commit with descriptive messages**
   ```bash
   git commit -m "feat: add new session creation event following ServerEvent pattern"
   ```

### Before Submitting a PR

1. **Ensure all WebSocket events follow the required pattern**
2. **Update this guide if you add new event types**
3. **Test the complete flow in both development and production builds**
4. **Run linting and type checking**

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Always type WebSocket events as `ServerEvent`
- Import types from `shared/protocol.ts`

### WebSocket Events

- Follow the exact pattern shown above
- Always include timestamps
- Use proper error codes for error events
- Include sessionId when applicable

### Error Handling

```typescript
// Good error handling pattern
try {
  // Your logic here
} catch (error) {
  console.error("❌ Operation failed:", error);
  const errorEvent: ServerEvent = {
    type: "error",
    code: "OPERATION_FAILED",
    message: error instanceof Error ? error.message : "Unknown error",
    ts: new Date().toISOString(),
  };
  ws.send(JSON.stringify(errorEvent));
}
```

### Logging

- Use descriptive console.log messages with emoji prefixes
- Log both successful operations and errors
- Include relevant context (sessionId, userId, etc.)

## Testing Guidelines

### WebSocket Event Testing

When testing WebSocket events, ensure:

1. **Event structure matches ServerEvent type**
2. **Timestamps are ISO strings**
3. **Required fields are present**
4. **JSON serialization works correctly**

### Integration Testing

- Test complete flows from client message to server response
- Verify events are persisted correctly when using `emitPersisted`
- Test error scenarios and ensure proper error events are sent

## Questions?

If you have questions about this pattern or need help implementing it:

1. Check existing examples in `backend/src/websocket/handler.ts`
2. Review the `ServerEvent` types in `shared/protocol.ts`
3. Look at helper functions in `backend/src/websocket/websocketUtils.ts`
4. Create an issue for discussion if you're unsure

## Summary

Remember: **ALL backend WebSocket events must follow the ServerEvent pattern**. This ensures type safety, consistency, and proper integration between frontend and backend components.

When in doubt, follow the established patterns in the codebase and refer back to this guide.
