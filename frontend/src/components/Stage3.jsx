import ReactMarkdown from 'react-markdown';
import './Stage3.css';
import StageTimer from './StageTimer';

export default function Stage3({ finalResponse, startTime, endTime }) {
  if (!finalResponse) {
    return null;
  }

  return (
    <div className="stage stage3">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="stage-title" style={{ margin: 0 }}>Stage 3: Final Council Answer</h3>
        <StageTimer startTime={startTime} endTime={endTime} label="Duration" />
      </div>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <div className="final-text markdown-content">
          <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
