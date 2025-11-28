"""OpenAI provider implementation."""

import httpx
from typing import List, Dict, Any
from .base import LLMProvider
from ..settings import get_settings

class OpenAIProvider(LLMProvider):
    """OpenAI API provider."""
    
    BASE_URL = "https://api.openai.com/v1"
    
    def _get_api_key(self) -> str:
        settings = get_settings()
        return settings.openai_api_key or ""

    async def query(self, model_id: str, messages: List[Dict[str, str]], timeout: float = 120.0) -> Dict[str, Any]:
        api_key = self._get_api_key()
        if not api_key:
            return {"error": True, "error_message": "OpenAI API key not configured"}
            
        # Strip prefix if present
        model = model_id.removeprefix("openai:")
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7
                    }
                )
                
                if response.status_code != 200:
                    return {
                        "error": True, 
                        "error_message": f"OpenAI API error: {response.status_code} - {response.text}"
                    }
                    
                data = response.json()
                content = data["choices"][0]["message"]["content"]
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
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                
                if response.status_code != 200:
                    return []
                    
                data = response.json()
                models = []
                # Filter for chat models
                for model in data.get("data", []):
                    if "gpt" in model["id"] or "o1" in model["id"] or "o3" in model["id"]:
                        models.append({
                            "id": f"openai:{model['id']}",
                            "name": model["id"],
                            "provider": "OpenAI"
                        })
                return sorted(models, key=lambda x: x["name"])
                
        except Exception:
            return []

    async def validate_key(self, api_key: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "API key is valid"}
                else:
                    return {"success": False, "message": "Invalid API key"}
        except Exception as e:
            return {"success": False, "message": str(e)}
