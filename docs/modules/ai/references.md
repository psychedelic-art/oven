# Module AI -- References

> External documentation, pricing references, security standards, and industry patterns.

---

## Core Technology References

### Vercel AI SDK

| Resource | URL | Relevance |
|----------|-----|-----------|
| AI SDK Documentation | https://sdk.vercel.ai/ | Primary SDK documentation. Covers `generateText`, `streamText`, `embed`, `generateImage`, `generateObject`, middleware, tool definitions, and React hooks. |
| AI SDK Core API | https://sdk.vercel.ai/docs/ai-sdk-core | Core functions used in module-ai API handlers |
| AI SDK Providers | https://sdk.vercel.ai/docs/ai-sdk-core/providers-and-models | Provider architecture and `customProvider()` pattern |
| AI SDK Middleware | https://sdk.vercel.ai/docs/ai-sdk-core/middleware | `wrapLanguageModel` pattern used for usage tracking, guardrails, rate limiting |
| AI SDK Tool Definitions | https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling | `tool()` function and Zod schema integration |
| AI SDK Structured Output | https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data | `generateObject`, `streamObject` with Zod schemas |
| AI SDK React Hooks | https://sdk.vercel.ai/docs/ai-sdk-ui | `useChat`, `useCompletion`, `useObject` hooks for frontend |
| AI SDK Streaming | https://sdk.vercel.ai/docs/ai-sdk-core/streaming | SSE streaming protocol and `toUIMessageStreamResponse()` |
| AI SDK GitHub | https://github.com/vercel/ai | Source code and issue tracker |

### pgvector

| Resource | URL | Relevance |
|----------|-----|-----------|
| pgvector GitHub | https://github.com/pgvector/pgvector | PostgreSQL vector similarity search extension. Used by the PgVectorAdapter. |
| pgvector Node.js | https://github.com/pgvector/pgvector-node | Node.js client library for pgvector |
| pgvector Indexing Guide | https://github.com/pgvector/pgvector#indexing | HNSW vs IVFFlat index selection and tuning |
| Drizzle pgvector | https://orm.drizzle.team/docs/extensions/pg#pg_vector | Drizzle ORM integration with pgvector column types |
| Neon pgvector | https://neon.tech/docs/extensions/pgvector | pgvector on Neon Postgres (the default hosting) |

### Pinecone

| Resource | URL | Relevance |
|----------|-----|-----------|
| Pinecone Documentation | https://docs.pinecone.io/ | Managed vector database. Used by the PineconeAdapter. |
| Pinecone Node.js Client | https://docs.pinecone.io/reference/typescript-sdk | `@pinecone-database/pinecone` SDK |
| Pinecone Namespaces | https://docs.pinecone.io/guides/indexes/use-namespaces | Namespace-based tenant isolation pattern |
| Pinecone Metadata Filtering | https://docs.pinecone.io/guides/data/filter-with-metadata | Metadata filter syntax for queries |

---

## AI Provider Documentation

### OpenAI

| Resource | URL | Relevance |
|----------|-----|-----------|
| API Reference | https://platform.openai.com/docs/api-reference | REST API docs for language, embedding, image, TTS, transcription |
| Models | https://platform.openai.com/docs/models | Available models and capabilities |
| Pricing | https://openai.com/api/pricing/ | Token and image pricing for cost calculation |
| Rate Limits | https://platform.openai.com/docs/guides/rate-limits | RPM/TPM limits by tier |
| @ai-sdk/openai | https://sdk.vercel.ai/providers/ai-sdk-providers/openai | AI SDK provider package docs |

### Anthropic

| Resource | URL | Relevance |
|----------|-----|-----------|
| API Reference | https://docs.anthropic.com/en/api | REST API docs for Claude models |
| Models | https://docs.anthropic.com/en/docs/about-claude/models | Model capabilities and context windows |
| Pricing | https://www.anthropic.com/pricing | Token pricing for cost calculation |
| Rate Limits | https://docs.anthropic.com/en/api/rate-limits | RPM/TPM limits by tier |
| @ai-sdk/anthropic | https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic | AI SDK provider package docs |

### Google Generative AI

| Resource | URL | Relevance |
|----------|-----|-----------|
| API Reference | https://ai.google.dev/api | REST API docs for Gemini models |
| Models | https://ai.google.dev/gemini-api/docs/models/gemini | Available models and capabilities |
| Pricing | https://ai.google.dev/pricing | Token and image pricing |
| @ai-sdk/google | https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai | AI SDK provider package docs |

---

## Observability

### LangSmith

| Resource | URL | Relevance |
|----------|-----|-----------|
| LangSmith Documentation | https://docs.smith.langchain.com/ | Optional tracing/observability platform |
| LangSmith Tracing | https://docs.smith.langchain.com/observability/how_to_guides/tracing | Trace setup and configuration |
| LangSmith Node.js SDK | https://docs.smith.langchain.com/reference/sdk/typescript | `langsmith` npm package for programmatic tracing |

---

## Security Standards

### OWASP LLM Top 10

| Resource | URL | Relevance |
|----------|-----|-----------|
| OWASP Top 10 for LLM Applications | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | Security risks specific to LLM applications |

Key risks addressed by module-ai:

| OWASP Risk | Module AI Mitigation |
|-----------|---------------------|
| LLM01: Prompt Injection | Guardrail engine with keyword/regex/classifier input filtering |
| LLM02: Insecure Output Handling | Output guardrails, content filtering before returning to caller |
| LLM04: Model Denial of Service | Rate limiting (RPM, TPM), budget limits, maxTokens enforcement |
| LLM06: Sensitive Information Disclosure | API key encryption, masking in responses, audit log sensitivity levels |
| LLM08: Excessive Agency | Tool invocation requires explicit permissions, budget limits on agent scope |
| LLM09: Overreliance | Usage tracking and cost visibility to encourage responsible use |
| LLM10: Model Theft | Provider credentials encrypted, never exposed via API |

### Encryption Standards

| Standard | Application |
|----------|-------------|
| AES-256-GCM (NIST SP 800-38D) | API key encryption at rest |
| CSPRNG (crypto.randomBytes) | IV generation for each encryption |
| TLS 1.3 | All API key transmission to providers |

---

## Industry References

### How Others Handle Similar Problems

| Company/Project | Pattern | Relevance to Module AI |
|----------------|---------|----------------------|
| **Supabase** | pgvector integration with auth + storage | Reference for pgvector adapter design. Supabase uses RLS policies on vector tables for tenant isolation -- similar to our approach. |
| **Neon** | Serverless Postgres with pgvector | Our default hosting. Pre-installed pgvector extension. Reference for connection pooling and scaling vector workloads. |
| **Vercel** | AI SDK middleware architecture | Direct foundation. Module AI's middleware chain is built on Vercel's `wrapLanguageModel` pattern. |
| **LangChain** | Provider abstraction, tool definitions | Reference for tool schema design. LangChain's tool interface inspired the Zod-based schema catalog. |
| **n8n** | AI node architecture, node registry pattern | Reference for the tool catalog registry. n8n's node type system (trigger, action, tool) maps to our tool categorization. |
| **OpenRouter** | Multi-provider routing, model aliases | Reference for the model alias and provider resolution chain. OpenRouter's routing logic inspired the strategy pattern. |
| **Helicone** | AI usage tracking, cost monitoring | Reference for the usage dashboard and cost calculation. Helicone's per-request logging model influenced ai_usage_logs design. |
| **LiteLLM** | Provider-agnostic LLM proxy | Reference for the provider registry abstraction. LiteLLM's unified interface maps well to the AI SDK customProvider pattern. |

---

## npm Packages

### Direct Dependencies

| Package | Version Range | Purpose |
|---------|--------------|---------|
| `ai` | `^4.0` | Vercel AI SDK core |
| `@ai-sdk/openai` | `^1.0` | OpenAI provider |
| `@ai-sdk/anthropic` | `^1.0` | Anthropic provider |
| `@ai-sdk/google` | `^1.0` | Google Generative AI provider |
| `zod` | `^3.23` | Schema definitions for tools |
| `drizzle-orm` | `^0.36` | Database ORM |

### Peer Dependencies (optional)

| Package | Purpose | When Needed |
|---------|---------|-------------|
| `@pinecone-database/pinecone` | Pinecone adapter | When Pinecone vector stores are configured |
| `langsmith` | LangSmith tracing | When `LANGSMITH_API_KEY` env var is set |
| `pgvector` | pgvector Node.js utilities | When pgvector vector stores are configured |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@ai-sdk/provider-utils` | Test utilities for AI SDK providers |
| `vitest` | Unit testing |

---

## Pricing References

Pricing data is used by the CostCalculator component to estimate per-call costs. These prices change frequently -- the module stores pricing in provider config JSONB and should be updated periodically.

### Token Pricing (as of early 2026, approximate)

| Provider | Model | Input (per 1M tokens) | Output (per 1M tokens) |
|----------|-------|----------------------|----------------------|
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| OpenAI | text-embedding-3-small | $0.02 | -- |
| OpenAI | text-embedding-3-large | $0.13 | -- |
| Anthropic | claude-sonnet-4-20250514 | $3.00 | $15.00 |
| Anthropic | claude-3-5-haiku-20241022 | $0.80 | $4.00 |
| Google | gemini-2.0-flash | $0.10 | $0.40 |

### Image Pricing (approximate)

| Provider | Model | Per Image |
|----------|-------|-----------|
| OpenAI | dall-e-3 (1024x1024, standard) | $0.040 |
| OpenAI | dall-e-3 (1024x1024, hd) | $0.080 |
| OpenAI | dall-e-3 (1792x1024, standard) | $0.080 |

**Note**: These prices are indicative. Always refer to the official pricing pages (linked above) for current rates. The module's CostCalculator reads pricing from the provider's `metadata.pricing` JSONB field, which should be updated when provider pricing changes.
