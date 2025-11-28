/**
 * API client for the LLM Council backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      { method: 'DELETE' }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content, webSearch = false) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, web_search: webSearch }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Get application settings.
   */
  async getSettings() {
    const response = await fetch(`${API_BASE}/api/settings`);
    if (!response.ok) {
      throw new Error('Failed to get settings');
    }
    return response.json();
  },

  /**
   * Test Tavily API key.
   */
  async testTavilyKey(apiKey) {
    const response = await fetch(`${API_BASE}/api/settings/test-tavily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) {
      throw new Error('Failed to test API key');
    }
    return response.json();
  },

  /**
   * Test OpenRouter API key.
   */
  async testOpenRouterKey(apiKey) {
    const response = await fetch(`${API_BASE}/api/settings/test-openrouter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) {
      throw new Error('Failed to test API key');
    }
    return response.json();
  },

  /**
   * Test Brave API key.
   */
  async testBraveKey(apiKey) {
    const response = await fetch(`${API_BASE}/api/settings/test-brave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) {
      throw new Error('Failed to test API key');
    }
    return response.json();
  },

  /**
   * Test a specific provider's API key.
   */
  async testProviderKey(providerId, apiKey) {
    const response = await fetch(`${API_BASE}/api/settings/test-provider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider_id: providerId, api_key: apiKey }),
    });
    if (!response.ok) {
      throw new Error('Failed to test API key');
    }
    return response.json();
  },

  /**
   * Test Ollama connection.
   */
  async testOllamaConnection(baseUrl) {
    const response = await fetch(`${API_BASE}/api/settings/test-ollama`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base_url: baseUrl }),
    });
    if (!response.ok) {
      throw new Error('Failed to test Ollama connection');
    }
    return response.json();
  },

  /**
   * Get available models from OpenRouter.
   */
  async getModels() {
    const response = await fetch(`${API_BASE}/api/models`);
    if (!response.ok) {
      throw new Error('Failed to get models');
    }
    return response.json();
  },

  /**
   * Get available models from Ollama.
   */
  async getOllamaModels(baseUrl) {
    let url = `${API_BASE}/api/ollama/tags`;
    if (baseUrl) {
      url += `?base_url=${encodeURIComponent(baseUrl)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get Ollama models');
    }
    return response.json();
  },

  /**
   * Get available models from direct providers.
   */
  async getDirectModels() {
    const response = await fetch(`${API_BASE}/api/models/direct`);
    if (!response.ok) {
      throw new Error('Failed to get direct models');
    }
    return response.json();
  },

  /**
   * Get default model settings.
   */
  async getDefaultSettings() {
    const response = await fetch(`${API_BASE}/api/settings/defaults`);
    if (!response.ok) {
      throw new Error('Failed to get default settings');
    }
    return response.json();
  },

  /**
   * Update application settings.
   */
  async updateSettings(settings) {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {boolean} webSearch - Whether to use web search
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @param {AbortSignal} signal - Optional AbortSignal to cancel the request
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, webSearch, onEvent, signal) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, web_search: webSearch }),
        signal,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data);
              onEvent(event.type, event);
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
