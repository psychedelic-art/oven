# Knowledge Base -- References

> External resources, prior art, and technical references for `module-knowledge-base`.

---

## 1. pgvector

- **pgvector GitHub repository**: Core extension for vector similarity search in PostgreSQL. Documents the `vector` column type, distance operators (`<=>`, `<->`, `<#>`), and index types (IVFFlat, HNSW).
  - https://github.com/pgvector/pgvector

- **pgvector: Indexing guide**: Detailed comparison of IVFFlat vs HNSW index types, parameter tuning (`lists`, `m`, `ef_construction`), and when to use each.
  - https://github.com/pgvector/pgvector#indexing

- **Neon pgvector documentation**: Neon's guide to using pgvector with their serverless Postgres, including performance characteristics and connection pooling considerations for vector queries.
  - https://neon.tech/docs/extensions/pgvector

- **Supabase vector search guide**: Practical walkthrough of building semantic search with pgvector in a Supabase/Postgres context. Covers embedding storage, similarity queries, and RPC functions.
  - https://supabase.com/docs/guides/ai/vector-columns

---

## 2. Embeddings

- **OpenAI embeddings guide**: Official documentation for the text-embedding-3 model family. Covers model selection (small vs large), dimension reduction, token limits, and best practices for embedding text.
  - https://platform.openai.com/docs/guides/embeddings

- **OpenAI embedding model comparison**: Performance benchmarks and pricing for `text-embedding-3-small` (1536 dims) vs `text-embedding-3-large` (3072 dims) vs legacy `text-embedding-ada-002`.
  - https://platform.openai.com/docs/models/embeddings

- **Tokenization and chunking**: Understanding how text is tokenized before embedding. Important for the Transform stage of the embedding pipeline (truncation must respect token boundaries, not character boundaries).
  - https://platform.openai.com/tokenizer

---

## 3. Hybrid Search

- **Pinecone: Hybrid search explained**: Comprehensive overview of combining dense (vector) and sparse (keyword) retrieval. Covers scoring fusion strategies (Reciprocal Rank Fusion, weighted combination) and when hybrid outperforms pure semantic search.
  - https://www.pinecone.io/learn/hybrid-search-intro/

- **BM25 + vector search**: Academic and practical perspectives on combining BM25 (traditional keyword ranking) with vector similarity for improved retrieval accuracy. Relevant background for the keyword fallback strategy.
  - https://www.pinecone.io/learn/series/rag/rerankers/

- **Full-text search in PostgreSQL**: PostgreSQL's built-in `tsvector`/`tsquery` for keyword search. A potential future enhancement to replace ILIKE-based keyword matching with proper full-text search.
  - https://www.postgresql.org/docs/current/textsearch.html

---

## 4. RAG (Retrieval-Augmented Generation)

- **RAG pattern overview**: The foundational pattern that the Knowledge Base module enables. Retrieve relevant documents, then use them as context for LLM generation. The KB module handles the "retrieve" step.
  - https://www.pinecone.io/learn/retrieval-augmented-generation/

- **LangChain RAG tutorial**: End-to-end walkthrough of building a RAG pipeline with document loaders, text splitters, vector stores, and retrieval chains. Informs the pipeline architecture.
  - https://python.langchain.com/docs/tutorials/rag/

- **LlamaIndex knowledge base patterns**: Alternative RAG framework with focus on structured knowledge (categories, hierarchies). Informs the category-based organization approach.
  - https://docs.llamaindex.ai/en/stable/

---

## 5. FAQ Chatbot Architectures

- **FAQ-first, LLM-last pattern**: The architectural principle behind the Knowledge Base module. Search curated FAQs before falling back to LLM generation. Reduces cost, improves consistency, and constrains scope.
  - Similar patterns documented in Rasa, Botpress, and Dialogflow CX documentation.

- **n8n knowledge base node**: n8n's AI workflow nodes include a Knowledge Base node that retrieves documents from vector stores. Informs the workflow integration design (how `module-workflow-agents` connects to KB search).
  - https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoresupabase/

- **Dialogflow CX knowledge connectors**: Google's approach to FAQ-based chatbots with automatic question matching. Informs the confidence threshold and fallback behavior design.
  - https://cloud.google.com/dialogflow/cx/docs/concept/knowledge-connector

---

## 6. Drizzle ORM

- **Drizzle pgvector integration**: How to define vector columns in Drizzle schema. The `vector()` column type maps to pgvector's `vector(N)` PostgreSQL type.
  - https://orm.drizzle.team/docs/column-types/pg#vector

- **Drizzle raw SQL queries**: Using `sql` tagged template for custom queries (required for vector distance operations that Drizzle's query builder does not natively support).
  - https://orm.drizzle.team/docs/sql

- **Drizzle JSONB operations**: JSONB column type and query operators. Used for the `keywords` and `metadata` columns.
  - https://orm.drizzle.team/docs/column-types/pg#jsonb

---

## 7. React Admin Components

- **React Admin data provider**: How `ra-data-simple-rest` translates React Admin list/filter/sort operations into query parameters (`sort`, `range`, `filter`). Informs the `parseListParams` usage in KB handlers.
  - https://marmelab.com/react-admin/DataProviders.html

- **React Admin rich text input**: RichTextInput component for the answer field in entry forms.
  - https://marmelab.com/react-admin/RichTextInput.html

- **@dnd-kit sortable**: Drag-and-drop library used for category reordering in the dashboard.
  - https://dndkit.com/

---

## 8. Related OVEN Documentation

| Document | Path | Relevance |
|---|---|---|
| Original KB spec | `docs/modules/18-knowledge-base.md` | Source specification |
| Module rules | `docs/module-rules.md` | Compliance requirements |
| module-ai spec | `docs/modules/12-ai.md` | Embedding API contract |
| module-config spec | `docs/modules/20-module-config.md` | Config cascade system |
| module-subscriptions spec | `docs/modules/21-module-subscriptions.md` | Quota and billing integration |
| Architecture overview | `Architecture.md` | System-wide architecture |
| API routes | `docs/routes.md` | All platform routes |
| Use cases | `docs/use-cases.md` | Platform use-case catalog |
