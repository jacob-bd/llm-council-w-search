import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDeleteClick = (e, convId) => {
    e.stopPropagation();
    setDeleteConfirmId(convId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council <span className="plus-text">Plus</span></h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''
                }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conv.title || 'New Conversation'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} messages
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteClick(e, conv.id)}
                title="Delete conversation"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          Settings
        </button>
      </div>

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Conversation?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={cancelDelete}>Cancel</button>
              <button className="modal-btn delete" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
