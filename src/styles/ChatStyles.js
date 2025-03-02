export const chatStyles = {
  chatContainer: {
    height: '400px',
    overflowY: 'auto',
    backgroundColor: '#1a1a1a',
    padding: '10px',
    borderRadius: '8px',
  },
  messageContainer: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 12px',
    marginBottom: '6px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    maxWidth: '100%',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3px',
  },
  username: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: '0.7rem',
    color: '#6b7280',
  },
  messageContent: {
    color: '#ffffff',
    fontSize: '0.9rem',
    wordBreak: 'break-word',
    lineHeight: '1.3',
  }
};