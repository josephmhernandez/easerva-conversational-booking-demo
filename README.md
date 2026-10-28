# Easerva Conversational Booking Demo

The archived Easerva conversational booking product, redeployed as an authenticated WebSocket portfolio demo.

**Live application:** <https://chat-demo.josephmhernandez.com/chat>

## What runs

- The original Next.js application and chat UI
- The original standalone Express + `ws` server at `/ws`
- Gemini 3.8 Flash streaming and function calls through Google's server-side API
- The original MCP tool manager and XState booking machines
- The existing Supabase chat sessions, messages, events, live connections, and service-card search
- Guest sessions secured with short-lived WebSocket JWTs
- One Fargate task behind an HTTPS Application Load Balancer with WebSocket support and cookie stickiness

The source snapshot at `original-chat/` is imported from commit `df1af9c45ec040dca669db7898e829ba6b51fde0` of `josephmhernandez/chat-app`. Deployment changes are deliberately narrow: a Gemini adapter preserves the original streaming and tool-event contract, and a single-task in-memory turn lease is used when the old Supabase lease RPCs are unavailable. XState state and conversation events remain persisted in Supabase.

## Architecture

```text
Next.js UI ──wss──► Express/WebSocket server
                         │
                         ├── MCP + XState booking workflow
                         ├── Gemini API (server-side only)
                         └── Supabase persisted session/events
```

The service runs on 0.5 vCPU / 1 GB, reuses the existing Easerva QA load balancer, and does not include checkout, cart, Stripe, or paid booking actions.

## Infrastructure

`authentic-template.yaml` defines the ECR build, TLS listener rules, sticky target groups, task roles, task definition, DNS, and ECS service. The Gemini credential is read from AWS Secrets Manager by the ECS execution role and injected only into the backend process; it is never compiled into the Next.js bundle. The older Lambda reconstruction is retained only as rollback history and is not the application described here.

## License

MIT
