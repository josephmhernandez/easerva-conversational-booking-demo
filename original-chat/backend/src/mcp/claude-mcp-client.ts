import Anthropic from "@anthropic-ai/sdk";
import { ActorRef } from "xstate";
import { STREAM_TOOL_CHECK_CHUNK_COUNT } from "../constants/mcpConstants";
import { chatMessagesDB } from "../database/chat-messages";
import { ServerEvent } from "../shared/protocol";
import { emitPersisted } from "../websocket/websocketUtils";
import {
  doWaitingForServiceQuestionAnswer,
  getNextStepMessage,
  ServiceQuestionAnswerStruct,
} from "./mcp-client-helper";
import { MCPServerManager } from "./mcp-server-manager";
import { getServices } from "./resources/get-services";
import { getCurrentCompanies } from "./tools/get-current-companies";
import { GeminiAnthropicAdapter } from "./gemini-anthropic-adapter";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface StreamController {
  id: string;
  active: boolean;
  cancelled: boolean;
  cancel: () => void;
}

// Type for message management
interface Message {
  id: string;
  type: "stream" | "full";
  content: string;
  sessionId: string;
  role: "user" | "assistant";
  status: "pending" | "processing" | "completed" | "error";
  createdAt: number;
  streamId?: string;
}

export class ClaudeMCPClient {
  private anthropic: Anthropic;
  private model: string;
  private availableTools: MCPTool[] = [];
  private toolExecutor: MCPServerManager | null = null;
  private activeStreams = new Map<string, StreamController>();
  private sequenceCounter = 0;

  // "claude-3-5-haiku-20241022"
  // "claude-3-5-sonnet-20241022"
  // claude-opus-4-20250514
  // "claude-3-7-sonnet-20250219"
  constructor(
    apiKey?: string,
    model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  ) {
    console.log("🤖 Initializing Gemini MCP Client");
    this.anthropic = new GeminiAnthropicAdapter(
      apiKey || process.env.GEMINI_API_KEY
    ) as unknown as Anthropic;
    this.model = model;
  }

  async initialize() {
    try {
      console.log("[Gemini MCP] Client initialized");
    } catch (error) {
      console.error("[Gemini MCP] Failed to initialize:", error);
      throw error;
    }
  }

  setToolExecutor(toolExecutor: any) {
    this.toolExecutor = toolExecutor;
  }

  updateAvailableTools(tools: MCPTool[]) {
    this.availableTools = tools;
    console.log(`[Claude MCP] Updated available tools: ${this.availableTools.length} tools`);
  }

  private async createSystemPrompt(
    actor: ActorRef<any, any>,
    currentSnapshot: any,
    currentState: string
  ): Promise<string> {
    console.log("[Claude MCP] Currently on state: ", currentState);
    const toolDescriptions = this.availableTools
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join("\n");

    let systemPrompt = `You are a helpful booking assistant. You have access to the following tools:

${toolDescriptions}`;

    switch (currentState) {
      case "waiting on service message":
        const serviceList: { id: string; description: string }[] = getServices();
        let serviceListString = JSON.stringify(serviceList);

        systemPrompt += `
## Available Services:
You already know the list of services available to the user:

${serviceListString}

Use this information to match services directly.

## Critical Instructions:
- When a user expresses intent to book a known service (like "I need an electrician"), respond with helpful information about that service.
- If a user asks **what services are offered**, list the available services.
- Be conversational, helpful, and act immediately when a user expresses intent to book.

## Examples:
- "I need an electrician" → Provide information about electrical services.
- "Can you help me book a plumber?" → Provide information about plumbing services.
- "What do you offer?" → List all available services.
- "Start over" → Offer to help them start a new booking process.

Be conversational, helpful, and act immediately when a user expresses intent to book. Be as concise as possible.
                `;
        break;

      case "waiting for a service question answer":
        systemPrompt += `
- When the user provides an answer to the current question, acknowledge their response
- If the user provides an answer that is not clear, ask for clarification questions to get the information needed
- Be encouraging and acknowledge their answers
- If the user's answer is unclear, ask for clarification

EXAMPLES:
- User: "I need it done next week" → Acknowledge their timeline preference
- User: "Can you repeat the question?" → Politely repeat the current question
- User: "I'm not sure" → Ask for clarification: "No problem! Could you give me your best guess or tell me what you're thinking?"

Be as concise as possible.
`;
        break;

      case "choosing a company":
        systemPrompt += `
- The user is choosing from available service providers/companies
- Help them understand the differences between providers if they ask
- Be supportive of their decision-making process

EXAMPLES:
- User: "I'll go with Company A" → Confirm their selection
- User: "Can I see more options?" → Let them know about additional options
- User: "What's the difference between these companies?" → Provide helpful comparison based on available data

Be as concise as possible.`;

        const currentCompanies = await getCurrentCompanies(actor);
        systemPrompt += `
        Here are the current companies available to the user:
        ${JSON.stringify(currentCompanies)}
        `;
        break;

      case "waiting for a time slot answer":
        systemPrompt += `

        The user should be trying to select a time slot from the list of available time slots.

        Here are the available time slots:
        ${JSON.stringify(currentSnapshot.context.availableTimes)}

        There are other options available to the user as well but keep the user on the path of selecting a time slot.
        `;
        break;

      case "waiting for user auth":
      case "waiting for user to login":
      case "check user auth":
        systemPrompt += `
        The user is waiting for authentication.

        Please ask the user politely to sign in or sign up to book their appointment. It is crucial that the user books their appointment with a verified email address.

        Be super brief and to the point. Politely ask the user to sign in or sign up to book their appointment. It is crucial that the user books their appointment with a verified email address.
        `;
        break;

      case "waiting for good search query":
        systemPrompt += `
You are helping the user search this focused demo catalog:
${JSON.stringify(getServices())}

SEARCH RULES:
- If the user asks what is available, briefly list only these five categories.
- As soon as the user gives both a category and a concrete need, call post-search-service-cards immediately.
- Do not ask the user to confirm that they want to see results. Showing results is the next step.
- Location and budget are optional. Never block a search because either is missing.
- Map printing, posters, business cards, banners, and document printing to "Printing Service".
- Dog walking, grooming, pet sitting, and boarding map to "Pet Services".
- Electrical, wiring, plumbing, HVAC, and handyman work map to "Home Services".
- Portraits, events, headshots, and product photos map to "Photography".
- Websites, IT support, automation, and cloud help map to "Technology Services".
- Never say you are searching unless you call post-search-service-cards in the same turn.

Be concise and move the user toward visible service cards.`;
        break;
      default:
        console.warn(
          `[claude-mcp-client:createSystemPrompt] Creating system prompt for state: ${currentState}. Ensure that really don't need a system prompt for this state!`
        );
        systemPrompt += `
- Help guide the user through the current step of the booking process
- Be conversational and helpful
- If you're unsure what to do, ask for clarification

Be as concise as possible.`;
        break;
    }

    systemPrompt += `

GENERAL RULES:
- Do not show the user the tool use. 
- Always be conversational and helpful in your responses
- Act immediately when users provide the information you're looking for
- If you're not sure about something, ask for clarification
- Avoid generating questions for the user. The booking process will give you specific questions to ask. Nothing else but that is needed.
Be as concise as possible.`;

    return systemPrompt;
  }

  async streamToSocketWithServiceQuestionAnswer(
    ws: any, // WebSocket instance
    message: string,
    actor: any,
    chatHistory: Anthropic.MessageParam[],
    claudeTools: Anthropic.Tool[],
    onAccumulate?: (chunk: string) => void
  ) {
    const res: ServiceQuestionAnswerStruct = await doWaitingForServiceQuestionAnswer(
      actor,
      chatHistory,
      this.anthropic,
      this.model
    );

    if (res.valid) {
      // If we have a question. Prompt the user to answer the next question.
      // Stream from getNextQuestion method. For next steps.
      console.log(`[Claude MCP] Valid response: ${JSON.stringify(res)}`);

      const latestState = actor.getSnapshot().value;
      // can hard code now.
      const currentState = "waiting for a service question answer";

      const nextStepMessage = getNextStepMessage(actor, currentState, latestState);
      console.log(`[Claude MCP] Next step message: ${nextStepMessage}`);
      if (nextStepMessage) {
        const nextStepMessageEvent: ServerEvent = {
          type: "ai.message",
          sessionId: ws.sessionId,
          message: nextStepMessage,
          seq: 99, // this gets overridden by the appendEvent in emitPersisted
        };
        emitPersisted(ws, ws.sessionId, "ai.message", nextStepMessageEvent);
        chatMessagesDB.addMessage(ws.sessionId, "assistant", nextStepMessage);
      } else {
        console.log(
          `[Claude MCP] HOLD UP - No next step message for state change from ${currentState} to ${latestState}`
        );
      }
    } else {
      // Not valid response.
      // Prompt the user to answer the question again.
      console.log(`[Claude MCP] Prompting user to answer question again: ${JSON.stringify(res)}`);
      const promptToAnswerQuestionAgain = `
      The user provided an answer that was not valid. 
      Please prompt the user to answer the question again. 
      Question: ${JSON.stringify(res.question)}
      Answer: ${res.answer}
      `;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: promptToAnswerQuestionAgain,
        messages: chatHistory,
        tools: claudeTools.length > 0 ? claudeTools : undefined,
        tool_choice: { type: "auto" },
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of response) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const content = chunk.delta.text;
          fullResponse += content;
          onAccumulate?.(content);
        }
      }

      // Send completion signal
      chatMessagesDB.addMessage(ws.sessionId, "assistant", fullResponse);
    }
  }

  private convertMCPToolsToClaudeTools(): Anthropic.Tool[] {
    return this.availableTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  async disconnect() {
    // Clean up any resources
    console.log("[Claude MCP] Client disconnected");
  }

  // NEW MESSAGE PROCESSING
  // Initialize message and persist immediately with sequence
  private async initializeMessage(
    sessionId: string,
    type: "stream" | "full",
    content: string = "",
    role: "user" | "assistant" = "assistant"
  ): Promise<Message> {
    const message: Message = {
      id: crypto.randomUUID(),
      type,
      content,
      sessionId,
      role,
      status: "pending",
      createdAt: Date.now(),
      streamId: type === "stream" ? crypto.randomUUID() : undefined,
    };

    // Immediately persist to database with sequence number to maintain order
    await chatMessagesDB.initializeMessage(sessionId, message.id, role, this.sequenceCounter++);

    return message;
  }

  // Cancel active stream
  private cancelActiveStream(streamId?: string): void {
    if (streamId) {
      const controller = this.activeStreams.get(streamId);
      if (controller) {
        controller.cancel();
        controller.active = false;
        controller.cancelled = true;
        this.activeStreams.delete(streamId);
      }
    } else {
      // Cancel all active streams
      for (const [id, controller] of this.activeStreams) {
        controller.cancel();
        controller.active = false;
        controller.cancelled = true;
      }
      this.activeStreams.clear();
    }
  }

  // Main method - redesigned for better message management
  async processUserMessage(
    ws: any,
    message: string,
    actor: any,
    chatHistory: { role: "user" | "bot"; message: string }[]
  ): Promise<void> {
    const sessionId = ws.sessionId;

    try {
      // Step 1: Initialize AI response message immediately (for sequencing)
      // const initialMessage = await this.initializeMessage(sessionId, 'stream');

      // Step 2: Process AI response with potential tool execution
      const { finalResponse, hasTools, toolResults, stateChanged, nextStepMessage } =
        await this.processAIResponse(ws, message, actor, chatHistory);

      // Step 3: If tools were executed, initialize and stream follow-up
      if (hasTools && toolResults) {
        const followUpMessage = await this.initializeMessage(sessionId, "stream");
        await this.streamFollowUpResponse(
          ws,
          message,
          actor,
          chatHistory,
          toolResults,
          followUpMessage
        );
      }

      // Step 4: If state changed, initialize and send nudge message
      if (stateChanged && nextStepMessage) {
        const nudgeMessage = await this.initializeMessage(sessionId, "full", nextStepMessage);
        await this.sendFullMessage(ws, nudgeMessage);
      }
    } catch (error) {
      console.error("[ChatBotStreamManager] Error processing message:", error);

      // Cancel any active streams
      this.cancelActiveStream();

      // Send error message
      const errorMessage = await this.initializeMessage(
        sessionId,
        "full",
        "Sorry, I encountered an error processing your request. Please try again."
      );
      await this.sendFullMessage(ws, errorMessage);

      throw error;
    }
  }

  // Process initial AI response
  private async processAIResponse(
    ws: any,
    message: string,
    actor: any,
    chatHistory: { role: "user" | "bot"; message: string }[]
  ): Promise<{
    finalResponse: string;
    hasTools: boolean;
    toolResults?: any[];
    stateChanged: boolean;
    nextStepMessage?: string;
  }> {
    const snapshot = actor.getSnapshot();
    const currentState =
      typeof snapshot.value === "string" ? snapshot.value : Object.keys(snapshot.value)[0];

    // Handle special validation flows
    if (
      currentState === "waiting for a service question answer" ||
      currentState === "waiting for a company question answer"
    ) {
      return await this.handleServiceQuestionFlow(ws, message, actor, chatHistory);
    }

    const messages = this.formatMessages(chatHistory, message);

    // if (currentState === "waiting for good search query") {
    //   console.log("[claude-mcp-client] JOEY Waiting for a good search query");
    //   const { waitForNextState, responseToUser } = await validateSearchQuery(actor, messages, this.anthropic, this.model);
    //   // wait for state change.
    //   console.log(`[claude-mcp-client] JOEY Waiting for state change: ${JSON.stringify(waitForNextState)}`);
    //   if (waitForNextState) {
    //     await waitForStateChange(actor, "waiting for good search query", this.toolExecutor);

    //     if (actor.getSnapshot().value === "search for cards") {
    //       const responseToUser = await this.handleSearchForCards(actor, messages, this.anthropic, this.model);
    //       return {
    //         finalResponse: responseToUser,
    //         hasTools: false,
    //         stateChanged: false,
    //         nextStepMessage: undefined,
    //       }
    //     }
    //   } else {
    //     console.log("[claude-mcp-client] JOEY Not waiting for next state");
    //     return {
    //       finalResponse: responseToUser,
    //       hasTools: false,
    //       stateChanged: false,
    //     };
    //   }

    //   // Check if cards were returned - if so, skip AI response generation
    //   const updatedSnapshot = actor.getSnapshot();
    //   const cardIds = updatedSnapshot.context?.cardIds;
    //   if (cardIds && Array.isArray(cardIds) && cardIds.length > 0) {
    //     console.log("[claude-mcp-client] Cards were returned, skipping AI response generation");
    //     return {
    //       finalResponse: "",
    //       hasTools: false,
    //       stateChanged: false,
    //       nextStepMessage: undefined,
    //     };
    //   }
    // }

    const systemPrompt = await this.createSystemPrompt(actor, snapshot, currentState);
    const claudeTools = this.convertMCPToolsToClaudeTools();

    const stream = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      tool_choice: { type: "auto" },
      stream: true,
    });

    let fullResponse = "";
    let hasTools = false;
    let toolUses: Array<{ id: string; name: string; inputJson: string }> = [];
    let textBuffer: string[] = [];
    let bufferReleased = false;
    let streamMessage: Message | null = null;
    let streamController: StreamController | null = null;

    try {
      for await (const chunk of stream) {
        // Check if stream was cancelled
        if (streamController && streamController.cancelled) {
          console.log("[ChatBotStreamManager] Stream cancelled");
          break;
        }

        if (
          chunk.type === "content_block_start" &&
          chunk.content_block &&
          chunk.content_block.type === "tool_use"
        ) {
          hasTools = true;
          toolUses.push({
            id: chunk.content_block.id || "",
            name: chunk.content_block.name || "",
            inputJson: "",
          });

          // Cancel current stream since we have tools
          if (streamMessage) {
            await this.finishStream(ws, streamMessage!, "");

            await this.cancelAndDeleteMessage(ws, streamMessage);
            streamMessage = null;
          }
          textBuffer = [];
          bufferReleased = true;
        } else if (chunk.type === "content_block_delta") {
          if (chunk.delta.type === "text_delta" && !hasTools) {
            fullResponse += chunk.delta.text;

            if (!bufferReleased) {
              textBuffer.push(chunk.delta.text);
              if (textBuffer.length >= STREAM_TOOL_CHECK_CHUNK_COUNT) {
                // STREAM_TOOL_CHECK_CHUNK_COUNT
                streamMessage = await this.initializeMessage(
                  ws.sessionId,
                  "stream",
                  "",
                  "assistant"
                );
                // Create stream controller
                streamController = this.createStreamController(streamMessage.streamId!);
                this.activeStreams.set(streamMessage.streamId!, streamController);
                bufferReleased = true;
                const bufferedText = textBuffer.join("");
                await this.streamChunk(ws, streamMessage, bufferedText);
                textBuffer = [];
              }
            } else {
              await this.streamChunk(ws, streamMessage!, chunk.delta.text);
            }
          } else if (chunk.delta.type === "input_json_delta") {
            const lastTool = toolUses[toolUses.length - 1];
            if (lastTool) {
              lastTool.inputJson += chunk.delta.partial_json;
            }
          }
        }
      }

      // Handle remaining buffered content
      if (!bufferReleased && textBuffer.length > 0 && !hasTools) {
        const bufferedText = textBuffer.join("");

        const fullMessage = await this.initializeMessage(
          ws.sessionId,
          "full",
          bufferedText,
          "assistant"
        );
        await this.sendFullMessage(ws, fullMessage);

        fullResponse += bufferedText;
      }

      // Finish stream if no tools
      if (!hasTools && streamMessage) {
        // should is there a stream to finish?

        await this.finishStream(ws, streamMessage!, fullResponse);
      }
    } catch (error) {
      streamController?.cancel();
      throw error;
    }

    // Execute tools if present
    let toolResults;
    if (hasTools && toolUses.length > 0) {
      toolResults = await this.executeTools(toolUses, actor);

      // Check if post-search-service-cards was executed
      // If so, exit gracefully without generating a follow-up AI response
      const wasCardSearchTool = toolUses.some(
        (toolUse) => toolUse.name === "post-search-service-cards"
      );
      if (wasCardSearchTool) {
        console.log(
          "[claude-mcp-client] post-search-service-cards was executed, exiting processAIResponse without follow-up"
        );
        return {
          finalResponse: "",
          hasTools: false, // Set to false to prevent streamFollowUpResponse from being called
          toolResults: undefined,
          stateChanged: false,
          nextStepMessage: undefined,
        };
      }
    }

    // Check for state changes
    const latestSnapshot = actor.getSnapshot();
    const latestState =
      typeof latestSnapshot.value === "string"
        ? latestSnapshot.value
        : Object.keys(latestSnapshot.value)[0];

    const stateChanged = currentState !== latestState;
    const nextStepMessage = stateChanged
      ? getNextStepMessage(actor, currentState, latestState)
      : undefined;

    return {
      finalResponse: fullResponse,
      hasTools,
      toolResults,
      stateChanged,
      nextStepMessage,
    };
  }

  // Stream follow-up response after tools
  private async streamFollowUpResponse(
    ws: any,
    originalMessage: string,
    actor: any,
    chatHistory: { role: "user" | "bot"; message: string }[],
    toolResults: any[],
    message_: Message
  ): Promise<void> {
    const snapshot = actor.getSnapshot();
    const systemPrompt = await this.createSystemPrompt(
      actor,
      snapshot,
      typeof snapshot.value === "string" ? snapshot.value : Object.keys(snapshot.value)[0]
    );

    const messages = this.formatMessages(chatHistory, originalMessage);

    // Return completed tool results as explicit context for the final answer.
    // Gemini's compatibility endpoint rejects tool-role history when the
    // follow-up intentionally omits tool definitions to prevent a second,
    // unnecessary tool-call loop.
    if (toolResults.length > 0) {
      messages.push({
        role: "user",
        content: `The booking server executed these tools. Use their real results to answer the user's request; do not claim that you called another tool.\n${toolResults
          .map(
            (result) =>
              `<tool_result name="${result.name}" input='${JSON.stringify(result.input)}'>${result.content}</tool_result>`
          )
          .join("\n")}`,
      });
    }

    const streamController = this.createStreamController(message_.streamId!);
    this.activeStreams.set(message_.streamId!, streamController);

    const followUpResponse = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });

    let fullResponse = "";

    try {
      for await (const chunk of followUpResponse) {
        if (streamController.cancelled) break;

        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const content = chunk.delta.text;
          if (content) {
            fullResponse += content;
            await this.streamChunk(ws, message_, content);
          }
        }
      }

      await this.finishStream(ws, message_, fullResponse);
    } catch (error) {
      streamController.cancel();
      throw error;
    }
  }

  // Send a complete message immediately
  private async sendFullMessage(ws: any, message_: Message): Promise<void> {
    message_.status = "processing";

    const event: ServerEvent = {
      type: "ai.message",
      sessionId: ws.sessionId,
      message: message_.content,
      seq: 99, // This gets overridden by emitPersisted
    };

    await emitPersisted(ws, ws.sessionId, "ai.message", event);

    // Update message in database
    await chatMessagesDB.finalizeMessage(message_.id, message_.content);

    message_.status = "completed";
  }

  // Stream a chunk of content
  private async streamChunk(ws: any, message_: Message, chunk: string): Promise<void> {
    if (message_.status === "pending") {
      message_.status = "processing";
    }

    message_.content += chunk;

    await emitPersisted(
      ws,
      ws.sessionId,
      "ai.delta",
      {
        streamId: message_.streamId,
        chunk,
      },
      { streamId: message_.streamId }
    );
  }

  // Finish streaming
  private async finishStream(ws: any, message_: Message, finalContent: string): Promise<void> {
    message_.content = finalContent;
    message_.status = "completed";

    await emitPersisted(
      ws,
      ws.sessionId,
      "ai.done",
      {
        streamId: message_.streamId,
        final: finalContent,
        status: "ok",
      },
      { streamId: message_.streamId }
    );

    // Finalize in database
    await chatMessagesDB.finalizeMessage(message_.id, finalContent);

    // Remove from active streams
    this.activeStreams.delete(message_.streamId!);
  }

  // Create stream controller
  private createStreamController(streamId: string): StreamController {
    return {
      id: streamId,
      active: true,
      cancelled: false,
      cancel: () => {
        // This gets set to true when cancel() is called
      },
    };
  }

  // Execute tools
  private async executeTools(
    toolUses: Array<{ id: string; name: string; inputJson: string }>,
    actor: any
  ): Promise<any[]> {
    const parsedToolUses = toolUses.map((toolUse) => ({
      ...toolUse,
      input: JSON.parse(toolUse.inputJson || "{}"),
    }));

    return await Promise.all(
      parsedToolUses.map(async (toolUse) => {
        try {
          console.log("[ChatBotStreamManager] Executing tool:", toolUse.name);
          const toolResult = await this.toolExecutor?.executeTool(
            toolUse.name,
            toolUse.input,
            actor
          );
          return {
            tool_use_id: toolUse.id,
            type: "tool_result",
            name: toolUse.name,
            input: toolUse.input,
            content: JSON.stringify(toolResult),
          };
        } catch (err) {
          console.error("[ChatBotStreamManager] Tool execution error:", err);
          return {
            tool_use_id: toolUse.id,
            type: "tool_result",
            name: toolUse.name,
            input: toolUse.input,
            content: JSON.stringify({
              error: true,
              message: `Tool "${toolUse.name}" failed.`,
            }),
          };
        }
      })
    );
  }

  // Handle service question validation flow
  private async handleServiceQuestionFlow(
    ws: any,
    message: string,
    actor: any,
    chatHistory: { role: "user" | "bot"; message: string }[]
  ): Promise<{
    finalResponse: string;
    hasTools: boolean;
    stateChanged: boolean;
    nextStepMessage?: string;
  }> {
    // Cancel current stream since we're handling this differently
    // await this.finishStream(ws, message_, "");

    const messages = this.formatMessages(chatHistory, message);
    const claudeTools = this.convertMCPToolsToClaudeTools();

    const res: ServiceQuestionAnswerStruct = await doWaitingForServiceQuestionAnswer(
      actor,
      messages,
      this.anthropic,
      this.model
    );

    if (res.valid) {
      const latestState = actor.getSnapshot().value;
      const currentState = "waiting for a service question answer";
      const nextStepMessage = getNextStepMessage(actor, currentState, latestState);

      return {
        finalResponse: "",
        hasTools: false,
        stateChanged: true,
        nextStepMessage,
      };
    } else {
      // Initialize and stream invalid response message
      const invalidMessage = await this.initializeMessage(ws.sessionId, "stream");
      await this.streamInvalidQuestionResponse(ws, res, messages, claudeTools, invalidMessage);

      return {
        finalResponse: invalidMessage.content,
        hasTools: false,
        stateChanged: false,
      };
    }
  }

  // Stream response for invalid question answers
  private async streamInvalidQuestionResponse(
    ws: any,
    res: ServiceQuestionAnswerStruct,
    messages: any[],
    claudeTools: any[],
    message_: Message
  ): Promise<void> {
    const promptToAnswerQuestionAgain = `
    The user provided an answer that was not valid. 
    Please prompt the user to answer the question again. 
    Question: ${JSON.stringify(res.question)}
    Answer: ${res.answer}
    `;

    const streamController = this.createStreamController(message_.streamId!);
    this.activeStreams.set(message_.streamId!, streamController);

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: promptToAnswerQuestionAgain,
      messages: messages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      tool_choice: { type: "auto" },
      stream: true,
    });

    let fullResponse = "";

    try {
      for await (const chunk of response) {
        if (streamController.cancelled) break;

        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const content = chunk.delta.text;
          fullResponse += content;
          await this.streamChunk(ws, message_, content);
        }
      }

      await this.finishStream(ws, message_, fullResponse);
    } catch (error) {
      streamController.cancel();
      throw error;
    }
  }

  // Helper methods
  private formatMessages(
    chatHistory: { role: "user" | "bot"; message: string }[],
    currentMessage: string
  ): any[] {
    const messages: any[] = [];
    const recentHistory = chatHistory.slice(-10);

    for (const entry of recentHistory) {
      messages.push({
        role: entry.role === "user" ? "user" : "assistant",
        content: entry.message,
      });
    }

    messages.push({
      role: "user",
      content: currentMessage,
    });

    return messages;
  }

  private async cancelAndDeleteMessage(ws: any, message_: Message): Promise<void> {
    await chatMessagesDB.deleteMessage(message_.id);
    this.activeStreams.delete(message_.streamId!);
  }

  private async handleSearchForCards(
    actor: any,
    messages: any[],
    anthropic: Anthropic,
    model: string
  ): Promise<string> {
    // prompt for meters conversion...

    // prompt for search query...

    const snapshot = actor.getSnapshot();
    const searchQuery = snapshot.context.searchQuery;
    // const userLocation = snapshot.context.userLocation;

    // Just in case we need to use the user location.
    //TODO: Get the user location from the xstate machine.
    const userLocation = {
      lat: 32.876265,
      lng: -97.172224,
    };
    const prompt = `
    You are a helpful booking assistant.
    You have been given enough information to search for service applicable to the customer's desired service.

    here is the tentative search query: ${JSON.stringify(searchQuery)}

    use the post-search-service-cards tool to search for service cards for the user.

    Use the past messages to assemble the search query but use the tentative query above as a starting point. 
    If there is not a user location associated with the query then use this User location: ${JSON.stringify(userLocation)}
    Otherwise, use the user location associated with the query.

    Output only the results of the post-search-service-cards tool. Do not return any other text. Output it as a JSON array of service cards.
    `;

    const claudeTools = this.convertMCPToolsToClaudeTools();
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      system: prompt,
      messages: messages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      tool_choice: { type: "auto" },
      stream: false,
    });

    console.log(`[Claude MCP] Response: ${JSON.stringify(response)}`);
    const toolResult = response.content.find((block: any) => block.type === "tool_result");
    let serviceCards = [];
    if (toolResult) {
      serviceCards = JSON.parse((toolResult as any).content as unknown as string);
    }
    console.log(`[Claude MCP] Service cards: ${JSON.stringify(serviceCards)}`);

    actor.send({ type: "CARDS_RETURNED", output: { cards: serviceCards } });
    // TODO: fix this..
    return "done with search for cards";
  }
}

function waitForStateChange(
  actor: any,
  currentState: string,
  mcpManager: MCPServerManager | null
): Promise<void> {
  // wait for 10 seconds for the state to change to a different state than the current state.
  const timeout = setTimeout(() => {
    throw new Error("State change timed out");
  }, 10000);

  console.log("[claude-mcp-client] JOEY Waiting for state change from:", currentState);
  // print type
  console.log(`[claude-mcp-client] JOEY Type of actor: ${typeof actor}`);
  return new Promise((resolve, reject) => {
    actor.onTransition((state: any) => {
      if (state.value !== currentState) {
        clearTimeout(timeout);
        mcpManager?.updateToolsForState(state.value, actor);
        console.log("[claude-mcp-client] JOEY State changed to:", state.value);
        resolve();
      } else {
        clearTimeout(timeout);
        throw new Error("State change timed out");
      }
    });
  });
}
