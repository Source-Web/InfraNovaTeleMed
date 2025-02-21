import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import { PiPhoneDisconnectLight,PiScreencastLight,PiVideoCameraSlashLight,PiVideoCameraLight,PiMicrophoneSlash,PiMicrophoneLight,PiScreencastFill } from "react-icons/pi";
import { IoIosSend } from "react-icons/io";
import { PiChats } from "react-icons/pi";
import { useNavigate } from 'react-router-dom'
import FifteenPopup from './components/FifteenPopup';


const socket = io('http://localhost:3001');

function App() {
  const [timeLeft, setTimeLeft] = useState(30 * 60); // Start with 30 minutes
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time
  const [showPopup, setShowPopup] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [remoteUsername, setRemoteUsername] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    // If time left is 0, stop the countdown
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
      setElapsedTime(prevElapsed => prevElapsed + 1);
      
      // Show popup after 15 seconds (when elapsedTime reaches 30)
    //  if (elapsedTime === 899) { // Use 899 because setState is async
    if (elapsedTime === 20) {
        setShowPopup(true);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, elapsedTime]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndMeeting = () => {
    setShowPopup(false);
    // Add your end meeting logic here
  };

  const handleProceed = () => {
    setShowPopup(false);
    // Meeting continues...
  };




  useEffect(() => {
    socket.on('receive-message', (data) => {
      setMessages(prev => [...prev, {
        text: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        isRemote: true
      }]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, []);


  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      roomId,
      message: newMessage,
      sender: username
    };

    socket.emit('send-message', messageData);

    setMessages(prev => [...prev, {
      text: newMessage,
      sender: username,
      timestamp: new Date().toISOString(),
      isRemote: false
    }]);

    setNewMessage('');
  };



  // Ensure cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  const [pendingCandidates, setPendingCandidates] = useState([]);

  useEffect(() => {
    const handleUserJoined = (data) => {
      console.log('User joined:', data.username);
      setRemoteUsername(data.username);
    };

    const handleOffer = async (data) => {
      try {
        console.log('Received offer');
        if (!peerConnection.current) {
          await createPeerConnection();
        }

        const remoteDesc = new RTCSessionDescription(data.offer);
        await peerConnection.current.setRemoteDescription(remoteDesc);

        while (pendingCandidates.length > 0) {
          const candidate = pendingCandidates.shift();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.emit('answer', {
          roomId,
          answer,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async (data) => {
      try {
        console.log('Received answer');
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));

          while (pendingCandidates.length > 0) {
            const candidate = pendingCandidates.shift();
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    const handleIceCandidate = async (data) => {
      try {
        const candidate = new RTCIceCandidate(data.candidate);
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(candidate);
        } else {
          pendingCandidates.push(data.candidate);
        }
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    };

    const handleUserLeft = (data) => {
      console.log('User left:', data.username);
      setRemoteUsername('');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-left');
    };
  }, [roomId, pendingCandidates]);

  const createPeerConnection = async () => {
    try {
      peerConnection.current = new RTCPeerConnection(servers);

      peerConnection.current.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.current.connectionState);
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.current.iceConnectionState);
      };

      peerConnection.current.onsignalingstatechange = () => {
        console.log('Signaling state:', peerConnection.current.signalingState);
      };

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            roomId,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.current.ontrack = (event) => {
        console.log('Received remote track');
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, localStream.current);
        });
      } else {
        throw new Error('No local stream when creating peer connection');
      }

      console.log('Peer connection created successfully');
    } catch (err) {
      console.error('Error creating peer connection:', err);
      throw err;
    }
  };

  const createAndSendOffer = async () => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socket.emit('offer', {
        roomId,
        offer,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const createRoom = async () => {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    setIsLoading(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support media devices');
      }

      setInCall(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!localVideoRef.current) {
        throw new Error('Video element not mounted yet');
      }

      localVideoRef.current.srcObject = localStream.current;

      const newRoomId = Math.random().toString(36).substring(7);
      setRoomId(newRoomId);

      await createPeerConnection();
      socket.emit('create-room', { roomId: newRoomId, username });
    } catch (err) {
      console.error('Error creating room:', err);
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      setInCall(false);
      alert('Failed to access camera/microphone. Please ensure you have given permission and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    setIsLoading(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support media devices');
      }

      setInCall(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!localVideoRef.current) {
        throw new Error('Video element not mounted yet');
      }

      localVideoRef.current.srcObject = localStream.current;

      await createPeerConnection();

      socket.emit('join-room', { roomId, username });

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socket.emit('offer', {
        roomId,
        offer,
      });
    } catch (err) {
      console.error('Error joining room:', err);
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      setInCall(false);
      alert('Failed to join room. Please ensure you have given camera/microphone permission and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const leaveCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }


    if (peerConnection.current) {
      peerConnection.current.close();
    }
    localVideoRef.current.srcObject = null;
    remoteVideoRef.current.srcObject = null;
    setInCall(false);
    setRoomId('');
    setIsScreenSharing(false);
    setMessages([]);
    setNewMessage('');
    setIsChatOpen(false);
    socket.emit('leave-room', roomId);
  };

  // 
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Get screen sharing stream
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Replace video track
        const videoTrack = screenStream.getVideoTracks()[0];

        const senders = peerConnection.current.getSenders();
        const sender = senders.find(s => s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        // Show screen share in local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Listen for screen share stop
        videoTrack.onended = async () => {
          // Get back camera video track
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          const cameraTrack = cameraStream.getVideoTracks()[0];

          const senders = peerConnection.current.getSenders();
          const sender = senders.find(s => s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraTrack);
          }

          // Show camera in local video
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = cameraStream;
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } else {
        // Stop screen sharing
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());

        // Get back camera video track
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        const cameraTrack = cameraStream.getVideoTracks()[0];

        const senders = peerConnection.current.getSenders();
        const sender = senders.find(s => s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }

        // Show camera in local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      setIsScreenSharing(false);
    }
  };





  if (!inCall) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">Video Chat</h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your username"
              className="w-full p-2 border rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button
              onClick={createRoom}
              disabled={isLoading || !username.trim()}
              className={`w-full ${isLoading || !username.trim() ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                } text-white p-2 rounded`}
            >
              {isLoading ? 'Creating Room...' : 'Create New Room'}
            </button>
            <div className="text-center">or</div>
            <input
              type="text"
              placeholder="Enter Room ID"
              className="w-full p-2 border rounded"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              onClick={joinRoom}
              disabled={isLoading || !roomId.trim() || !username.trim()}
              className={`w-full ${isLoading || !roomId.trim() || !username.trim() ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                } text-white p-2 rounded`}
            >
              {isLoading ? 'Joining Room...' : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        {/* Video Section */}
        <div className="flex-grow md:w-2/3 lg:w-3/4">
          <div className="bg-white rounded-lg shadow-md p-4">
          <div className={`${remoteUsername ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''} mb-4`}>
              <div className={`relative ${!remoteUsername ? 'w-full h-[500px]' : ''}`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full rounded-lg bg-black object-cover ${!remoteUsername ? 'h-[500px]' : 'h-64'}`}
                />
                <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                  You ({username})
                </span>
              </div>
              {remoteUsername && (
                <div className="relative">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 rounded-lg bg-black object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    {remoteUsername}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center space-x-4 mb-4">
              <div className='flex gap-x-9'>
            <button
                 onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-4 rounded-md ${isMuted ? 'bg-white border' : 'bg-white border'} text-white`}
              >
                {isMuted ? <PiChats color='gray' size={23}/> : <PiChats color='gray' size={23}/>}
              </button>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-md ${isMuted ? 'bg-white border' : 'bg-white border'} text-white`}
              >
                {isMuted ? <PiMicrophoneSlash color='gray' size={23} /> : <PiMicrophoneLight color='gray' size={23}/>}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-md ${isVideoOff ? 'bg-white border' : 'bg-white border'} text-white`}
              >
                {isVideoOff ? <PiVideoCameraSlashLight color='gray' size={23}  /> : <PiVideoCameraLight color='gray' size={23} />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-md ${isScreenSharing ? 'bg-white border' : 'bg-white border'} text-white`}
              >
                {isScreenSharing ? <PiScreencastFill color='gray' size={23}/> : <PiScreencastLight color='gray' size={23} />}
              </button>
              <button
                onClick={leaveCall}
                className="px-9 py-1 rounded-md bg-red-500 text-white flex gap-x-2 items-center"
              >
                <PiPhoneDisconnectLight size={23}/>
                Leave Call
              </button>
              </div>



              <div className='text-xl pr-9'>{formatTime(timeLeft)}</div>
            </div>

            <div className="mt-4 p-2 bg-gray-100 rounded text-center">
              Room ID: {roomId}
            </div>
          </div>
        </div>

        {/* Chat Section */}
        {/* <div className="md:w-1/3 lg:w-1/4"> */}
        {/* <div className="md:w-[400px]"> */}
        <div className={` ${isChatOpen ? 'md:w-[400px]' : 'md:w-[0px]'}`}>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="w-full px-4 py-2 bg-[#1D1650] text-white "
            >
              {isChatOpen ? 'Hide Chat' : 'Show Chat'}
            </button>

            {isChatOpen && (
              <>
                {/* Messages Container */}
                <div className="h-64 overflow-y-auto p-4 space-y-2">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${msg.isRemote ? 'items-start' : 'items-end'
                        }`}
                    >
                      <div
                        className={`max-w-[400px] px-4 py-2 rounded-lg ${msg.isRemote
                            ? 'bg-gray-100'
                            : 'bg-[#1D1650] text-white'
                          }`}
                      >
                        <div className="font-semibold text-sm">
                          {msg.sender}
                        </div>
                        <div>{msg.text}</div>
                        <div className="text-xs opacity-75">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="border-t p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Send a message..."
                      className="flex-1 px-4 py-2 border rounded focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-white rounded"
                    >
                    <IoIosSend color='#6B5DD3' size={25}/>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      {showPopup && (
        <FifteenPopup 
          onEndMeeting={() => {
            leaveCall();
            setShowPopup(false);
          }}
          onProceed={handleProceed}
        />
      )}
    </div>
  );
}

export default App;





