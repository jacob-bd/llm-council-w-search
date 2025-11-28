# LLM Council Plus

![llmcouncil](header.png)

> [!TIP]
> **Now with Web Search!** Supports DuckDuckGo, Brave, and Tavily with full article fetching.

The idea of this repo is that instead of asking a question to your favorite LLM provider (e.g. OpenAI GPT 5.1, Google Gemini 3.0 Pro, Anthropic Claude Sonnet 4.5, xAI Grok 4, etc.), you can group them into your "LLM Council". This repo is a simple, local web app that essentially looks like ChatGPT except it uses OpenRouter to send your query to multiple LLMs, it then asks them to review and rank each other's work, and finally a Chairman LLM produces the final response.

In a bit more detail, here is what happens when you submit a query:

1. **Stage 1: First opinions**. The user query is given to all LLMs individually, and the responses are collected. The individual responses are shown in a "tab view", so that the user can inspect them all one by one.
2. **Stage 2: Review**. Each individual LLM is given the responses of the other LLMs. Under the hood, the LLM identities are anonymized so that the LLM can't play favorites when judging their outputs. The LLM is asked to rank them in accuracy and insight.
3. **Stage 3: Final response**. The designated Chairman of the LLM Council takes all of the model's responses and compiles them into a single final answer that is presented to the user.

## Credits & Acknowledgements

This project is a fork and enhancement of the original **[llm-council](https://github.com/karpathy/llm-council)** by **[Andrej Karpathy](https://github.com/karpathy)**.

**LLM Council Plus** builds upon the original "vibe coded" foundation with significant new features:
*   **Web Search Integration**: Real-time information retrieval using DuckDuckGo, Tavily, and Brave.
*   **Hybrid Model Support**: Mix and match local Ollama models with cloud-based OpenRouter models.
*   **Enhanced Settings**: Granular control over system prompts, search providers, and council composition.
*   **Robust Error Handling**: Improved stability and graceful degradation.

We gratefully acknowledge Andrej Karpathy for the original inspiration and codebase.

## Vibe Code Alert

This project was originally 99% vibe coded as a fun Saturday hack by Andrej Karpathy. It has since been expanded into "LLM Council Plus" to add more robust features while keeping the spirit of the original "vibe coding" alive. Code is ephemeral now and libraries are over, ask your LLM to change it in whatever way you like.

## Setup

### 1. Install Dependencies

The project uses [uv](https://docs.astral.sh/uv/) for project management.

**Backend:**
```bash
uv sync
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Run the Application

**Option 1: Use the start script**
```bash
./start.sh
```

**Option 2: Run manually**

Terminal 1 (Backend):
```bash
uv run python -m backend.main
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

### 3. Configure in Settings

On first launch, open the Settings panel to configure:

- **OpenRouter API Key** - Required. Get one at [openrouter.ai](https://openrouter.ai/)
- **Council Models** - Select which LLMs participate in the council
- **Chairman Model** - The model that synthesizes the final answer
- **Search Provider** - DuckDuckGo (free), Brave, or Tavily
- **Full Article Fetch** - Number of search results to fetch full content for (via Jina Reader)

All settings are stored locally in `data/settings.json`.

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx, OpenRouter API
- **Frontend:** React + Vite, react-markdown for rendering
- **Storage:** JSON files in `data/`
- **Package Management:** uv for Python, npm for JavaScript
