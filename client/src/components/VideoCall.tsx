import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  avatar: string;
}

interface VideoCallProps {
  socket: Socket;
  user: User;
  isInCall: boolean;
  onEndCall: () => void;
  remoteUser?: User | null;
  incomingCall?: any;
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, user, isInCall, onEndCall, remoteUser, incomingCall }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');

  useEffect(() => {
    if (!isInCall || !socket) return;

    startCall();

    return () => {
      endCall();
    };
  }, [isInCall]);

  const startCall = async () => {
    try {
      console.log('Starting video call...');
      
      // Get user media first - simplified constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('Got media stream:', stream);
      localStreamRef.current = stream;

      // Display local video immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
        console.log('Local video playing');
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        peerConnection.addTrack(track, stream);
      });

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        setConnectionState(peerConnection.connectionState);
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(e => console.error('Error playing remote video:', e));
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', {
            to: remoteUser?.id,
            candidate: event.candidate
          });
        }
      };

      // Set up socket listeners
      socket.on('call-made', handleCallMade);
      socket.on('answer-made', handleAnswerMade);
      socket.on('ice-candidate', handleIceCandidate);

      // Create offer if this is the caller, or wait for offer if receiver
      if (incomingCall) {
        console.log('Receiver: waiting for offer from caller');
        // Receiver - will handle offer in handleCallMade
      } else if (remoteUser) {
        console.log('Caller: creating offer');
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('call-user', {
          offer,
          to: remoteUser.id,
          from: user
        });
      }

    } catch (error: any) {
      console.error('Error starting call:', error);
      console.error('Error details:', error.name, error.message);
      
      let errorMessage = 'Could not access camera/microphone. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera/microphone is being used by another application.';
      } else {
        errorMessage += 'Error: ' + error.message;
      }
      
      alert(errorMessage);
      onEndCall();
    }
  };

  const handleCallMade = async (data: any) => {
    try {
      console.log('Handling incoming call offer');
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection || !data.offer) return;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socket.emit('make-answer', {
        answer,
        to: data.socket
      });
      
      console.log('Sent answer');
    } catch (error) {
      console.error('Error handling call offer:', error);
    }
  };

  const handleAnswerMade = async (data: any) => {
    try {
      console.log('Handling call answer');
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection || !data.answer) return;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('Set remote description from answer');
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: any) => {
    try {
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection || !candidate) return;

      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled:', videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled:', audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    console.log('Ending call');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove socket listeners
    if (socket) {
      socket.off('call-made', handleCallMade);
      socket.off('answer-made', handleAnswerMade);
      socket.off('ice-candidate', handleIceCandidate);
    }

    // Notify remote user
    if (remoteUser && socket) {
      socket.emit('end-call', { to: remoteUser.id });
    }

    onEndCall();
  };

  if (!isInCall) return null;

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        <div className="video-grid">
          <div className="video-item remote">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                backgroundColor: '#2c3e50'
              }}
            />
            <div className="video-label">
              {remoteUser?.username || 'Remote User'} ({connectionState})
            </div>
          </div>
          <div className="video-item local">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                backgroundColor: '#34495e'
              }}
            />
            <div className="video-label">You</div>
          </div>
        </div>
        
        <div className="call-controls">
          <button 
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>
          
          <button 
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>
          
          <button 
            className="control-btn end-call" 
            onClick={endCall}
            title="End call"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;