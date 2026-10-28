import OpenAI from "openai";

type AnthropicLikeRequest = {
  model: string;
  max_tokens?: number;
  system?: string;
  messages: any[];
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
};

type ToolStreamState = {
  id: string;
  name: string;
  argumentsJson: string;
};

/**
 * Presents the small portion of the Anthropic Messages API used by the original
 * booking engine while sending every model request to Gemini's OpenAI-compatible
 * endpoint. This keeps the existing state-machine and tool-streaming contracts
 * intact without exposing the provider key to the browser.
 */
export class GeminiAnthropicAdapter {
  private readonly client: OpenAI;

  public readonly messages = {
    create: async (request: AnthropicLikeRequest): Promise<any> => {
      return request.stream
        ? this.createStreamingResponse(request)
        : this.createCompleteResponse(request);
    },
  };

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required by the booking server");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  private toOpenAIMessages(request: AnthropicLikeRequest): any[] {
    const messages: any[] = [];

    if (request.system) {
      messages.push({role: "system", content: request.system});
    }

    for (const message of request.messages) {
      if (typeof message.content === "string") {
        messages.push({role: message.role, content: message.content});
        continue;
      }

      if (!Array.isArray(message.content)) {
        messages.push({role: message.role, content: String(message.content ?? "")});
        continue;
      }

      const text = message.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");
      const toolUses = message.content.filter((block: any) => block.type === "tool_use");
      const toolResults = message.content.filter((block: any) => block.type === "tool_result");

      if (message.role === "assistant" && toolUses.length > 0) {
        messages.push({
          role: "assistant",
          content: text || null,
          tool_calls: toolUses.map((block: any) => ({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input ?? {}),
            },
          })),
        });
      } else if (text) {
        messages.push({role: message.role, content: text});
      }

      for (const result of toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: result.tool_use_id,
          content:
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content ?? {}),
        });
      }
    }

    return messages;
  }

  private toOpenAITools(tools?: any[]): any[] | undefined {
    if (!tools?.length) return undefined;

    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  private requestBody(request: AnthropicLikeRequest, stream: boolean): any {
    const tools = this.toOpenAITools(request.tools);
    return {
      model: request.model,
      messages: this.toOpenAIMessages(request),
      // Gemini counts thinking and visible output against this budget. The
      // original Claude calls commonly request 1,024 tokens, which can leave
      // no room for a visible answer after a tool-oriented reasoning pass.
      max_tokens: Math.max(request.max_tokens ?? 1024, 4096),
      stream,
      reasoning_effort: "low",
      ...(tools ? {tools, tool_choice: "auto"} : {}),
    };
  }

  private async createCompleteResponse(request: AnthropicLikeRequest): Promise<any> {
    const response: any = await this.client.chat.completions.create(
      this.requestBody(request, false)
    );
    const message = response.choices?.[0]?.message;
    const content: any[] = [];

    if (message?.content) {
      content.push({type: "text", text: this.removeMarkdownFence(message.content)});
    }

    for (const toolCall of message?.tool_calls ?? []) {
      content.push({
        type: "tool_use",
        id: toolCall.id,
        name: toolCall.function.name,
        input: this.parseToolArguments(toolCall.function.arguments),
      });
    }

    return {
      id: response.id,
      type: "message",
      role: "assistant",
      model: response.model,
      content,
      stop_reason: message?.tool_calls?.length ? "tool_use" : "end_turn",
    };
  }

  private async *createStreamingResponse(request: AnthropicLikeRequest): AsyncGenerator<any> {
    const stream: any = await this.client.chat.completions.create(
      this.requestBody(request, true)
    );
    const tools = new Map<number, ToolStreamState>();
    let emittedText = false;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        emittedText = true;
        yield {
          type: "content_block_delta",
          delta: {type: "text_delta", text: delta.content},
        };
      }

      for (const toolDelta of delta.tool_calls ?? []) {
        const index = toolDelta.index ?? 0;
        const state = tools.get(index) ?? {
          id: toolDelta.id ?? `gemini-tool-${index}`,
          name: toolDelta.function?.name ?? "",
          argumentsJson: "",
        };

        if (toolDelta.id) state.id = toolDelta.id;
        if (toolDelta.function?.name) state.name = toolDelta.function.name;
        if (toolDelta.function?.arguments) {
          state.argumentsJson = this.mergeArgumentChunk(
            state.argumentsJson,
            toolDelta.function.arguments
          );
        }

        tools.set(index, state);
      }
    }

    if (!emittedText && tools.size === 0) {
      console.warn(
        "[Gemini Adapter] Model returned no visible content; retrying once with a larger output budget"
      );
      const retryRequest: AnthropicLikeRequest = {
        ...request,
        max_tokens: 8192,
        messages: [
          ...request.messages,
          {
            role: "user",
            content:
              "Your previous attempt produced no visible answer. Respond to the user's latest request now with a concise, user-facing booking response.",
          },
        ],
      };
      const retryStream: any = await this.client.chat.completions.create(
        this.requestBody(retryRequest, true)
      );

      for await (const chunk of retryStream) {
        const retryContent = chunk.choices?.[0]?.delta?.content;
        if (retryContent) {
          yield {
            type: "content_block_delta",
            delta: {type: "text_delta", text: retryContent},
          };
        }
      }
    }

    // Gemini may stream function arguments as cumulative snapshots instead of
    // strict deltas. Emit one complete Anthropic-style tool block per call so
    // the original engine always receives valid, non-duplicated JSON.
    for (const [, tool] of [...tools.entries()].sort(([a], [b]) => a - b)) {
      yield {
        type: "content_block_start",
        content_block: {type: "tool_use", id: tool.id, name: tool.name, input: {}},
      };
      yield {
        type: "content_block_delta",
        delta: {
          type: "input_json_delta",
          partial_json: tool.argumentsJson || "{}",
        },
      };
    }
  }

  private mergeArgumentChunk(current: string, next: string): string {
    if (!current) return next;
    if (next.startsWith(current)) return next;
    if (current.startsWith(next) || current.endsWith(next)) return current;
    if (current === "{}" && next.trimStart().startsWith("{")) return next;
    return current + next;
  }

  private parseToolArguments(argumentsJson: string): Record<string, unknown> {
    try {
      return JSON.parse(argumentsJson || "{}");
    } catch {
      return {};
    }
  }

  private removeMarkdownFence(value: string): string {
    const trimmed = value.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : value;
  }
}
