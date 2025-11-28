import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

import StageTimer from './StageTimer';

export default function Stage1({ responses, startTime, endTime }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!responses || responses.length === 0) {
    return null;
  }

  const currentResponse = responses[activeTab];
  const hasError = currentResponse?.error;

  const gridColumns = Math.min(responses.length, 4);

  return (
    <div className="stage stage1">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="stage-title" style={{ margin: 0 }}>Stage 1: Individual Responses</h3>
        <StageTimer startTime={startTime} endTime={endTime} label="Duration" />
      </div>

      <div
        className="tabs"
        style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
      >
        {responses.map((resp, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''} ${resp.error ? 'tab-error' : ''} `}
            onClick={() => setActiveTab(index)}
            title={resp.error ? resp.error_message : ''}
          >
            {resp.error && <span className="error-indicator">!</span>}
            {resp.model.split('/')[1] || resp.model}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="model-name">
          {currentResponse.model}
          {hasError && <span className="model-status error">Failed</span>}
          {!hasError && <span className="model-status success">Success</span>}
        </div>
        {hasError ? (
          <div className="response-error">
            <div className="error-icon">!</div>
            <div className="error-details">
              <div className="error-title">Model Failed to Respond</div>
              <div className="error-message">{currentResponse.error_message}</div>
            </div>
          </div>
        ) : (
          <div className="response-text markdown-content">
            <ReactMarkdown>{currentResponse.response}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
