import StageTimer from './StageTimer';
// ... imports
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import SearchContext from './SearchContext';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  onAbort,
  isLoading,
}) {
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input, webSearch);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Welcome to LLM Council <span className="plus-text">Plus</span></h2>
          <p>Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>Start a conversation</h2>
            <p>Ask a question to consult the LLM Council</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">LLM Council</div>

                  {/* Search Loading */}
                  {msg.loading?.search && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Searching the web...</span>
                      <button className="abort-btn-inline" onClick={onAbort}>Stop</button>
                    </div>
                  )}

                  {/* Search Context (if web search was used) */}
                  {msg.metadata?.search_context && (
                    <SearchContext
                      searchQuery={msg.metadata?.search_query}
                      searchContext={msg.metadata?.search_context}
                    />
                  )}

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>
                        Running Stage 1: Collecting individual responses...
                        {msg.progress?.stage1?.total > 0 && (
                          <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                            ({msg.progress.stage1.count}/{msg.progress.stage1.total})
                          </span>
                        )}
                        <StageTimer startTime={msg.timers?.stage1Start} />
                      </span>
                      <button className="abort-btn-inline" onClick={onAbort}>Stop</button>
                    </div>
                  )}
                  {msg.stage1 && (
                    <Stage1
                      responses={msg.stage1}
                      startTime={msg.timers?.stage1Start}
                      endTime={msg.timers?.stage1End}
                    />
                  )}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>
                        Running Stage 2: Peer rankings...
                        {msg.progress?.stage2?.total > 0 && (
                          <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                            ({msg.progress.stage2.count}/{msg.progress.stage2.total})
                          </span>
                        )}
                        <StageTimer startTime={msg.timers?.stage2Start} />
                      </span>
                      <button className="abort-btn-inline" onClick={onAbort}>Stop</button>
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                      startTime={msg.timers?.stage2Start}
                      endTime={msg.timers?.stage2End}
                    />
                  )}

                  {/* Stage 3 */}
                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>
                        Running Stage 3: Final synthesis...
                        <StageTimer startTime={msg.timers?.stage3Start} />
                      </span>
                      <button className="abort-btn-inline" onClick={onAbort}>Stop</button>
                    </div>
                  )}
                  {msg.stage3 && (
                    <Stage3
                      finalResponse={msg.stage3}
                      startTime={msg.timers?.stage3Start}
                      endTime={msg.timers?.stage3End}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the council...</span>
            <button className="abort-btn" onClick={onAbort}>
              Stop
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {conversation.messages.length === 0 && (
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="input-row">
            <textarea
              className="message-input"
              placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
            />
            <div className="input-actions">
              <button
                type="button"
                className={`web-search-button ${webSearch ? 'active' : ''}`}
                onClick={() => setWebSearch(!webSearch)}
                disabled={isLoading}
                title="Toggle Web Search"
              >
                <span className="search-icon">🌐</span>
                {webSearch ? 'Search ON' : 'Search OFF'}
              </button>
              <button
                type="submit"
                className="send-button"
                disabled={!input.trim() || isLoading}
              >
                Send
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
