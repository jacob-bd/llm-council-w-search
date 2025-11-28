"""Anthropic provider implementation."""

import httpx
from typing import List, Dict, Any
from .base import LLMProvider
from ..settings import get_settings

class AnthropicProvider(LLMProvider):
    """Anthropic API provider."""
    
    BASE_URL = "https://api.anthropic.com/v1"
    
    def _get_api_key(self) -> str:
        settings = get_settings()
        return settings.anthropic_api_key or ""

    async def query(self, model_id: str, messages: List[Dict[str, str]], timeout: float = 120.0) -> Dict[str, Any]:
        api_key = self._get_api_key()
        if not api_key:
            return {"error": True, "error_message": "Anthropic API key not configured"}
            
        model = model_id.removeprefix("anthropic:")
        
        # Convert messages to Anthropic format (system message is separate)
        system_message = ""
        filtered_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                filtered_messages.append(msg)
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                payload = {
                    "model": model,
                    "messages": filtered_messages,
                    "max_tokens": 4096,
                    "temperature": 0.7
                }
                if system_message:
                    payload["system"] = system_message
                    
                response = await client.post(
                    f"{self.BASE_URL}/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json=payload
                )
                
                if response.status_code != 200:
                    return {
                        "error": True, 
                        "error_message": f"Anthropic API error: {response.status_code} - {response.text}"
                    }
                    
                data = response.json()
                content = data["content"][0]["text"]
                return {"content": content, "error": False}
                
        except Exception as e:
            return {"error": True, "error_message": str(e)}

    async def get_models(self) -> List[Dict[str, Any]]:
        api_key = self._get_api_key()
        if not api_key:
            return []
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/models",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                )
                
                if response.status_code != 200:
                    # Fallback to hardcoded list if API fails (e.g. older keys or API not enabled)
                    return [
                        {"id": "anthropic:claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "Anthropic"},
                        {"id": "anthropic:claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "Anthropic"},
                        {"id": "anthropic:claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "provider": "Anthropic"},
                        {"id": "anthropic:claude-3-haiku-20240307", "name": "Claude 3 Haiku", "provider": "Anthropic"},
                    ]
                    
                data = response.json()
                models = []
                
                for model in data.get("data", []):
                    if model.get("type") == "model":
                        models.append({
                            "id": f"anthropic:{model['id']}",
                            "name": model.get("display_name", model['id']),
                            "provider": "Anthropic"
                        })
                
                return sorted(models, key=lambda x: x["name"])
                
        except Exception:
            return []

    async def validate_key(self, api_key: str) -> Dict[str, Any]:
        try:
            # Test with a cheap call
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 1
                    }
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "API key is valid"}
                else:
                    return {"success": False, "message": "Invalid API key"}
        except Exception as e:
            return {"success": False, "message": str(e)}
