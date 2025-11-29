"""Web search module with multiple provider support."""

from ddgs import DDGS
from typing import List, Dict, Optional
from enum import Enum
import logging
import httpx
import os
import time
import asyncio

logger = logging.getLogger(__name__)

# Rate limit handling
MAX_RETRIES = 2
RETRY_DELAY = 2  # seconds

# Total timeout budget for all search operations (including content fetching)
SEARCH_TIMEOUT_BUDGET = 60  # seconds total

# Persistent HTTP clients for connection pooling
_async_client: Optional[httpx.AsyncClient] = None
_sync_client: Optional[httpx.Client] = None


def get_async_client() -> httpx.AsyncClient:
    """Get or create persistent async HTTP client for connection pooling."""
    global _async_client
    if _async_client is None:
        _async_client = httpx.AsyncClient(timeout=30.0)
    return _async_client


def get_sync_client() -> httpx.Client:
    """Get or create persistent sync HTTP client for connection pooling."""
    global _sync_client
    if _sync_client is None:
        _sync_client = httpx.Client(timeout=30.0)
    return _sync_client


class SearchProvider(str, Enum):
    DUCKDUCKGO = "duckduckgo"
    TAVILY = "tavily"
    BRAVE = "brave"


async def perform_web_search(
    query: str,
    max_results: int = 5,
    provider: SearchProvider = SearchProvider.DUCKDUCKGO,
    full_content_results: int = 3
) -> str:
    """
    Perform a web search using the specified provider.

    Args:
        query: The search query
        max_results: Maximum number of results to return
        provider: Which search provider to use
        full_content_results: Number of top results to fetch full content for (0 to disable)

    Returns:
        Formatted string with search results
    """
    try:
        if provider == SearchProvider.TAVILY:
            return await _search_tavily(query, max_results)
        elif provider == SearchProvider.BRAVE:
            return await _search_brave(query, max_results, full_content_results)
        else:
            # DuckDuckGo's DDGS library is synchronous, so run in thread
            return await asyncio.to_thread(_search_duckduckgo, query, max_results, full_content_results)
    except Exception as e:
        logger.error(f"Error performing web search with {provider}: {str(e)}")
        return "[System Note: Web search was attempted but failed. Please answer based on your internal knowledge.]"


def _search_duckduckgo(query: str, max_results: int = 5, full_content_results: int = 3) -> str:
    """
    Search using DuckDuckGo (news search for better results).
    Optionally fetches full content via Jina Reader for top N results.
    """
    start_time = time.time()
    search_results_data = []
    urls_to_fetch = []

    for attempt in range(MAX_RETRIES + 1):
        try:
            with DDGS() as ddgs:
                search_results = list(ddgs.news(query, max_results=max_results))

                for i, result in enumerate(search_results, 1):
                    title = result.get('title', 'No Title')
                    href = result.get('url', result.get('href', '#'))
                    body = result.get('body', result.get('excerpt', 'No description available.'))
                    source = result.get('source', '')

                    search_results_data.append({
                        'index': i,
                        'title': title,
                        'url': href,
                        'source': source,
                        'summary': body,
                        'content': None
                    })

                    # Queue top N results for full content fetch
                    if full_content_results > 0 and i <= full_content_results and href and href != '#':
                        urls_to_fetch.append((i - 1, href))
                break  # Success, exit retry loop

        except Exception as e:
            if "Ratelimit" in str(e) and attempt < MAX_RETRIES:
                logger.warning(f"DuckDuckGo rate limit hit, retrying in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                raise

    # Fetch full content via Jina Reader for top results
    for idx, url in urls_to_fetch:
        # Check remaining time budget
        elapsed = time.time() - start_time
        remaining = SEARCH_TIMEOUT_BUDGET - elapsed

        if remaining <= 5:  # Need at least 5s to fetch content
            logger.warning(f"Search timeout budget exhausted, skipping remaining content fetches")
            break

        # Use remaining time as timeout for this fetch (sync version for DuckDuckGo)
        content = _fetch_with_jina_sync(url, timeout=min(remaining, 25.0))
        if content:
            # If content is very short (likely paywall/cookie wall/failed parse),
            # append the original summary to ensure we have some info.
            if len(content) < 500:
                original_summary = search_results_data[idx]['summary']
                content += f"\n\n[System Note: Full content fetch yielded limited text. Appending original summary.]\nOriginal Summary: {original_summary}"
            search_results_data[idx]['content'] = content

    if not search_results_data:
        return "No web search results found."

    # Format results
    formatted = []
    for r in search_results_data:
        text = f"Result {r['index']}:\nTitle: {r['title']}\nURL: {r['url']}"
        if r['source']:
            text += f"\nSource: {r['source']}"
        if r['content']:
            # Truncate content to ~2000 chars
            content = r['content'][:2000]
            if len(r['content']) > 2000:
                content += "..."
            text += f"\nContent:\n{content}"
        else:
            text += f"\nSummary: {r['summary']}"
        formatted.append(text)

    return "\n\n".join(formatted)


def _fetch_with_jina_sync(url: str, timeout: float = 25.0) -> Optional[str]:
    """
    Fetch article content using Jina Reader API (sync version for DuckDuckGo).
    Returns clean markdown content. Uses connection pooling.
    """
    try:
        jina_url = f"https://r.jina.ai/{url}"
        client = get_sync_client()
        response = client.get(jina_url, headers={
            "Accept": "text/plain",
        }, timeout=timeout)
        if response.status_code == 200:
            return response.text
        else:
            logger.warning(f"Jina Reader returned {response.status_code} for {url}")
            return None
    except httpx.TimeoutException:
        logger.warning(f"Timeout while fetching content via Jina for {url}")
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch content via Jina for {url}: {e}")
        return None


async def _fetch_with_jina(url: str, timeout: float = 25.0) -> Optional[str]:
    """
    Fetch article content using Jina Reader API (async).
    Returns clean markdown content. Uses connection pooling.
    """
    try:
        jina_url = f"https://r.jina.ai/{url}"
        client = get_async_client()
        response = await client.get(jina_url, headers={
            "Accept": "text/plain",
        }, timeout=timeout)
        if response.status_code == 200:
            return response.text
        else:
            logger.warning(f"Jina Reader returned {response.status_code} for {url}")
            return None
    except httpx.TimeoutException:
        logger.warning(f"Timeout while fetching content via Jina for {url}")
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch content via Jina for {url}: {e}")
        return None


async def _search_tavily(query: str, max_results: int = 5) -> str:
    """
    Search using Tavily API (designed for LLM/RAG use cases, async).
    Requires TAVILY_API_KEY environment variable. Uses connection pooling.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        logger.error("TAVILY_API_KEY not set")
        return "[System Note: Tavily API key not configured. Please add TAVILY_API_KEY to your environment.]"

    try:
        client = get_async_client()
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": api_key,
                "query": query,
                "max_results": max_results,
                "include_answer": False,
                "include_raw_content": False,
                "search_depth": "advanced",
            },
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for i, result in enumerate(data.get("results", []), 1):
            title = result.get("title", "No Title")
            url = result.get("url", "#")
            content = result.get("content", "No content available.")

            text = f"Result {i}:\nTitle: {title}\nURL: {url}\nContent:\n{content}"
            results.append(text)

        if not results:
            return "No web search results found."

        return "\n\n".join(results)

    except httpx.HTTPStatusError as e:
        logger.error(f"Tavily API error: {e.response.status_code} - {e.response.text}")
        return "[System Note: Tavily search failed. Please check your API key.]"
    except Exception as e:
        logger.error(f"Tavily search error: {e}")
        return "[System Note: Tavily search failed. Please try again.]"


async def _search_brave(query: str, max_results: int = 5, full_content_results: int = 3) -> str:
    """
    Search using Brave Search API (async).
    Optionally fetches full content via Jina Reader for top N results.
    Requires BRAVE_API_KEY environment variable. Uses connection pooling.
    """
    start_time = time.time()
    api_key = os.environ.get("BRAVE_API_KEY")
    if not api_key:
        logger.error("BRAVE_API_KEY not set")
        return "[System Note: Brave API key not configured. Please add your Brave API key in settings.]"

    try:
        client = get_async_client()
        response = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={
                "q": query,
                "count": max_results,
            },
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": api_key,
            },
        )
        response.raise_for_status()
        data = response.json()

        search_results_data = []
        urls_to_fetch = []
        web_results = data.get("web", {}).get("results", [])

        for i, result in enumerate(web_results[:max_results], 1):
            title = result.get("title", "No Title")
            url = result.get("url", "#")
            description = result.get("description", "No description available.")

            # Some results have extra_snippets with more content
            extra = result.get("extra_snippets", [])
            if extra:
                description += "\n" + "\n".join(extra[:2])

            search_results_data.append({
                'index': i,
                'title': title,
                'url': url,
                'summary': description,
                'content': None
            })

            # Queue top N results for full content fetch
            if full_content_results > 0 and i <= full_content_results and url and url != '#':
                urls_to_fetch.append((i - 1, url))

        # Fetch full content via Jina Reader for top results
        for idx, url in urls_to_fetch:
            # Check remaining time budget
            elapsed = time.time() - start_time
            remaining = SEARCH_TIMEOUT_BUDGET - elapsed

            if remaining <= 5:  # Need at least 5s to fetch content
                logger.warning(f"Search timeout budget exhausted, skipping remaining content fetches")
                break

            # Use remaining time as timeout for this fetch
            content = await _fetch_with_jina(url, timeout=min(remaining, 25.0))
            if content:
                # If content is very short, append summary
                if len(content) < 500:
                    original_summary = search_results_data[idx]['summary']
                    content += f"\n\n[System Note: Full content fetch yielded limited text. Appending original summary.]\nOriginal Summary: {original_summary}"
                search_results_data[idx]['content'] = content

        if not search_results_data:
            return "No web search results found."

        # Format results
        formatted = []
        for r in search_results_data:
            text = f"Result {r['index']}:\nTitle: {r['title']}\nURL: {r['url']}"
            if r['content']:
                # Truncate content to ~2000 chars
                content = r['content'][:2000]
                if len(r['content']) > 2000:
                    content += "..."
                text += f"\nContent:\n{content}"
            else:
                text += f"\nSummary: {r['summary']}"
            formatted.append(text)

        return "\n\n".join(formatted)

    except httpx.HTTPStatusError as e:
        logger.error(f"Brave API error: {e.response.status_code} - {e.response.text}")
        return "[System Note: Brave search failed. Please check your API key.]"
    except Exception as e:
        logger.error(f"Brave search error: {e}")
        return "[System Note: Brave search failed. Please try again.]"
