# Gemini Interaction & Project Context

**Date:** November 27, 2025
**Project:** LLM Council Plus (Hybrid OpenRouter + Ollama)

## Project Overview
A local AI "Council" application where multiple LLMs (from OpenRouter or local Ollama) debate and answer user queries in a 3-stage process:
1.  **Stage 1:** Individual responses from selected models (with optional web search context).
2.  **Stage 2:** Peer review and ranking (anonymized evaluation).
3.  **Stage 3:** Final synthesis by a "Chairman" model.

## Key Features Added/Modified
*   **Web Search Integration:** Supports DuckDuckGo (free), Tavily (API), and Brave (API).
*   **Full Content Fetching:** Uses Jina Reader to fetch article content, with fallback to summaries if fetch fails or times out.
*   **Streaming Responses:** Real-time UI updates via Server-Sent Events (SSE).
*   **Robust Error Handling:** 
    *   Retries on rate limits (reduced aggressiveness).
    *   Graceful degradation (saves error messages to history if Stage 1 fails).
    *   Fallback content for search results.
*   **Hybrid AI Support:**
    *   **OpenRouter Mode:** Cloud-only models.
    *   **Ollama Mode:** Local-only models (auto-sorted by usage).
    *   **Hybrid Mode:** Mix and match local and cloud models in the same council.
*   **Settings UI Improvements:**
    *   **Remote/Local toggles** for easy selection in Hybrid mode.
    *   **Customizable System Prompts** for each stage (Stage 1, 2, 3, Title, Query).
    *   **UI polish:** Red remove buttons, compact spacing, responsive modal width.

## Architecture
*   **Backend:** Python (FastAPI). Handles orchestration, API calls (OpenRouter/Ollama), search, and conversation storage (JSON).
*   **Frontend:** React (Vite). Displays the chat interface, renders Markdown, manages settings state.
*   **Storage:** Local JSON files in `data/conversations/`.

## Setup & Running
*   **Start:** `./start.sh` (runs both backend and frontend).
*   **Backend Port:** 8001
*   **Frontend Port:** 5173

## Recent Fixes (Nov 28, 2025)
*   **Stage 1 Progress Counter:** Implemented real-time "X/Y completed" counter by refactoring backend to stream results incrementally.
*   **Abort Functionality:** Fixed "Stop" button by ensuring backend checks for client disconnection (`request.is_disconnected()`) inside loops.
*   **Title Generation:** Ensured conversation titles are generated and saved even if the query is aborted early.
*   **Backend Stability:** Fixed `UnboundLocalError`, `AttributeError`, and `NameError` in `backend/main.py`.
*   **UI Duplicate Tabs:** Fixed duplicate tabs in Stage 1/2 by using immutable state updates in `App.jsx`.
*   **Settings UI:** Added Import/Export buttons (functionality pending UI refactor).

## Next Steps
*   **Settings UI Refactoring:** Decide on layout (Sidebar vs. Tabs) and implement to reduce scrolling.
*   **Testing:** Verify stability of new abort and progress logic.

## Lessons Learned
*   **Tool Safety:** NEVER use placeholders like `// ...` in `replace_file_content`. It deletes code. Always provide full content.
*   **FastAPI Request:** Always inject the raw `Request` object into endpoints if you need to check for `is_disconnected()`. Pydantic models don't have this method.
*   **React Strict Mode:** Be careful with state mutations in `useEffect` or updaters; they run twice in Strict Mode, causing duplicates if not handled immutably.
