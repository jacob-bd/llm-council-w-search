# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Council Plus is a 3-stage deliberation system where multiple LLMs collaboratively answer user questions through:
1. **Stage 1**: Individual model responses (with optional web search context)
2. **Stage 2**: Anonymous peer review/ranking to prevent bias
3. **Stage 3**: Chairman synthesis of collective wisdom

**Key Innovation**: Hybrid architecture supporting OpenRouter (cloud), Ollama (local), and mixed councils.

## Running the Application

**Quick Start:**
```bash
./start.sh
```

**Manual Start:**
```bash
# Backend (from project root)
uv run python -m backend.main

# Frontend (in new terminal)
cd frontend
npm run dev
```

**Ports:**
- Backend: `http://localhost:8001` (NOT 8000 - avoid conflicts)
- Frontend: `http://localhost:5173`

**Installing Dependencies:**
```bash
# Backend
uv sync

# Frontend
cd frontend
npm install
```

**Important**: If switching between Intel/Apple Silicon Macs with iCloud sync:
```bash
rm -rf frontend/node_modules && cd frontend && npm install
```
This fixes binary incompatibilities (e.g., `@rollup/rollup-darwin-*` variants).

## Architecture Overview

### Backend (`backend/`)

**Provider System** (`backend/providers/`)
- **Base**: `base.py` - Abstract interface for all LLM providers
- **Implementations**: `openrouter.py`, `ollama.py`, `openai.py`, `anthropic.py`, `google.py`, `mistral.py`, `deepseek.py`
- **Auto-routing**: Model IDs with prefix (e.g., `openai:gpt-4.1`, `ollama:llama3`) route to correct provider
- **Fallback**: Unprefixed IDs use `settings.llm_provider` (openrouter/ollama/hybrid)

**Core Modules**

`council.py` - Orchestration logic
- `stage1_collect_responses()`: Parallel queries with optional search context, **yields** incremental results for streaming
- `stage2_collect_rankings()`: Anonymizes responses as "Response A/B/C", prompts peer evaluation
- `stage3_synthesize_final()`: Chairman synthesizes final answer
- `calculate_aggregate_rankings()`: Computes average rank positions
- `generate_conversation_title()`: Auto-titles conversations from first message
- `generate_search_query()`: Extracts search terms from user query

`search.py` - Web search integration
- **Providers**: DuckDuckGo (free), Tavily (API), Brave (API)
- **Full Content Fetch**: Top N results fetched via Jina Reader (configurable, default 3)
- **Rate Limiting**: Auto-retry with exponential backoff for DuckDuckGo
- **Graceful Degradation**: Falls back to summaries if full fetch fails/times out

`settings.py` - Configuration management
- **Storage**: `data/settings.json` (persisted, not `.env` only)
- **LLM Modes**: `openrouter`, `ollama`, `hybrid`, `direct`
- **Customization**: System prompts for Stage 1/2/3, search query generation
- **Available Models**: Curated list in `AVAILABLE_MODELS` for UI dropdown

`prompts.py` - Default system prompts
- `STAGE1_PROMPT_DEFAULT`: Initial model query template
- `STAGE2_PROMPT_DEFAULT`: Peer ranking prompt with strict format enforcement
- `STAGE3_PROMPT_DEFAULT`: Chairman synthesis instructions
- `SEARCH_QUERY_PROMPT_DEFAULT`: Search term extraction template
- All customizable via Settings UI

`main.py` - FastAPI application
- **Standard Endpoint**: `POST /api/conversations/{id}/message` - batch processing
- **Streaming Endpoint**: `POST /api/conversations/{id}/message/stream` - SSE for real-time updates
- **Abort Support**: Checks `request.is_disconnected()` in loops to honor client disconnects
- **Metadata**: Returns `label_to_model` mapping and `aggregate_rankings` (ephemeral, not persisted)

`storage.py` - Conversation persistence
- **Format**: JSON files in `data/conversations/{id}.json`
- **Structure**: `{id, created_at, title, messages[]}`
- **Messages**: User messages have `{role, content}`, assistant messages have `{role, stage1, stage2, stage3}`
- **Note**: Metadata (label_to_model, rankings) NOT saved, only returned via API

### Frontend (`frontend/src/`)

**Key Components**

`App.jsx` - Main orchestration
- Manages conversation list and current conversation state
- Handles SSE streaming via `EventSource`
- Stores ephemeral metadata (label_to_model, rankings) in UI state
- **Important**: Uses immutable state updates to prevent duplicate tabs (React StrictMode issue)

`components/ChatInterface.jsx`
- Multiline textarea (3 rows, resizable)
- Enter = send, Shift+Enter = newline
- Web search toggle checkbox
- User messages wrapped in `.markdown-content` for padding

`components/Stage1.jsx`
- Tab view of individual model responses
- Real-time progress counter: "X/Y completed" during streaming
- ReactMarkdown rendering with `.markdown-content` wrapper

`components/Stage2.jsx`
- **Critical**: Shows RAW peer evaluation text (models receive anonymous labels)
- Client-side de-anonymization for display (model names in **bold**)
- "Extracted Ranking" section below each evaluation for validation
- Aggregate rankings with average position and vote count
- Explanatory text clarifies anonymization

`components/Stage3.jsx`
- Final synthesized answer from chairman
- Green-tinted background (`#f0fff0`) to highlight conclusion

`components/Settings.jsx`
- Configure API keys, council/chairman models, search provider
- **Hybrid Mode**: Remote/Local toggles for model selection
- Customizable system prompts with reset to defaults
- Full content fetch slider (0-10 results)
- Settings saved to `data/settings.json` via backend API
- Import/Export functionality for backing up and sharing settings

**Styling**
- Light mode theme (not dark mode)
- Primary color: `#4a90e2` (blue)
- Global markdown: `.markdown-content` class in `index.css` (12px padding)

## Critical Implementation Details

### Python Module Imports
**ALWAYS** use relative imports in backend modules:
```python
from .config import ...
from .council import ...
```
**NEVER** use absolute imports like `from backend.config import ...`

**Run backend as module** from project root:
```bash
python -m backend.main  # Correct
cd backend && python main.py  # WRONG - breaks imports
```

### Stage 2 Ranking Format
The Stage 2 prompt enforces strict format for reliable parsing:
```
1. Individual evaluations of each response
2. Blank line
3. "FINAL RANKING:" header (all caps, with colon)
4. Numbered list: "1. Response C", "2. Response A", etc.
5. No additional text after ranking
```

Fallback regex extracts any "Response X" patterns if format not followed.

### Streaming & Abort Logic
- Streaming uses **generator functions** that `yield` results incrementally
- Backend checks `request.is_disconnected()` inside loops to detect aborts
- Frontend sends abort by closing `EventSource` connection
- **Critical**: Always inject raw `Request` object into streaming endpoints (Pydantic models lack `is_disconnected()`)

### Markdown Rendering
**All** `<ReactMarkdown>` components must be wrapped:
```jsx
<div className="markdown-content">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```
This class is defined in `index.css` and provides consistent spacing.

### Hybrid Model Format
Models in hybrid mode use prefix format:
- `openrouter:anthropic/claude-sonnet-4` - Cloud model via OpenRouter
- `ollama:llama3.1:latest` - Local model via Ollama
- Prefix determines routing in `council.py:get_provider_for_model()`

## Common Gotchas

1. **Port Conflicts**: Backend uses 8001 (not 8000). Update `backend/main.py` and `frontend/src/api.js` together if changing.

2. **CORS Errors**: Frontend origins must match `main.py` CORS middleware (currently localhost:5173 and :3000).

3. **Missing Metadata**: `label_to_model` and `aggregate_rankings` are ephemeral - only in API responses, not stored in JSON.

4. **Duplicate Tabs**: Use immutable state updates in React (spread operator), not direct mutations. StrictMode runs effects twice.

5. **Search Rate Limits**: DuckDuckGo news search can rate-limit. Retry logic in `search.py` handles this.

6. **Ranking Parse Failures**: If models ignore format, fallback regex extracts "Response X" patterns in order of appearance.

7. **React StrictMode**: Effects run twice in dev. Ensure idempotent operations and immutable state updates.

8. **Binary Dependencies**: `node_modules` in iCloud can break when switching Mac architectures. Delete and reinstall if needed.

## Recent Fixes & Improvements (Nov 2025)

### Settings UX: Hybrid Auto-Save Approach
**Implementation Date:** Nov 29, 2025

**Auto-saved credentials** (immediately on successful validation):
- All API keys: Tavily, Brave, OpenRouter, Direct providers (OpenAI, Anthropic, Google, Mistral, DeepSeek)
- Ollama Base URL

**Manual save required** (experimental configurations):
- Council member selections
- Chairman model
- Search provider choice
- System prompts
- Utility models

**UX Flow:**
```
Enter credential → Click "Test" → ✓ Success → Auto-save → Clear input → "Settings saved!" → Status: "✓ configured"
```

**Key Implementation Details:**
- `Settings.jsx`: All test handlers (`handleTestTavily`, `handleTestBrave`, etc.) auto-save on success
- State preservation during reload: `const currentProvider = selectedLlmProvider; await loadSettings(); setSelectedLlmProvider(currentProvider);`
- Prevents credential auto-save from overwriting user's current provider selection
- `hasChanges` effect excludes auto-saved fields to avoid false positives

**Files Modified:** `frontend/src/components/Settings.jsx`

### Bug Fixes

**Provider Selection Jump** (Nov 29, 2025)
- **Issue:** Selecting "Ollama" then testing connection jumped selection back to saved value ("Hybrid")
- **Root Cause:** Auto-save's `loadSettings()` overwrote local UI state with backend values
- **Fix:** Preserve `selectedLlmProvider` during credential reload
- **File:** `frontend/src/components/Settings.jsx` - all test handlers

**Ollama Status Indicator Conflict** (Nov 29, 2025)
- **Issue:** Failed connection test showed red error but green "Connected" status persisted
- **Root Cause:** Parent `ollamaStatus` only refreshed on success, not failure
- **Fix:** Call `onRefreshOllama()` on both success AND failure/exception
- **Files:** `frontend/src/components/Settings.jsx` (handleTestOllama), `frontend/src/App.jsx` (testOllamaConnection)

**titleModel Code Cleanup** (Nov 29, 2025)
- Removed all leftover `titleModel` state, effects, checks (backend no longer uses separate model for titles)
- Updated Utility Models description to only mention search query generation
- **File:** `frontend/src/components/Settings.jsx`

### Code Quality Improvements (Nov 28-29, 2025)
See `BUGS_AND_OPTIMIZATIONS.md` for comprehensive analysis report:
- ✅ 3/3 critical bugs fixed (broken endpoint, duplicate returns, error handling)
- ✅ 4/4 medium bugs fixed (AbortController race, search timeout, error standardization, logging)
- ✅ 3/5 optimizations (async search, connection pooling, logging infrastructure)
- **Net result:** -30 lines, cleaner codebase, 10 bugs fixed

## Data Flow

```
User Query (+ optional web search)
    ↓
[Generate search query via LLM] (if web search enabled)
    ↓
[Fetch search results + full content for top N]
    ↓
Stage 1: Parallel queries → [individual responses] → Stream to frontend
    ↓
Stage 2: Anonymize → Parallel peer rankings → [evaluations + parsed rankings] → Stream to frontend
    ↓
Calculate aggregate rankings → [sorted by avg position]
    ↓
Stage 3: Chairman synthesis with full context → Stream to frontend
    ↓
Save conversation (stage1, stage2, stage3 only - no metadata)
    ↓
Return: {stage1, stage2, stage3, metadata} to frontend
```

All stages run asynchronously/in parallel where possible to minimize latency.

## Testing & Debugging

**Test OpenRouter connectivity:**
```bash
uv run python backend/test_openrouter.py
```

**Test search providers:**
```bash
uv run python backend/test_search.py
uv run python backend/debug_search.py
```

**Check Ollama models:**
```bash
curl http://localhost:11434/api/tags
```

**View backend logs:** Watch terminal running `backend/main.py` for detailed error messages and timing info.

## Web Search Features

**Providers:**
- **DuckDuckGo**: Free, uses news search for better results
- **Tavily**: Requires `TAVILY_API_KEY`, optimized for LLM/RAG
- **Brave**: Requires `BRAVE_API_KEY`, high-quality web results

**Full Content Fetching:**
- Uses Jina Reader (`https://r.jina.ai/{url}`) to extract article text
- Configurable: top 0-10 results (default 3)
- Fallback to summary if fetch fails or yields <500 chars
- Timeout: 25 seconds per article
- Content truncated to 2000 chars per result in LLM context

**Search Query Generation:**
- LLM (default: `gemini-2.5-flash`) extracts 3-6 key terms from user query
- Removes question words, focuses on entities and topics
- Customizable via `search_query_prompt` in Settings

## Settings & Configuration

**UI-Configurable:**
- API keys (OpenRouter, Tavily, Brave, Anthropic, OpenAI, Google, Mistral, DeepSeek)
- LLM provider mode (openrouter/ollama/hybrid/direct)
- Council models (multiple selection)
- Chairman model (single selection)
- Search provider (duckduckgo/tavily/brave)
- Full content results (0-10)
- System prompts (Stage 1/2/3, search query, title)

**Storage Location:** `data/settings.json`

**Reset to Defaults:** Settings UI has "Reset to Default" button for each prompt.

## Design Principles

### Error Handling Philosophy
- **Graceful Degradation**: Continue with successful responses if some models fail
- **Never Fail Entirely**: Single model failure doesn't block entire council
- **Log but Hide**: Errors logged to backend, not exposed to user unless all models fail
- **Fallbacks**: Search failures return system note, full fetch falls back to summary

### UI/UX Transparency
- All raw outputs inspectable via tabs (Stage 1 and Stage 2)
- Parsed rankings shown below raw text for validation
- Users can verify system's interpretation (builds trust, aids debugging)
- Progress indicators during streaming (X/Y completed)

### De-anonymization Strategy
- Models receive: "Response A", "Response B", etc. (no identifying info)
- Backend creates mapping: `{"Response A": "openai/gpt-4.1", ...}`
- Frontend displays model names in **bold** for readability
- Explanatory text clarifies original evaluation used anonymous labels
- Prevents bias while maintaining transparency

## Recent Work & Known Issues

**Recent Fixes (Nov 28-29, 2025):**

### Nov 28
- Stage 1 progress counter with real-time "X/Y completed" display
- Abort functionality via "Stop" button (backend checks `request.is_disconnected()`)
- Title generation now works even if query is aborted early
- Fixed `UnboundLocalError`, `AttributeError`, and `NameError` in `backend/main.py`
- Fixed duplicate tabs in Stage 1/2 via immutable state updates in `App.jsx`
- Settings import/export functionality implemented and working

### Nov 29 - Comprehensive Code Analysis
✅ **ALL CRITICAL BUGS FIXED (3/3):**
- Removed broken non-streaming endpoint and `run_full_council()` function (~60 lines dead code)
- Fixed duplicate return statement in title generation
- Added error handling for None/invalid inputs in title generation
- Fixed "Consulting the council..." not disappearing after Stage 3 completes

✅ **ALL MEDIUM-PRIORITY BUGS FIXED (4/4):**
- Fixed AbortController race condition (rapid Send→Stop→Send clicks)
- Added 60-second timeout budget for search operations
- Standardized error handling across all stages with consistent format
- Replaced all `print()` with proper `logging` module

✅ **PERFORMANCE OPTIMIZATIONS (3/5 completed):**
- Made search operations fully async (Tavily, Brave) - removed thread overhead
- Added HTTP connection pooling - persistent clients reuse connections
- Improved logging infrastructure throughout backend

**Code Impact:**
- Removed: ~110 lines (dead code, duplicates)
- Added: ~80 lines (error handling, pooling, logging)
- Net: -30 lines (cleaner codebase)
- 10 bugs fixed, 3 optimizations implemented

**Pending Work:**
- Settings UI refactoring: Decision needed on layout (Sidebar vs. Tabs) to reduce scrolling
- Optional optimizations: Settings state simplification, request caching
- Testing: See `BUGS_AND_OPTIMIZATIONS.md` for comprehensive test checklist

## AI Coding Best Practices (Lessons Learned)

**CRITICAL - Communication & Requirements:**
- **NEVER make assumptions** when user provides vague requests or requests with gaps
- **ALWAYS ask for clarification** when requirements are unclear or ambiguous
- **Provide multiple options** with pros/cons when there are different valid approaches
- **Confirm understanding** before implementing significant changes
- **Think about edge cases** and ask about desired behavior
- **Goal**: Achieve optimal results to delight the user, not just complete the task

**CRITICAL - For AI Code Editors:**
- **NEVER use placeholders** like `// ...` or `/* rest of code */` in file edits - this will delete actual code
- **Always provide full content** when writing or editing files
- **FastAPI `Request` injection**: Always inject raw `Request` object (not Pydantic models) to access `is_disconnected()`
- **React Strict Mode**: Effects run twice in dev mode - ensure idempotent operations and immutable state updates
- **State mutations**: Use spread operators (`...`) not direct mutations to prevent duplicate renders

## Future Enhancement Areas

**Not Yet Implemented:**
- Model performance analytics over time
- Export conversations to markdown/PDF
- Custom ranking criteria (beyond accuracy/insight)
- Special handling for reasoning models (o1, etc.)
- Backend caching for repeated queries
- Conversation import/export (settings import/export is complete)
