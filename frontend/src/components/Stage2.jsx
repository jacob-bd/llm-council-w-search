import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getModelVisuals, getShortModelName } from '../utils/modelHelpers';
import './Stage2.css';
import StageTimer from './StageTimer';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = getShortModelName(model);
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings, startTime, endTime }) {
  const [activeTab, setActiveTab] = useState(0);

  // Reset activeTab if it becomes out of bounds (e.g., during streaming)
  useEffect(() => {
    if (rankings && rankings.length > 0 && activeTab >= rankings.length) {
      setActiveTab(rankings.length - 1);
    }
  }, [rankings, activeTab]);

  if (!rankings || rankings.length === 0) {
    return null;
  }

  // Ensure activeTab is within bounds
  const safeActiveTab = Math.min(activeTab, rankings.length - 1);
  const currentRanking = rankings[safeActiveTab] || {};
  const hasError = currentRanking?.error || false;

  // Get visuals for current tab
  const currentVisuals = getModelVisuals(currentRanking?.model);

  return (
    <div className="stage-container stage-2">
      <div className="stage-header">
        <div className="stage-title">
          <span className="stage-icon">⚖️</span>
          Stage 2: Peer Rankings
        </div>
        <StageTimer startTime={startTime} endTime={endTime} label="Duration" />
      </div>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        Below, model names are shown in <strong>bold</strong> for readability, but the original evaluation used anonymous labels.
      </p>

      {/* Avatar Tabs */}
      <div className="tabs">
        {rankings.map((rank, index) => {
          const visuals = getModelVisuals(rank?.model);
          const shortName = getShortModelName(rank?.model);

          return (
            <button
              key={index}
              className={`tab ${safeActiveTab === index ? 'active' : ''} ${rank?.error ? 'tab-error' : ''}`}
              onClick={() => setActiveTab(index)}
              style={safeActiveTab === index ? { borderColor: visuals.color, color: visuals.color } : {}}
              title={rank?.model}
            >
              <span className="tab-icon" style={{ backgroundColor: safeActiveTab === index ? 'transparent' : 'rgba(255,255,255,0.1)' }}>
                {visuals.icon}
              </span>
              <span className="tab-name">{shortName}</span>
              {rank?.error && <span className="error-badge">!</span>}
            </button>
          );
        })}
      </div>

      <div className="tab-content glass-panel">
        <div className="model-header">
          <div className="model-identity">
            <span className="model-avatar" style={{ backgroundColor: hasError ? '#ef4444' : currentVisuals.color }}>
              {currentVisuals.icon}
            </span>
            <div className="model-info">
              <span className="model-name-large">{currentRanking.model || 'Unknown Model'}</span>
              <span className="model-provider-badge" style={{ borderColor: currentVisuals.color, color: currentVisuals.color }}>
                {currentVisuals.name}
              </span>
            </div>
          </div>
          
          {hasError ? (
            <span className="model-status error">Failed</span>
          ) : (
            <span className="model-status success">Completed</span>
          )}
        </div>

        {hasError ? (
          <div className="response-error">
            <div className="error-icon">⚠️</div>
            <div className="error-details">
              <div className="error-title">Model Failed to Respond</div>
              <div className="error-message">{currentRanking?.error_message || 'Unknown error'}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="ranking-content markdown-content">
              <ReactMarkdown>
                {(() => {
                  const ranking = currentRanking?.ranking;
                  const rankingText = typeof ranking === 'string' ? ranking : String(ranking || '');
                  return deAnonymizeText(rankingText, labelToModel);
                })()}
              </ReactMarkdown>
            </div>

            {currentRanking?.parsed_ranking &&
              currentRanking.parsed_ranking.length > 0 && (
                <div className="parsed-ranking">
                  <strong>Extracted Ranking:</strong>
                  <ol>
                    {currentRanking.parsed_ranking.map((label, i) => (
                      <li key={i}>
                        {labelToModel && labelToModel[label]
                          ? getShortModelName(labelToModel[label])
                          : label}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
          </>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>🏆 Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => {
              const visuals = getModelVisuals(agg.model);
              const shortName = getShortModelName(agg.model);

              return (
                <div key={index} className="aggregate-item">
                  <span className="rank-position">#{index + 1}</span>
                  <div className="rank-model-info">
                    <span className="mini-avatar" style={{ backgroundColor: visuals.color }}>
                      {visuals.icon}
                    </span>
                    <span className="rank-model-name">{shortName}</span>
                  </div>
                  <span className="rank-score">
                    Avg: {agg.average_rank.toFixed(2)}
                  </span>
                  <span className="rank-count">
                    ({agg.rankings_count} votes)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
