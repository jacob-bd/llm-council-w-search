"""Settings storage and management."""

import json
import os
from pathlib import Path
from typing import Optional, List
from pydantic import BaseModel
from .search import SearchProvider

# Settings file path
SETTINGS_FILE = Path(__file__).parent.parent / "data" / "settings.json"

# Default models
DEFAULT_COUNCIL_MODELS = [
    "openai/gpt-4.1",
    "google/gemini-2.5-pro",
    "anthropic/claude-sonnet-4",
    "x-ai/grok-3",
]
DEFAULT_CHAIRMAN_MODEL = "google/gemini-2.5-pro"
DEFAULT_SEARCH_QUERY_MODEL = "google/gemini-2.5-flash"
DEFAULT_SEARCH_QUERY_MODEL = "google/gemini-2.5-flash"


# Available models for selection (popular OpenRouter models)
AVAILABLE_MODELS = [
    # OpenAI
    {"id": "openai/gpt-4.1", "name": "GPT-4.1", "provider": "OpenAI"},
    {"id": "openai/gpt-4.1-mini", "name": "GPT-4.1 Mini", "provider": "OpenAI"},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
    {"id": "openai/o3", "name": "o3", "provider": "OpenAI"},
    {"id": "openai/o3-mini", "name": "o3 Mini", "provider": "OpenAI"},
    # Google
    {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "provider": "Google"},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "Google"},
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash", "provider": "Google"},
    # Anthropic
    {"id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4", "provider": "Anthropic"},
    {"id": "anthropic/claude-opus-4", "name": "Claude Opus 4", "provider": "Anthropic"},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku", "provider": "Anthropic"},
    # xAI
    {"id": "x-ai/grok-3", "name": "Grok 3", "provider": "xAI"},
    {"id": "x-ai/grok-3-mini", "name": "Grok 3 Mini", "provider": "xAI"},
    # Meta
    {"id": "meta-llama/llama-4-maverick", "name": "Llama 4 Maverick", "provider": "Meta"},
    {"id": "meta-llama/llama-4-scout", "name": "Llama 4 Scout", "provider": "Meta"},
    # DeepSeek
    {"id": "deepseek/deepseek-r1", "name": "DeepSeek R1", "provider": "DeepSeek"},
    {"id": "deepseek/deepseek-chat", "name": "DeepSeek Chat", "provider": "DeepSeek"},
    # Mistral
    {"id": "mistralai/mistral-large-2411", "name": "Mistral Large", "provider": "Mistral"},
    {"id": "mistralai/mistral-medium-3", "name": "Mistral Medium", "provider": "Mistral"},
]


from enum import Enum

from .prompts import (
    STAGE1_PROMPT_DEFAULT,
    STAGE2_PROMPT_DEFAULT,
    STAGE3_PROMPT_DEFAULT,
    SEARCH_QUERY_PROMPT_DEFAULT
)

class LLMProvider(str, Enum):
    OPENROUTER = "openrouter"
    OLLAMA = "ollama"
    DIRECT = "direct"
    HYBRID = "hybrid"

class Settings(BaseModel):
    """Application settings."""
    search_provider: SearchProvider = SearchProvider.DUCKDUCKGO
    
    # LLM Provider settings
    llm_provider: LLMProvider = LLMProvider.OPENROUTER
    
    # API Keys
    tavily_api_key: Optional[str] = None
    brave_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    
    # OpenRouter Models
    council_models: List[str] = DEFAULT_COUNCIL_MODELS.copy()
    chairman_model: str = DEFAULT_CHAIRMAN_MODEL
    
    # Ollama Settings
    ollama_base_url: str = "http://localhost:11434"
    ollama_council_models: List[str] = []
    ollama_chairman_model: str = ""

    # Direct Provider Settings
    direct_council_models: List[str] = []
    direct_chairman_model: str = ""

    # Hybrid Settings
    hybrid_council_models: List[str] = []
    hybrid_chairman_model: str = ""
    
    # Utility Models (for search query generation and titles)
    search_query_model: str = DEFAULT_SEARCH_QUERY_MODEL
    search_query_model: str = DEFAULT_SEARCH_QUERY_MODEL
    
    full_content_results: int = 3  # Number of search results to fetch full content for (0 to disable)

    # System Prompts
    stage1_prompt: str = STAGE1_PROMPT_DEFAULT
    stage2_prompt: str = STAGE2_PROMPT_DEFAULT
    stage3_prompt: str = STAGE3_PROMPT_DEFAULT

    search_query_prompt: str = SEARCH_QUERY_PROMPT_DEFAULT

    class Config:
        use_enum_values = True


def get_settings() -> Settings:
    """Load settings from file, or return defaults."""
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                return Settings(**data)
        except Exception:
            pass
    return Settings()


def save_settings(settings: Settings) -> None:
    """Save settings to file."""
    # Ensure data directory exists
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings.model_dump(), f, indent=2)


def update_settings(**kwargs) -> Settings:
    """Update specific settings and save."""
    current = get_settings()
    updated_data = current.model_dump()
    updated_data.update(kwargs)
    updated = Settings(**updated_data)
    save_settings(updated)
    return updated
