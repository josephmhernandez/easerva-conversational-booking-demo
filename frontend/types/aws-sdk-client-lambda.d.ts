declare module "@aws-sdk/client-lambda" {
  export class LambdaClient {
    constructor(config: unknown);
    send(command: unknown): Promise<{ StatusCode?: number }>;
  }

  export class InvokeCommand {
    constructor(input: unknown);
  }
}
