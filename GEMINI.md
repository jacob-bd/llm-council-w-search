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

## Recent Fixes (Nov 28-29, 2025)

### Nov 28
*   **Stage 1 Progress Counter:** Implemented real-time "X/Y completed" counter by refactoring backend to stream results incrementally.
*   **Abort Functionality:** Fixed "Stop" button by ensuring backend checks for client disconnection (`request.is_disconnected()`) inside loops.
*   **Title Generation:** Ensured conversation titles are generated and saved even if the query is aborted early.
*   **Backend Stability:** Fixed `UnboundLocalError`, `AttributeError`, and `NameError` in `backend/main.py`.
*   **UI Duplicate Tabs:** Fixed duplicate tabs in Stage 1/2 by using immutable state updates in `App.jsx`.
*   **Settings Import/Export:** Implemented and working - users can now backup and share settings configurations.

### Nov 29 - Code Analysis & Fixes
*   **✅ ALL CRITICAL BUGS FIXED (3/3):**
    *   Removed broken non-streaming endpoint and `run_full_council()` function (~60 lines of dead code)
    *   Fixed duplicate return statement in title generation
    *   Added error handling for None/invalid user queries in title generation
    *   Fixed "Consulting the council..." loading indicator not disappearing after Stage 3

*   **✅ ALL MEDIUM-PRIORITY BUGS FIXED (4/4):**
    *   Fixed AbortController race condition in `App.jsx` (rapid Send→Stop→Send clicks)
    *   Added 60-second timeout budget for search operations
    *   Standardized error handling across all stages (Stage 1, 2, 3)
    *   Replaced all `print()` with proper logging module

*   **✅ PERFORMANCE OPTIMIZATIONS (3/5 completed):**
    *   Made search operations fully async (Tavily, Brave) - removed thread overhead
    *   Added HTTP connection pooling for all search providers - reuse connections
    *   Improved logging infrastructure throughout backend

*   **📊 Total Impact:**
    *   ~110 lines removed (dead code, duplicates)
    *   ~80 lines added (error handling, pooling, logging)
    *   Net: -30 lines (cleaner codebase)
    *   10 critical/medium issues fixed
    *   3 performance optimizations implemented

### Nov 29 (Continued) - Settings UX Improvements
*   **✅ Hybrid Auto-Save Implementation:**
    *   **Auto-saved on validation:** API keys (Tavily, Brave, OpenRouter, Direct providers) and Ollama Base URL
    *   **Manual save required:** Model selections, prompts, search provider, utility models
    *   **Rationale:** Credentials are commitments (if validated, save immediately), configs are experimental (user may want to batch changes)
    *   **UX flow:** Test → Success → Auto-save → Clear input → Show "Settings saved!" → Update key status to "✓ configured"

*   **✅ Fixed Provider Selection Jump Bug:**
    *   **Problem:** Selecting "Ollama" then testing connection would jump selection back to "Hybrid" (saved value)
    *   **Cause:** `loadSettings()` during auto-save overwrote local UI state with backend values
    *   **Fix:** Preserve `selectedLlmProvider` during credential auto-save reloads
    *   **Files:** `frontend/src/components/Settings.jsx` (all test handlers)

*   **✅ Fixed Ollama Status Indicator Bug:**
    *   **Problem:** Failed connection test showed red error but green "Connected" status persisted below
    *   **Cause:** Only updated parent `ollamaStatus` on success, not on failure
    *   **Fix:** Always call `onRefreshOllama()` callback on both success and failure
    *   **Files:** `frontend/src/components/Settings.jsx` (handleTestOllama)

*   **✅ Code Cleanup:**
    *   Removed all `titleModel` leftover code (state, effects, hasChanges checks, save handler)
    *   Updated Utility Models description to remove mention of conversation titles
    *   Backend no longer uses separate model for title generation

## Next Steps
*   **Testing:** Verify all fixes work properly (see BUGS_AND_OPTIMIZATIONS.md for test checklist)
*   **Settings UI Refactoring:** Decide on layout (Sidebar vs. Tabs) and implement to reduce scrolling.
*   **Optional Future Optimizations:**
    *   Settings state management simplification (code quality)
    *   Request caching for repeated queries (performance)
*   **Conversation Import/Export:** Consider implementing similar import/export for conversations (settings version is complete).

## Lessons Learned

### Communication & Requirements
*   **NEVER make assumptions** when user provides vague requests or requests with gaps.
*   **ALWAYS ask for clarification** when requirements are unclear or ambiguous.
*   **Provide multiple options** with pros/cons when there are different valid approaches.
*   **Confirm understanding** before implementing significant changes.
*   **Think about edge cases** and ask about desired behavior.
*   **Goal:** Achieve optimal results to delight the user, not just complete the task.

### Technical Best Practices
*   **Tool Safety:** NEVER use placeholders like `// ...` in `replace_file_content`. It deletes code. Always provide full content.
*   **FastAPI Request:** Always inject the raw `Request` object into endpoints if you need to check for `is_disconnected()`. Pydantic models don't have this method.
*   **React Strict Mode:** Be careful with state mutations in `useEffect` or updaters; they run twice in Strict Mode, causing duplicates if not handled immutably.
*   **iCloud Sync & Node Modules:** Since this project is in iCloud Drive, `node_modules` syncs between machines. If switching between Intel and Apple Silicon Macs, you MUST run `rm -rf frontend/node_modules && cd frontend && npm install` to fix binary incompatibilities (e.g., `@rollup/rollup-darwin-x64` vs `arm64`).
