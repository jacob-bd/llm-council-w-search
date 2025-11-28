import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Settings from './components/Settings';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({
    connected: false,
    lastConnected: null,
    testing: false
  });
  const abortControllerRef = useRef(null);

  // Auto-test Ollama connection on mount
  useEffect(() => {
    testOllamaConnection();
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const testOllamaConnection = async () => {
    try {
      setOllamaStatus(prev => ({ ...prev, testing: true }));
      // Get current settings to grab Ollama base URL
      const settings = await api.getSettings();

      if (!settings.ollama_base_url) {
        setOllamaStatus({ connected: false, lastConnected: null, testing: false });
        return;
      }

      const result = await api.testOllamaConnection(settings.ollama_base_url);

      if (result.success) {
        setOllamaStatus({
          connected: true,
          lastConnected: new Date().toLocaleString(),
          testing: false
        });
      } else {
        setOllamaStatus({ connected: false, lastConnected: null, testing: false });
      }
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      setOllamaStatus({ connected: false, lastConnected: null, testing: false });
    }
  };

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await api.deleteConversation(id);
      // Remove from local state
      setConversations(conversations.filter(c => c.id !== id));
      // If we deleted the current conversation, clear it
      if (id === currentConversationId) {
        setCurrentConversationId(null);
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content, webSearch) => {
    if (!currentConversationId) return;

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          search: false,
          stage1: false,
          stage2: false,
          stage3: false,
        },
        timers: {
          stage1Start: null,
          stage1End: null,
          stage2Start: null,
          stage2End: null,
          stage3Start: null,
          stage3End: null,
        },
        progress: {
          stage1: { count: 0, total: 0, currentModel: null },
          stage2: { count: 0, total: 0, currentModel: null }
        }
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, webSearch, (eventType, event) => {
        switch (eventType) {
          case 'search_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.search = true;
              return { ...prev, messages };
            });
            break;

          case 'search_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.search = false;
              // Set metadata with search results immediately
              lastMsg.metadata = {
                ...lastMsg.metadata,
                search_query: event.data.search_query,
                search_context: event.data.search_context,
              };
              return { ...prev, messages };
            });
            break;

          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              lastMsg.timers.stage1Start = Date.now();
              return { ...prev, messages };
            });
            break;

          case 'stage1_init':
            console.log('DEBUG: Received stage1_init', event);
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.progress.stage1 = {
                count: 0,
                total: event.total,
                currentModel: null
              };
              return { ...prev, messages };
            });
            break;

          case 'stage1_progress':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];

              // Immutable update for stage1
              const updatedStage1 = lastMsg.stage1 ? [...lastMsg.stage1, event.data] : [event.data];
              const updatedLastMsg = {
                ...lastMsg,
                progress: {
                  ...lastMsg.progress,
                  stage1: {
                    count: event.count,
                    total: event.total,
                    currentModel: event.data.model
                  }
                },
                stage1: updatedStage1
              };

              messages[messages.length - 1] = updatedLastMsg;

              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data;
              lastMsg.loading.stage1 = false;
              lastMsg.timers.stage1End = Date.now();
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              lastMsg.timers.stage2Start = Date.now();
              return { ...prev, messages };
            });
            break;

          case 'stage2_init':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.progress.stage2 = {
                count: 0,
                total: event.total,
                currentModel: null
              };
              return { ...prev, messages };
            });
            break;

          case 'stage2_progress':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];

              // Immutable update for stage2
              const updatedStage2 = lastMsg.stage2 ? [...lastMsg.stage2, event.data] : [event.data];
              const updatedLastMsg = {
                ...lastMsg,
                progress: {
                  ...lastMsg.progress,
                  stage2: {
                    count: event.count,
                    total: event.total,
                    currentModel: event.data.model
                  }
                },
                stage2: updatedStage2
              };

              messages[messages.length - 1] = updatedLastMsg;

              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              // Ensure we have the full final list (though we might have built it incrementally)
              lastMsg.stage2 = event.data;
              lastMsg.loading.stage2 = false;
              lastMsg.timers.stage2End = Date.now();
              lastMsg.metadata = {
                ...lastMsg.metadata,
                ...event.metadata
              };
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              lastMsg.timers.stage3Start = Date.now();
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              lastMsg.timers.stage3End = Date.now();
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      }, abortControllerRef.current?.signal);
    } catch (error) {
      // Don't show error for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    } finally {
      abortControllerRef.current = null;
      // Reload conversations to ensure title/messages are synced, even if aborted
      loadConversations();
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        onAbort={handleAbort}
        isLoading={isLoading}
      />
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          ollamaStatus={ollamaStatus}
          onRefreshOllama={testOllamaConnection}
        />
      )}
    </div>
  );
}

export default App;
