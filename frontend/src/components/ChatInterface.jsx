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
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Only auto-scroll if user is already near the bottom
  // This prevents interrupting reading when new content arrives
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    // Auto-scroll only if user is already at/near bottom
    if (isNearBottom) {
      scrollToBottom();
    }
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
          <h1>Welcome to LLM Council <span className="plus-text">Plus</span></h1>
          <p>Create a new conversation to get started</p>
          <div className="app-footer">
            <span>Version: 1.0.0</span>
            <span className="footer-separator">•</span>
            <span>Created by: Jacob Ben-David</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {/* Messages Area */}
      <div className="messages-area" ref={messagesContainerRef}>
        {(!conversation || conversation.messages.length === 0) ? (
          <div className="hero-container">
            <div className="hero-content">
              <h1>Welcome to LLM Council <span className="text-gradient">Plus</span></h1>
              <p className="hero-subtitle">
                Create a new conversation to get started
              </p>
            </div>
            <div className="hero-footer">
              <span>Version: 1.0.0</span>
              <span className="footer-separator">•</span>
              <span>Created by: Jacob Ben-David</span>
            </div>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-role">
                {msg.role === 'user' ? 'You' : 'LLM Council'}
              </div>
              
              <div className="message-content">
                {msg.role === 'user' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    {/* Search Loading */}
                    {msg.loading?.search && (
                      <div className="stage-loading">
                        <div className="spinner"></div>
                        <span>Searching the web...</span>
                      </div>
                    )}

                    {/* Search Context */}
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
                        <span>Running Stage 1... {msg.progress?.stage1?.count}/{msg.progress?.stage1?.total}</span>
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
                        <span>Running Stage 2...</span>
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
                        <span>Final Synthesis...</span>
                      </div>
                    )}
                    {msg.stage3 && (
                      <Stage3
                        finalResponse={msg.stage3}
                        startTime={msg.timers?.stage3Start}
                        endTime={msg.timers?.stage3End}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Bottom Spacer for floating input */}
        <div ref={messagesEndRef} style={{ height: '20px' }} />
      </div>

      {/* Floating Command Capsule */}
      <div className="input-area">
        <form className="input-container" onSubmit={handleSubmit}>
          <label className={`search-toggle ${webSearch ? 'active' : ''}`} title="Toggle Web Search">
            <input 
              type="checkbox" 
              className="search-checkbox"
              checked={webSearch}
              onChange={() => setWebSearch(!webSearch)}
              disabled={isLoading}
            />
            <span className="search-icon">🌐</span>
            {webSearch && <span className="search-label">Search On</span>}
          </label>
          
          <textarea
            className="message-input"
            placeholder={isLoading ? "Consulting..." : "Ask the Council..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            style={{ height: 'auto', minHeight: '24px' }}
          />
          
          {isLoading ? (
            <button type="button" className="send-button stop-button" onClick={onAbort} title="Stop Generation">
              ⏹
            </button>
          ) : (
            <button type="submit" className="send-button" disabled={!input.trim()}>
              ➤
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
