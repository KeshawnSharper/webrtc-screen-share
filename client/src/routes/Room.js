import React, { useRef, useEffect  , useState} from "react";
import io from "socket.io-client";
import "./room.css"
import socketIOClient from "socket.io-client";
const ENDPOINT = "http://localhost:8000/";
const Room = (props) => {
    const userVideo = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUser = useRef();
    const userStream = useRef();
    const senders = useRef([]);
    let socket = socketIOClient(ENDPOINT);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
    useEffect(() => {
      socket = io(ENDPOINT);
        navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
            userVideo.current.srcObject = stream;
            userStream.current = stream;

            socketRef.current = io.connect("/");
            socketRef.current.emit("join room", props.match.params.roomID);

            socketRef.current.on('other user', userID => {
                callUser(userID);
                otherUser.current = userID;
            });

            socketRef.current.on("user joined", userID => {
                otherUser.current = userID;
            });

            socketRef.current.on("offer", handleRecieveCall);

            socketRef.current.on("answer", handleAnswer);

            socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
        });

    }, []);
    useEffect(() => {
      socket.on('message', message => {
        setMessages(messages => [ ...messages, message ]);
      });
      
 
  }, []);
  
    const sendMessage = (event, message) => {
      event.preventDefault();
      console.log(message)
      if(message) {
        console.log(message)
        socket.emit('sendMessage', message, () => {
          console.log(message)
          setMessage('')});
      }
    }

    function callUser(userID) {
        peerRef.current = createPeer(userID);
        userStream.current.getTracks().forEach(track => senders.current.push(peerRef.current.addTrack(track, userStream.current)));
    }

    function createPeer(userID) {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        });

        peer.onicecandidate = handleICECandidateEvent;
        peer.ontrack = handleTrackEvent;
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        peerRef.current.createOffer().then(offer => {
            return peerRef.current.setLocalDescription(offer);
        }).then(() => {
            const payload = {
                target: userID,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            };
            socketRef.current.emit("offer", payload);
        }).catch(e => console.log(e));
    }

    function handleRecieveCall(incoming) {
        peerRef.current = createPeer();
        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
        }).then(() => {
            return peerRef.current.createAnswer();
        }).then(answer => {
            return peerRef.current.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            }
            socketRef.current.emit("answer", payload);
        })
    }

    function handleAnswer(message) {
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc).catch(e => console.log(e));
    }

    function handleICECandidateEvent(e) {
        if (e.candidate) {
            const payload = {
                target: otherUser.current,
                candidate: e.candidate,
            }
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {
        const candidate = new RTCIceCandidate(incoming);

        peerRef.current.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function handleTrackEvent(e) {
        partnerVideo.current.srcObject = e.streams[0];
    };

    function shareScreen() {
        navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
            const screenTrack = stream.getTracks()[0];
            senders.current.find(sender => sender.track.kind === 'video').replaceTrack(screenTrack);
            screenTrack.onended = function() {
                senders.current.find(sender => sender.track.kind === "video").replaceTrack(userStream.current.getTracks()[1]);
            }
        })
    }
  //   function sendMessage(message) {
     
   
  //   socket.on("createMessage", (message,person) => {
  //    console.log(message)
  //   })

  // }
  

    return (
        // <div>
            // <video controls style={{height: 500, width: 500}} autoPlay ref={userVideo} />
            // <video controls style={{height: 500, width: 500}} autoPlay ref={partnerVideo} />
        //     <button onClick={shareScreen}>Share screen</button>
        // </div>
        // <div>
        // {/* Hello world */}
        <div>
        <div className="main">
        <div className="main__left">
          <div className="main__videos">
            <div id="video-grid">
                
             <video controls  autoPlay ref={userVideo} />
             <video controls  autoPlay ref={partnerVideo} />
            </div>
          </div>
          <div className="main__controls">
            <div className="main__controls__block">
              <div onclick="muteUnmute()" className="main__controls__button main__mute_button">
                <i className="fas fa-microphone" />
                <span>Mute</span>
              </div>
              <div onclick="playStop()" className="main__controls__button main__video_button">
                <i className="fas fa-video" />
                <span>Stop Video</span>
              </div>
            </div>
            <div className="main__controls__block">
              <div className="main__controls__button">
                <i className="fas fa-shield-alt" />
                <span>Security</span>
              </div>
              <div onClick={shareScreen} className="main__controls__button main__share_button">
                <i className="fas fa-user-friends" />
                <span>Participants</span>
              </div>
              <div onClick={ e =>  sendMessage(e,'Chat')} className="main__controls__button">
                <i className="fas fa-comment-alt" />
                <span>Chat</span>
              </div>
            </div>
            <div className="main__controls__block">
              <div className="main__controls__button">
                <span className="leave_meeting">Leave Meeting</span>
              </div>
            </div>
          </div>
        </div>
        <div className="main__right">
          <div className="main__header" id="chat">
            <h6>Chat</h6>
            <b />
          </div>
          <div className="main__chat_window">
            <ul className="messages">
            </ul>
          </div>
          <div className="main__message_container">
            <input id="chat_message" type="text" placeholder="Type message here..." />
          </div>
        </div>
      </div>
    </div>
    );
};

export default Room;