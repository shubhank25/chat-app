import React from 'react';

interface User {
  id: string;
  username: string;
  avatar: string;
}

interface CallNotificationProps {
  caller: User;
  onAccept: () => void;
  onReject: () => void;
}

const CallNotification: React.FC<CallNotificationProps> = ({ caller, onAccept, onReject }) => {
  return (
    <div className="call-notification">
      <div className="call-notification-content">
        <div className="caller-info">
          <img src={caller.avatar} alt={caller.username} className="caller-avatar" />
          <div className="caller-details">
            <h3>📞 Incoming Call</h3>
            <p>{caller.username} is calling you</p>
          </div>
        </div>
        <div className="call-actions">
          <button className="accept-call-btn" onClick={onAccept}>
            📞 Accept
          </button>
          <button className="reject-call-btn" onClick={onReject}>
            ❌ Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;