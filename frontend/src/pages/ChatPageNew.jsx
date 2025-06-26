import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaPaperPlane, FaPaperclip, FaVideo, FaPhone, FaPhoneSlash, FaUsers } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// import TopNavbar from "../components/Navbar";
import { connect, createLocalTracks } from "twilio-video";
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import { Home, Settings, FileText, Menu, LogOut } from "lucide-react";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import "bootstrap/dist/js/bootstrap.bundle.min";
import '../App.css'
import bootstrap from "bootstrap/dist/js/bootstrap.bundle.min.js";
import moment from "moment";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';
import { isAccordionItemSelected } from "react-bootstrap/esm/AccordionContext";
import { isAuthenticated } from "../utils/auth";
import { LocalVideoTrack } from 'twilio-video';


/**
 *  ChatPage component: handles text chat, user search, and file attachments.
 *  All WebRTC/call-related code has been removed.
 */
const ChatPage = () => {
  
  // ---------- Basic state for user + chat ----------
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loggedInUserId, setLoggedInUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState("");

  // ---------- UI: search + user lists + unread counts ----------
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  // ---------- WebSocket + end-of-messages ref ----------
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ---------- Replace with your actual server’s API base ----------
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  // const API_BASE_URL = "http://127.0.0.1:8001/api";
  // const navigate = useNavigate();

  const [videoRoom, setVideoRoom] = useState(null);
  const videoRef = useRef(null);
  const token = localStorage.getItem("token");
  const [incomingCall, setIncomingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const remoteVideoRef = useRef(null);

  const globalSocketRef = useRef(null);  // ✅ Declare the global WebSocket reference
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]); // ✅ Selected users for the group
  // const [connectedUsers, setConnectedUsers] = useState([]);
  // ---------- Basic state for user + chat ----------


  const [showPopover, setShowPopover] = useState(false);
  const [activeChat, setActiveChat] = useState("all"); // "all", "private", "group"
  const [notiSpace, setNotiSpace] = useState(false)


  const [showInviteModal, setShowInviteModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]); // You need this populated from your WebSocket or API


  const handlePrivateChat = () => {
    setNotiSpace(false);
    setActiveChat("private");
  };

  const handleGroupChat = () => {
    setNotiSpace(false);
    setActiveChat("group");
  };

  const handleAllChat = () => {
    setNotiSpace(false);
    setActiveChat("all");
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  };

  const chatPopover = (
    <Popover id="chat-pop">
      <Popover.Body className="d-flex flex-column popover-body-custom">
        <Button className="chat-option-btn" onClick={() => { handlePrivateChat(); setShowPopover(false); }}>Private Chat</Button>
        <Button className="chat-option-btn" onClick={() => { handleGroupChat(); setShowPopover(false); }} >Group Chat</Button>
        <Button className="chat-option-btn" onClick={() => { handleAllChat(); setShowPopover(false); }}>All Chat</Button>

        <Button type="button" className="chat-option-btn" data-bs-toggle="modal" data-bs-target="#exampleModal" >Create Group</Button>
      </Popover.Body>

    </Popover>
  )

  let lastDate = null;

  const handleNotificationBtn = () => {
    setNotiSpace(true)
    setActiveChat('')
    console.log("hello")
  }

  // notification 
  const [notificationlist, setnotificationlist] = useState([])
  // console.log("notilist", notificationlist)

  const scrollToMessage = (id) => {
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optional highlight effect
      element.classList.add("highlight");
      setTimeout(() => {
        element.classList.remove("highlight");
      }, 1500);
    }
  };
  



  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      if (!globalSocketRef.current || globalSocketRef.current.readyState !== WebSocket.OPEN) {
        setupGlobalWebSocket();  // ✅ Ensure the global WebSocket stays connected
      }
    }
    fetchGroups();
  }, [loggedInUserId]);

  async function fetchNotificationMsg() {
    // console.log("aSDBHBDBWHVD GJWAVEFVEWAVFJWf",localStorage.getItem("token"))
    if (!loggedInUserId) {
      console.log("Login user not got yet ")
      return
    }
    const token = localStorage.getItem("token");

    try {
      const resp = await fetch(
        `${API_BASE_URL}/chat/api/notification/${loggedInUserId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.ok) {
        const notificationHistory = await resp.json();
        const groupedNotifications = Object.values(
          notificationHistory.reduce((acc, msg) => {
            acc[msg.sender] = msg;
            return acc;
          }, {})
        );
        setnotificationlist(groupedNotifications);

      } else {
        console.error("Failed to fetch messages:", resp.status);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  }
  useEffect(() => {
    if (loggedInUserId && token) {
      fetchNotificationMsg();
    }
  }, [loggedInUserId, token]);



  async function fetchGroups() {
    const token = localStorage.getItem("token");
    try {
      const resp = await axios.get(`${API_BASE_URL}/chat/api/groups/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(resp.data); // ✅ Update state with groups
    } catch (err) {
      console.error("Error fetching groups:", err);
    }

  }



  useEffect(() => {
    const fetchConnectedUsers = async () => {
      try {
        const resp = await axios.get(`${API_BASE_URL}/chat/auth/get-connected-users/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setChatUsers(resp.data);
        localStorage.setItem("chatUsers", JSON.stringify(resp.data));
      } catch (err) {
        console.error("Error fetching connected users:", err);
      }
    };

    const loadFromLocalStorage = () => {
      const savedChatUsers = localStorage.getItem("chatUsers");
      if (savedChatUsers) {
        setChatUsers(JSON.parse(savedChatUsers));
      }

      const savedMessages = localStorage.getItem("messages");
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    };

    fetchConnectedUsers();
    loadFromLocalStorage();

    const fetchUser = async () => {
      try {
        const userEmail = localStorage.getItem("user_email");
        if (!userEmail) return;
        const response = await axios.get(`${API_BASE_URL}/chat/auth/user/${userEmail}/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        // setLoggedInUser(response.data.name);
        // setLoggedInUserId(response.data.id);

        const newUser = response.data.name;
        const userid = response.data.id;

        if (newUser !== loggedInUser) {
          // If the local storage was for a different user, clear it
          localStorage.removeItem("chatUsers");
          localStorage.removeItem("messages");
          setChatUsers([]);
          setMessages({});
        }

        setLoggedInUser(newUser);
        setLoggedInUserId(userid);

        console.log("Logged-in user ID:", userid);
        if (userid) {
          setupGlobalWebSocket();  // ✅ Connect the global WebSocket for call notifications
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    };
    fetchUser();
    // setupWebSocket();


  }, []); // on mount

  useEffect(() => {
    setIsAdmin(localStorage.getItem("is_admin") === "true" ? true : false);
    console.log("Is admin", isAdmin, "Local storage ", localStorage.getItem("is_admin"))



  }, []);


  useEffect(() => {
    if (isCallActive && !videoRef.current) {
      console.warn("⚠️ Video container is not ready, waiting...");

    }
  }, [isCallActive]);
  // -----------------------------
  // useEffect #2: Setup WebSocket for chat room
  // -----------------------------
  useEffect(() => {
    if (!loggedInUserId || (!selectedUser && !selectedGroup)) return;

    // if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
    //   if (!globalSocketRef.current || globalSocketRef.current.readyState !== WebSocket.OPEN) {
    //     setupGlobalWebSocket();  // ✅ Ensure the global WebSocket stays connected
    //   }}

    let roomName;
    if (selectedUser) {
      roomName =
        loggedInUserId > selectedUser.id
          ? `${selectedUser.id}-${loggedInUserId}`
          : `${loggedInUserId}-${selectedUser.id}`;
    } else {
      roomName = `Group_${selectedGroup.id}`;
    }



    const wsUrl = `wss://15.206.20.30/ws/chat/${roomName}/`;
    if (socketRef.current) {
      socketRef.current.close(); // ✅ Close existing WS before opening a new one
    }
    const newSocket = new WebSocket(wsUrl);
    socketRef.current = newSocket;

    newSocket.onopen = () => {
      console.log("✅ WebSocket connected:", roomName);
    };

    newSocket.onmessage = async (event) => {
      const msgData = JSON.parse(event.data);
      console.log("WS message received:", msgData);

      switch (msgData.type) {
        case "chat_message":

          handleIncomingChat(msgData);
          break;

        case "file_message":
          handleIncomingFile(msgData);
          break;


        default:
          console.log("⚠️ Unhandled WS message:", msgData);
      }
    };

    newSocket.onclose = () => {
      console.log("WebSocket disconnected:", roomName);
    };

    return () => {
      newSocket.close();
    };

  }, [loggedInUserId, selectedUser, selectedGroup]);


  // -----------------------------
  // Helpers
  // -----------------------------

  const setupGlobalWebSocket = () => {
    if (!loggedInUserId) return;

    const wsUrl = `wss://15.206.20.30/ws/chat/user/${loggedInUserId}/`;
    console.log("🌐 Connecting to Global WebSocket:", wsUrl);

    globalSocketRef.current = new WebSocket(wsUrl);

    globalSocketRef.current.onopen = () => {
      console.log("✅ Global WebSocket connected for user:", loggedInUserId);
    };

    // globalSocketRef.current.onmessage = (event) => {
    //   const msgData = JSON.parse(event.data);
    //   console.log("📩 Global WebSocket message received:", msgData);

    //   if (msgData.type === "incoming_call") {
    //     console.log("📞 Incoming call from:", msgData.caller);

    //     if (!isCallActive && msgData.receiver == loggedInUserId) {
    //       setCaller(msgData.caller);
    //       setIncomingCall(true);
    //       playRingtone();
    //     }
    //   }   

    // };

    globalSocketRef.current.onmessage = (event) => {
      const msgData = JSON.parse(event.data);
      console.log("📩 Global WebSocket message received:", msgData);

      if (msgData.type === "incoming_call") {
        console.log("📞 Incoming call from:", msgData.caller);

        if (!isCallActive && msgData.receiver == loggedInUserId) {
          setCaller(msgData.caller);
          setIncomingCall(true);
          playRingtone();
        } selectedUser
      }

      // Handle incoming chat messages
      if (msgData.type === "new_message" && msgData.receiver == loggedInUserId && msgData.sender) {
        console.log("💬 New message from:", msgData.sender_name,);
        fetchNotificationMsg();
        // Show toast notification for the new message
        toast.info(`📩 one message from ${msgData.sender_name}`, {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
        });

        // Update state with new message
        // setMessages((prev) => ({
        //   ...prev,
        //   [msgData.sender]: [...(prev[msgData.sender] || []), msgData],
        // }));
      }
    };

    globalSocketRef.current.onclose = () => {
      console.warn("⚠️ Global WebSocket disconnected! Reconnecting...");
      setTimeout(setupGlobalWebSocket, 2000);
    };
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
  };

  const inviteToCall = (user) => {
    setShowInviteModal(false);
    if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
      globalSocketRef.current.send(
        JSON.stringify({
          type: "call_invite",
          caller: loggedInUserId,
          receiver: user.id,
          room: videoRoom.name // Current room
        })
      );
      console.log(`📞 Invited ${user.name} to join call in room: ${videoRoom.name}`);
    }
  };


  async function startCallWithRoom(roomName) {
    try {
      const res = await axios.post(`${API_BASE_URL}/chat/generate-token/`, {
        identity: loggedInUser,
        room: roomName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const twilioToken = res.data.token;
      const localTracks = await createLocalTracks({ audio: true, video: true });
      const room = await connect(twilioToken, { name: roomName, tracks: localTracks });

      setIsCallActive(true);
      setVideoRoom(room);

      const localVideoTrack = localTracks.find(track => track.kind === "video");
      if (localVideoTrack && videoRef.current) {
        const videoElement = localVideoTrack.attach();
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "contain";
        videoRef.current.innerHTML = "";
        videoRef.current.appendChild(videoElement);
      }

      room.participants.forEach(handleParticipantTracks);
      room.on("participantConnected", handleParticipantTracks);
      room.on("participantDisconnected", () => {
        if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";
      });
    } catch (err) {
      console.error("Error joining call:", err);
      alert("Failed to join the call.");
    }
  }




  // Function to start a video call
  async function startCall() {
    if (!selectedUser && !incomingCall) return alert("Select a user first!");
    let roomName;
    if (incomingCall) {
      roomName =
        loggedInUserId > caller
          ? `${caller}-${loggedInUserId}`
          : `${loggedInUserId}-${caller}`;

    }
    else {
      roomName =
        loggedInUserId > selectedUser.id
          ? `${selectedUser.id}-${loggedInUserId}`
          : `${loggedInUserId}-${selectedUser.id}`;
    }

    console.log("Room is : ", roomName)
    try {
      console.log("🔍 Requesting Twilio Token...");
      const res = await axios.post(`${API_BASE_URL}/chat/generate-token/`,
        {
          identity: loggedInUser,
          room: roomName
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        });
      const twilioToken = res.data.token;
      console.log("✅ Twilio Token Received:", twilioToken);

      // ✅ Request User's Camera & Microphone Permission
      console.log("🔍 Requesting Camera & Mic Access...");
      const localTracks = await createLocalTracks({
        audio: true, // Simplified audio constraints
        video: true  // Simplified video constraints
      });
      console.log("✅ Camera & Mic Access Granted!");
      console.log("🔍 Local tracks created:", localTracks.map(t => t.kind).join(", "));


      // Ensure video ref exists before proceeding
      if (!videoRef?.current) {
        console.error("❌ videoRef is not available - make sure the video element is mounted");
        // Create a fallback element if needed
        const container = document.getElementById('video-container'); // Make sure this ID exists in your HTML
        if (container) {
          console.log("Found the container")
          const fallbackVideo = document.getElementById('fallback-local-video');
          console.log("found the FallbackVideo")
          // fallbackVideo.id = 'fallback-local-video';
          container.appendChild(fallbackVideo);
          videoRef.current = fallbackVideo;
          console.log("⚠️ Created fallback video element");
        }
      }

      setIsCallActive(true);

      // Attach local video track to local video element
      const localVideoTrack = localTracks.find(track => track.kind === "video");
      console.log("🔍 Local video track:", localVideoTrack ? "Found" : "Not found");

      if (localVideoTrack) {
        const attachLocalVideo = () => {
          if (videoRef.current) {
            videoRef.current.innerHTML = ""; // Clear old video elements
            const videoElement = localVideoTrack.attach();

            // Ensure full video is visible
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "contain";  // Prevents cropping
            videoElement.style.transform = "scaleX(-1)";  // Optional: Mirror effect

            videoRef.current.appendChild(videoElement);
            console.log("✅ Local video attached successfully!");
          } else {
            console.error("❌ videoRef.current is NULL. Retrying...");
            setTimeout(attachLocalVideo, 100); // Retry after 100ms
          }
        };

        attachLocalVideo();
      } else {
        console.error("❌ Could not find local video track");
      }

      // Connect to the room
      console.log("🔍 Connecting to room:", roomName);
      const room = await connect(twilioToken, {
        name: roomName,
        tracks: localTracks
      });
      setVideoRoom(room);
      console.log("✅ Connected to room successfully!");

      // Handle existing participants (in case someone is already in the room)
      room.participants.forEach(participant => {
        console.log(`${participant.identity} is already in the room`);
        handleParticipantTracks(participant);
      });

      // Handle new participants joining
      room.on('participantConnected', participant => {
        console.log(`${participant.identity} joined the room`);
        participant.tracks.forEach(publication => {
          if (publication.isSubscribed) {
            console.log("Subscribing to track:", publication.track.kind);
            handleTrackSubscribed(publication.track, participant);
          }
        });

        // Handle new track subscriptions
        participant.on('trackSubscribed', track => {
          console.log("Track subscribed:", track.kind);
          handleTrackSubscribed(track, participant);
        });

        // Handle track unsubscriptions
        participant.on('trackUnsubscribed', handleTrackUnsubscribed);
      });

      // Handle new participants joining
      room.on('participantConnected', participant => {
        console.log(`${participant.identity} joined the room`);
        handleParticipantTracks(participant);
      });

      // Handle participants leaving
      room.on('participantDisconnected', participant => {
        console.log(`${participant.identity} left the room`);
        // Clean up any elements associated with this participant if needed
        if (remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = "";
        }
      });

      // Send call notification if not responding to an incoming call
      if (!incomingCall && globalSocketRef.current?.readyState === WebSocket.OPEN) {
        globalSocketRef.current.send(
          JSON.stringify({
            type: "incoming_call",
            caller: loggedInUserId,
            receiver: selectedUser.id,
          })
        );
      }

    } catch (error) {
      console.error("❌ Error starting video call:", error);
      console.error("Error details:", error.message);
      if (error.name === "NotAllowedError") {
        alert("Camera or microphone permission denied. Please allow access to use video calling.");
      } else {
        alert("Failed to start video call. Please check console for details.");
      }
      setIsCallActive(false);
    }
  }

  // Helper function to manage participant tracks
  function handleParticipantTracks(participant) {
    // First, handle any tracks that are already published
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        handleTrackSubscribed(publication.track, participant);
      }
    });

    // Then set up listeners for future track events
    participant.on('trackSubscribed', track => handleTrackSubscribed(track, participant));
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
  }


  // function handleTrackSubscribed(track) {
  //   console.log("✅ Track subscribed:", track.kind);
  //   const trackElement = track.attach();

  //   if (track.kind === "video") {
  //     if (remoteVideoRef.current) {
  //       remoteVideoRef.current.innerHTML = ""; // Clear previous video
  //       remoteVideoRef.current.appendChild(trackElement); // Attach track
  //       trackElement.style.width = "100%"; 
  //       trackElement.style.height = "100%"; 
  //       trackElement.style.objectFit = "contain"; // Prevents cropping
  //       console.log("✅ Remote video track attached successfully!");
  //     } else {
  //       console.error("❌ remoteVideoRef.current is NULL. Retrying...");
  //       setTimeout(() => handleTrackSubscribed(track), 100); // Retry after 100ms
  //     }
  //   } else if (track.kind === "audio") {
  //     // Hide and attach audio to body
  //     trackElement.style.display = "none";
  //     document.body.appendChild(trackElement);
  //     console.log("✅ Remote audio track attached successfully!");
  //   }
  // }

  function handleTrackSubscribed(track, participant) {
    console.log("✅ Track subscribed:", track.kind);
    const trackElement = track.attach();

    if (track.kind === "video") {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.innerHTML = ""; // Clear previous video
        remoteVideoRef.current.appendChild(trackElement); // Attach track
        trackElement.style.width = "100%";
        trackElement.style.height = "100%";
        trackElement.style.objectFit = "contain"; // Prevents cropping
        console.log("✅ Remote video track attached successfully!");
      } else {
        console.error("❌ remoteVideoRef.current is NULL. Retrying...");
        setTimeout(() => handleTrackSubscribed(track, participant), 100); // Retry after 100ms
      }
    } else if (track.kind === "audio") {
      // Hide and attach audio to body
      trackElement.style.display = "none";
      document.body.appendChild(trackElement);
      console.log("✅ Remote audio track attached successfully!");
    }
  }



  function handleTrackUnsubscribed(track) {
    console.log("Track unsubscribed:", track.kind);
    // Detach and clean up the track element
    track.detach().forEach(element => element.remove());
  }

  function acceptCall() {
    setIncomingCall(false);
    console.log("callerrrr", caller)








    // setSelectedUser(caller)
    startCall();
  }

  function declineCall() {
    setIncomingCall(false);

  }

  // // Also, modify the endCall function to properly clean up
  // function endCall() {
  //   if (videoRoom) {
  //     // Properly disconnect from the room
  //     videoRoom.disconnect();

  //     // Properly clean up all local and remote tracks
  //     if (videoRoom.localParticipant) {
  //       videoRoom.localParticipant.tracks.forEach(publication => {
  //         if (publication.track) {
  //           publication.track.stop();
  //           const elements = publication.track.detach();
  //           elements.forEach(element => element.remove());
  //         }
  //       });
  //     }

  //     setVideoRoom(null);
  //   }

  //   setIsCallActive(false);

  //   // Clear video containers
  //   if (videoRef.current) {
  //     videoRef.current.innerHTML = "";
  //   }
  //   if (remoteVideoRef.current) {
  //     remoteVideoRef.current.innerHTML = "";
  //   }

  //   // Notify other participant about call ending
  //   if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
  //     globalSocketRef.current.send(
  //       JSON.stringify({
  //         type: "call_ended",
  //         receiver: selectedUser?.id,
  //       })
  //     );
  //   }
  // }

  function endCall() {
    if (videoRoom) {
      // Properly disconnect from the Twilio room
      videoRoom.disconnect();

      // Stop all local tracks (Camera & Microphone)
      if (videoRoom.localParticipant) {
        videoRoom.localParticipant.tracks.forEach((publication) => {
          if (publication.track) {
            publication.track.stop(); // Stop camera/mic
            const elements = publication.track.detach();
            elements.forEach((element) => element.remove());
          }
        });
      }

      setVideoRoom(null);
    }

    setIsCallActive(false);

    // Clear video containers
    if (videoRef.current) {
      videoRef.current.innerHTML = "";
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.innerHTML = "";
    }

    // Notify the other participant about call ending
    if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
      globalSocketRef.current.send(
        JSON.stringify({
          type: "call_ended",
          receiver: selectedUser?.id, // Send the receiver ID
        })
      );
      console.log("📢 Sent call_ended event to the other participant!");
    }

    // Clean up media tracks manually (in case Twilio doesn't handle it properly)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop()); // Stop the camera & mic
      })
      .catch((error) => console.error("❌ Error stopping media devices:", error));
  }




  function playRingtone() {
    const ringtone = new Audio("/ringtone.mp3");
    ringtone.play();
  }

  function handleIncomingFile(msg) {
    const isSender = msg.sender === loggedInUserId;
    const chatKey = selectedUser ? selectedUser.id : selectedGroup.id;

    // Determine the sender name or use the username if available
    const senderName = isSender ? "You" : msg.username || "Unknown";

    // Create the new message object
    const newMessage = {
      sender: isSender ? "You" : msg.username || "Them",
      file_url: msg.file_url,
      file_name: msg.file_name.split("/").pop(),
      isSender, // ✅ Fix alignment based on sender
      text: msg.message || "",
      timestamp: msg.timestamp || new Date().toLocaleString(), // Add timestamp
    };

    // Ensure that we are updating the correct conversation's message list
    setMessages((prev) => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), newMessage], // Add new message to the correct conversation
    }));

    // Scroll down after receiving a message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }


  // function handleIncomingChat(msg) {
  //   const isSender = msg.sender === loggedInUserId;
  //   const otherUserId = isSender ? msg.receiver : msg.sender;

  //   console.log("Logging sender , other and msg",isSender, otherUserId, msg)
  //   setMessages((prev) => ({
  //     ...prev,
  //     [otherUserId]: [
  //       ...(prev[otherUserId] || []),
  //       {
  //         sender: isSender ? "You" : msg.username || "Them",
  //         text: msg.message || "",
  //         file_url: msg.file_url || "",
  //         isSender,
  //       },
  //     ],
  //   }));

  //   // Scroll down after receiving a message
  //   setTimeout(() => {
  //     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  //   }, 100);

  // }

  function handleIncomingChat(msg) {
    const isSender = msg.sender === loggedInUserId;
    const chatKey = selectedUser ? selectedUser.id : selectedGroup.id;

    // Determine the sender name or use the username if available
    const senderName = isSender ? "You" : msg.username || "Unknown";

    // Create the new message object
    const newMessage = {
      sender: senderName,
      text: msg.message || "",
      file_url: msg.file_url || "",
      isSender,
      timestamp: msg.timestamp || new Date().toLocaleString(), // Add timestamp
      reply_to: msg.reply_to || null,
    };

    // Ensure that we are updating the correct conversation's message list
    setMessages((prev) => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), newMessage], // Add new message to the correct conversation
    }));

    // Scroll down after receiving a message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }



  async function handleSendMessage(e) {
    if (!input.trim() || (!selectedUser && !selectedGroup)) return;
    const token = localStorage.getItem("token");

    const formData = new FormData();

    formData.append("sender", loggedInUserId);
    formData.append("content", input)

    if (replyTo?.msg_id) {
      formData.append("reply_to", replyTo.msg_id);
    }

    selectedFiles.forEach((file) => formData.append("files", file));
    selectedFiles.forEach((file) => formData.append("file_names", file.name));

    try {
      let url;
      // console.log("Seleceted Group",selectedGroup,selectedUser)
      if (selectedUser) {
        formData.append("receiver", selectedUser.id);
        url = `${API_BASE_URL}/chat/api/messages/send/`;
      }
      else {
        url = `${API_BASE_URL}/chat/api/group/${selectedGroup.id}/send-message/`;
      }
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          // "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        body: formData
      });
      const data = await resp.json();
      console.log("Message sent response:", data);

      setInput("");
      setReplyTo(null);
      // Also send over WS if open
      if (resp.ok && socketRef.current?.readyState === WebSocket.OPEN) {
        if (selectedUser) {
          socketRef.current.send(
            JSON.stringify({
              type: "chat_message",
              message: input,
              sender: loggedInUserId,
              receiver: selectedUser.id,
              username: loggedInUser,
              id: data.id,
              reply_to: data.reply_to || null,
            })
          );
          if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
            console.log("true in globle 💐💐💐💐 ", globalSocketRef.current?.readyState === WebSocket.OPEN)
            globalSocketRef.current.send(
              JSON.stringify({
                id: data.id,
                type: "new_message",
                sender: loggedInUserId,
                receiver: selectedUser.id,
                sender_name: loggedInUser,
                text: data.content,
                reply_to: data.reply_to || null,
              })
            );
          }
          else {
            console.log("false in globle 💐💐💐💐 ", globalSocketRef.current?.readyState === WebSocket.OPEN)
          }

        } else if (selectedGroup) {
          console.log("Logging data in group Chat: ", data)
          socketRef.current.send(
            JSON.stringify({
              type: "chat_message",
              message: input,
              sender: loggedInUserId,
              receiver: selectedGroup.id,
              username: loggedInUser,
              id: data.message.id
            })
          );
          // if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
          //   console.log("true in globle 💐💐💐💐 ",globalSocketRef.current?.readyState === WebSocket.OPEN)
          //   globalSocketRef.current.send(
          //     JSON.stringify({
          //       type: "new_message",
          //       sender: loggedInUserId,
          //       receiver: selectedGroup.id,
          //       sender_name: loggedInUser,
          //       text : data.content,
          //     })
          //   );
          // }
          // else{
          //   console.log("false in globle 💐💐💐💐 ",globalSocketRef.current?.readyState === WebSocket.OPEN)
          // }
        };

      }
    } catch (err) {
      console.error("Error sending message:", err);
    }

    // setInput("");
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // function handleKeyPress(e) {
  //   if (e.key === "Enter") {selectedFiles.length > 0 ? handleFileUpload(selectedFiles) : handleSendMessage()}
  // }

  function handleKeyPress(e) {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow newline insertion in the textarea
        e.preventDefault();
        setInput((prev) => prev + "\n");
      } else {
        // Send message or upload file
        e.preventDefault();
        selectedFiles.length > 0 ? handleFileUpload(selectedFiles) : handleSendMessage();
      }
    }
  }

  // -----------------------------
  // FILE UPLOAD Handler
  // -----------------------------
  async function handleFileUpload(e) {
    if (selectedFiles.length === 0 || (!selectedUser && !selectedGroup)) return;

    const token = localStorage.getItem("token");
    const formData = new FormData();

    formData.append("sender", loggedInUserId);
    formData.append("content", input);

    selectedFiles.forEach((file) => formData.append("files", file));  // ✅ Send multiple files
    selectedFiles.forEach((file) => formData.append("file_names", file.name));  // ✅ File names

    let url
    if (selectedUser) {
      formData.append("receiver", selectedUser.id);  // ✅ Only for user messages
      url = `${API_BASE_URL}/chat/api/messages/send/`;
    } else {
      url = `${API_BASE_URL}/chat/api/group/${selectedGroup.id}/send-message/`;  // ✅ Group chat endpoint
    }

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error("Failed to upload");

      const data = await resp.json();
      console.log("File uploaded:", data);

      if (!data.files || !Array.isArray(data.files)) {
        throw new Error("Invalid response format (files missing)");
      }

      // ✅ Send file data via WebSocket
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        data.files.forEach((file, index) => {
          socketRef.current.send(
            JSON.stringify({
              type: "file_message",
              sender: loggedInUserId,
              file_url: file.url,
              file_name: file.name,
              message: index === data.files.length - 1 ? input : "", // ✅ Attach message with last file
              ...(selectedUser ? { receiver: selectedUser.id } : { group_id: selectedGroup.id })  // ✅ Handle group messages
            })
          );
        });
      }

    } catch (err) {
      console.error("File upload failed:", err);
    }

    setSelectedFiles([]);
    setInput("");
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }



  // -----------------------------
  // USER SEARCH + SELECT Handlers
  // -----------------------------
  async function handleSearch(e) {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) {
      setUsers([]);
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/chat/auth/get-users/?query=${value}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await resp.json();
      setUsers(data);
    } catch (err) {
      console.error("Error searching users:", err);
    }
  }

  // async function handleUserClick(user) {
  //   setSelectedUser(user);
  //   setSelectedGroup(null)
  //   setQuery(user.name);
  //   setUsers([]);

  //   setUnreadMessages((prev) => {
  //     const updated = { ...prev };
  //     delete updated[user.id];
  //     return updated;
  //   });

  //   setChatUsers((prev) => {
  //     if (prev.some((u) => u.id === user.id)) return prev;
  //     const newList = [...prev, user];
  //     localStorage.setItem("chatUsers", JSON.stringify(newList));
  //     return newList;
  //   });

  //   // Fetch chat history from the server
  //   const token = localStorage.getItem("token");
  //   try {
  //     const resp = await fetch(
  //       `${API_BASE_URL}/chat/api/messages/${loggedInUserId}/${user.id}/`,
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  //     if (resp.ok) {
  //       const chatHistory = await resp.json();
  //       console.log(chatHistory); 
  //       setMessages((prev) => ({
  //         ...prev,
  //         [user.id]: chatHistory.map((m) => ({
  //           sender: m.sender === loggedInUserId ? "You" : user.name,
  //           text: m.content,
  //           file_url: m.file || "",
  //           file_name : m.file ? m.file_name : "",
  //           isSender: m.sender === loggedInUserId,
  //           timestamp: m.timestamp
  //         })),

  //       }));

  //       localStorage.setItem("messages", JSON.stringify(chatHistory));
  //     } else {
  //       console.error("Failed to fetch messages:", resp.status);
  //     }
  //   } catch (err) {
  //     console.error("Error fetching chat history:", err);
  //   }

  //   setTimeout(() => {
  //     messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  //   }, 100);

  // }
  async function updateMessage(messageId, newContent = null, is_read = null) {
    const token = localStorage.getItem("token");
    let bodyData = {};

    // Only add fields that are not null
    if (newContent !== null) {
      bodyData.content = newContent;
    }
    if (is_read !== null) {
      bodyData.is_read = is_read;
      // setnotificationlist(prev => prev.filter(msg => msg.id !== messageId));
    }

    // If there's nothing to update, return early
    if (Object.keys(bodyData).length === 0) {
      console.warn("No fields to update");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/messages/${messageId}/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }


  async function handleUserClick(user) {
    console.log("Selected User:", user);

    setSelectedUser(user);
    console.log("Selected User", selectedUser)
    setSelectedGroup(null);
    setQuery(user.name);
    setUsers([]);

    setUnreadMessages((prev) => {
      const updated = { ...prev };
      delete updated[user.id];
      return updated;
    });

    setChatUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      const newList = [...prev, user];
      localStorage.setItem("chatUsers", JSON.stringify(newList));
      return newList;
    });

    // Fetch chat history from the server
    const token = localStorage.getItem("token");
    try {
      const resp = await fetch(
        `${API_BASE_URL}/chat/api/messages/${loggedInUserId}/${user.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (resp.ok) {
        const chatHistory = await resp.json();
        console.log("Chat History:", chatHistory);

        setMessages((prev) => ({
          ...prev,
          [user.id]: chatHistory.map((m) => ({
            msg_id: m.id,
            sender: m.sender === loggedInUserId ? "You" : user.name,
            text: m.content,
            file_url: m.file || "",
            file_name: m.file ? m.file_name : "",
            isSender: m.sender === loggedInUserId,
            timestamp: m.timestamp,
            msg_reacted: [],
            is_read: m.is_read,
            reply_to: m.reply_to || null
          }))
        }));

        localStorage.setItem("messages", JSON.stringify(chatHistory));
        // ✅ Identify unread messages and mark them as read using `updateMessage`
        const unreadMessages = chatHistory.filter(
          (m) => !m.is_read && m.sender !== loggedInUserId
        );

        for (const message of unreadMessages) {
          // console.log("message changing : ",message)
          updateMessage(message.id, null, true);

        }

      } else {
        console.error("Failed to fetch messages:", resp.status);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  }

  function handleFileChange(event) {
    setSelectedFiles([...selectedFiles, ...event.target.files]);
    event.target.value = null;

  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return alert("Enter a group name!");
    if (selectedMembers.length === 0) return alert("Select at least one member!");

    const token = localStorage.getItem("token");
    try {
      const resp = await axios.post(`${API_BASE_URL}/chat/api/group/create/`,
        { name: newGroupName, members: [loggedInUserId, ...selectedMembers] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedMembers([]);  // ✅ Reset selected members
      setNewGroupName("");     // ✅ Reset group name
      setShowCreateGroup(false);

      // ✅ Fetch updated groups after creating a new group
      fetchGroups();
    } catch (err) {
      console.error("Error creating group:", err);
    }
  }


  function handleMemberSelection(userId) {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSelectGroup(group) {
    setSelectedGroup(group);
    setSelectedUser(null);  // ✅ Deselect any private chat
    setInput("");
    setSelectedFiles([]);

    const token = localStorage.getItem("token");
    try {
      const resp = await fetch(
        `${API_BASE_URL}/chat/api/group/${group.id}/messages/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.ok) {
        const chatHistory = await resp.json();
        console.log("Old Messages", chatHistory);
        setMessages((prev) => ({
          ...prev,
          [group.id]: chatHistory.map((m) => ({
            msg_id: m.id,
            sender: m.sender === loggedInUserId ? "You" : group.name,
            text: m.content,
            file_url: m.file || "",
            file_name: m.file ? m.file_name : "",
            isSender: m.sender === loggedInUserId,
          })),
        }));

        localStorage.setItem("messages", JSON.stringify(chatHistory));
      } else {
        console.error("Failed to fetch messages:", resp.status);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);


  }



  async function AddMembertoGroup(group) {

    try {
      const url = `${API_BASE_URL}/chat/api/group/${group}/add-members/`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          // "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        // body : {
        //   "Members" : selected_Members
        // }
      });
    }
    catch (err) {
      console.error("Error fetching chat history:", err);
    }


  }



  // async function startScreenShare() {
  //   try {
  //     // Request screen sharing from the user
  //     const screenStream = await navigator.mediaDevices.getDisplayMedia({
  //       video: true,
  //     });

  //     // Create a new video track for screen sharing
  //     const screenTrack = screenStream.getTracks()[0];

  //     // Get the local participant from the Twilio room
  //     const localParticipant = videoRoom.localParticipant;

  //     // Unpublish the current video track (optional: if you want to replace it)
  //     const localVideoTrack = localParticipant.videoTracks.values().next().value;
  //     if (localVideoTrack) {
  //       localVideoTrack.track.stop(); // Stop the existing track if you want to replace it
  //     }

  //     // Publish the screen track
  //     localParticipant.publishTrack(screenTrack);

  //     // Optionally, attach the screen track to the local video element
  //     if (videoRef.current) {
  //       const videoElement = screenTrack.attach();
  //       videoElement.style.width = "100%";
  //       videoElement.style.height = "100%";
  //       videoElement.style.objectFit = "contain";
  //       videoRef.current.innerHTML = ""; // Clear previous video
  //       videoRef.current.appendChild(videoElement);
  //     }
  //   } catch (error) {
  //     console.error('Error starting screen share:', error);
  //   }
  // }


  let screenTrack = null; // Store screen sharing track

  async function startScreenShare() {
    try {
      // Request screen sharing from the user
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

      // Get the first video track from the screen stream
      const screenMediaTrack = screenStream.getVideoTracks()[0];

      // Wrap the raw MediaStreamTrack into a Twilio LocalVideoTrack
      screenTrack = new LocalVideoTrack(screenMediaTrack);

      // Get the local participant from Twilio Room
      const localParticipant = videoRoom.localParticipant;

      // Unpublish the current camera track
      const localVideoTrack = Array.from(localParticipant.videoTracks.values())[0]?.track;
      if (localVideoTrack) {
        localParticipant.unpublishTrack(localVideoTrack);
        localVideoTrack.stop(); // Stop camera video
      }

      // Publish the screen track
      localParticipant.publishTrack(screenTrack);

      // Attach the screen track to the UI
      if (videoRef.current) {
        videoRef.current.innerHTML = "";
        const videoElement = screenTrack.attach(); // Now this works!
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "contain";
        videoRef.current.appendChild(videoElement);
      }

      // Listen for when the screen share is stopped manually
      screenMediaTrack.onended = stopScreenShare;

    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  }


  // function stopScreenShare() {
  //   // Stop the screen track
  //   const screenTrack = room.localParticipant.videoTracks.getTracks()[0];
  //   if (screenTrack) {
  //     screenTrack.track.stop();
  //   }

  //   // Optionally, you can re-enable the original video track
  //   startVideoTrack();
  // }
  async function stopScreenShare() {
    if (!screenTrack) return;

    const localParticipant = videoRoom.localParticipant;

    // Unpublish and stop screen share track
    localParticipant.unpublishTrack(screenTrack);
    screenTrack.stop();
    screenTrack = null;

    // Re-enable the camera
    const localTracks = await createLocalTracks({ video: true, audio: true });
    const newVideoTrack = localTracks.find(track => track.kind === "video");

    if (newVideoTrack) {
      localParticipant.publishTrack(newVideoTrack);

      // Attach the camera video back to UI
      if (videoRef.current) {
        videoRef.current.innerHTML = "";
        const videoElement = newVideoTrack.attach();
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "contain";
        videoRef.current.appendChild(videoElement);
      }
    }
  }





  // function startVideoTrack() {
  //   // Logic to enable video track again (using getUserMedia or Twilio's API)
  // }


  // 10/4/25 searchbar functionality


  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");
  console.log(searchTerm)

  const selectedId = selectedUser?.id || selectedGroup?.id;

  // const filteredMessages = selectedId
  //   ? (messages[selectedId] || []).filter(
  //     (msg) => msg.text.toLowerCase().includes(searchTerm.toLowerCase())) : [];


  const matchingIndices = selectedId
    ? (messages[selectedId] || []).reduce((acc, msg, idx) => {
      if (msg.text.toLowerCase().includes(searchTerm.toLowerCase())) acc.push(idx);
      return acc;
    }, [])
      .reverse()
    : [];


  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  useEffect(() => {
    if (searchTerm && matchingIndices.length > 0) {
      const matchIndex = matchingIndices[currentMatchIndex];
      const el = document.getElementById(`msg-${matchIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchTerm, currentMatchIndex]);



  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [forwardMessage, setForwardMessage] = useState(null);
  const [multipleMsgOption, setMutipleMsgOption] = useState(false)
  const [checkboxVisible, setCheckboxVisible] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // console.log("hover id ", hoveredMessageId)

  const MsgPopover = ({ messageId, isSender }) => {
    const handleAction = (action) => {
      if (!selectedMessage) return;

      switch (action) {
        case "Edit":
          console.log("Selected message",selectedMessage)
          if (isSender) {
            setEditMode(true);
            setInput(selectedMessage.text);
          }
          
          break;

        case "Reply":
          setReplyTo(selectedMessage);
          break;

        case "Copy":
          navigator.clipboard.writeText(selectedMessage.text);
          console.log(`Copied message:`, selectedMessage.text);
          break;


        case "Forward":
          setForwardMessage(selectedMessage.text); // Store the message to forward
          break;


        // case "Select_Message":
        //   setMutipleMsgOption(!multipleMsgOption)
        //   setSelectedMessages((prevSelected) => {
        //     const isAlreadySelected = prevSelected.some((m) => m.msg_id === selectedMessage.msg_id);
        //     if (isAlreadySelected) {
        //       // If already selected, remove it
        //       return prevSelected.filter((m) => m.msg_id !== selectedMessage.msg_id);
        //     } else {
        //       // Otherwise, add it
        //       return [...prevSelected, { msg_id: selectedMessage.msg_id, text: selectedMessage.text }];
        //     }
        //   });
        //   break;
        case "Select_Message":
          setMutipleMsgOption(true); // Enable multiple selection mode

          setCheckboxVisible((prevCheckboxVisible) => ({
            ...prevCheckboxVisible,
            [selectedMessage.msg_id]: !prevCheckboxVisible[selectedMessage.msg_id], // Toggle only this message
          }));

          setSelectedMessages((prevSelected) => {
            const isAlreadySelected = prevSelected.some((m) => m.msg_id === selectedMessage.msg_id);
            if (isAlreadySelected) {
              return prevSelected.filter((m) => m.msg_id !== selectedMessage.msg_id);
            } else {
              return [...prevSelected, { msg_id: selectedMessage.msg_id, text: selectedMessage.text }];
            }
          });
          break;


        case "Delete":
          console.log(`Deleting message:`, selectedMessage);
          if (selectedMessage?.msg_id) {
            softDeleteMessage(selectedMessage.msg_id);
          }
          break;
          
          break;

        case "Cancel":
          console.log("clicked cancel", selectedMessage)
          break;

        default:
          break;
      }

      setActiveMessageId(null);
      setSelectedMessage(null);
    };

    return (
      activeMessageId === messageId && (
        <div
          className="d-flex flex-column popover-body-custom position-absolute "
          style={{
            top: `${popoverPosition.top}px`,
            left: popoverPosition.isSender ? `${popoverPosition.left - 140}px` : `${popoverPosition.left + 20}px`,
            zIndex: 9500,
          }}
        >
          {/* Only show the "Edit" button if the sender is "You" */}
          {isSender && (
            <button className="chat-option-btn d-inline-block" onClick={() => handleAction("Edit")}>
              Edit
            </button>
          )}
          <button className="chat-option-btn" onClick={() => handleAction("Reply")}>
            Reply
          </button>
          <button className="chat-option-btn" onClick={() => handleAction("Copy")}>
            Copy
          </button>

          <button type="button" className="chat-option-btn" onClick={() => handleAction("Forward")} data-bs-toggle="modal" data-bs-target="#staticBackdrop">
            Forword
          </button>

          <button className="chat-option-btn" onClick={() => handleAction("Select_Message")}>
            Select Message
          </button>

          <button className="chat-option-btn" onClick={() => handleAction("Delete")}>
            Delete
          </button>
          <button className="chat-option-btn" onClick={() => handleAction("Cancel")}>
            Cancel
          </button>
        </div>
      )
    );
  };



  const handlePopoverToggle = (messageId, isOpen, event = null, msg = null) => {
    if (isOpen && event) {
      const rect = event.target.getBoundingClientRect();
      const chatContainer = document.querySelector(".chat-container").getBoundingClientRect();

      setPopoverPosition({
        top: rect.top - chatContainer.top + rect.height / 2,
        left: rect.left - chatContainer.left + rect.width / 2,
        isSender: String(messageId).startsWith("you"),
      });

      setActiveMessageId(messageId);
      setSelectedMessage(msg);
    } else {
      setActiveMessageId(null);
      setSelectedMessage(null);
    }
  };


  const [multiPopup, setMultipopup] = useState(false);

  const MutipleMessagePopup = (
    <Popover id="multipleMsg-pop">
      <Popover.Body className="d-flex flex-column popover-body-custom">
        <Button className="chat-option-btn" onClick={() => { handleMultipleMsgReply(), setMultipopup(false) }}>Reply</Button>
        <Button onClick={() => { handleMultipleMsgForword(), setMultipopup(false) }} type="button" className="chat-option-btn" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
          Forword
        </Button>

        <Button className="chat-option-btn" onClick={() => { handleMultipleMsgDelete(), setMultipopup(false) }}>Delete</Button>

        <Button className="chat-option-btn" onClick={() => { handleMultipleMsgCancel(), setMultipopup(false) }}>Cancel</Button>
      </Popover.Body>
    </Popover>
  );

  const handleMultipleMsgCancel = () => {
    setSelectedMessages([]);
    setCheckboxVisible({})
    setMutipleMsgOption(false)
  }



  const handleMultipleMsgReply = () => {
    if (selectedMessages.length === 1) {
      // If only one message is selected, keep the original functionality
      setReplyTo(selectedMessages[0]);
    } else if (selectedMessages.length > 1) {
      // If multiple messages are selected, store them in an array
      setReplyTo([...selectedMessages]);
    }
    setMultipopup(false);
    console.log("Replying to:", selectedMessages);
  };


  const handleMultipleMsgDelete = () => {
    console.log("selected Message to delete", selectedMessages)
    setCheckboxVisible({})
    setSelectedMembers([]);
    setSelectedMessages([]);
    setMultipopup(false)
  }

  // console.log(selectedMessages, "sm")

  const handleDoubleClick = (msgId, msgContent) => {
    setCheckboxVisible((prev) => ({ ...prev, [msgId]: !prev[msgId] }));

    setSelectedMessages((prevSelected) => {
      const alreadySelected = prevSelected.some((msg) => msg.msg_id === msgId);

      if (alreadySelected) {
        return prevSelected.filter((msg) => msg.msg_id !== msgId);
      } else {
        return [...prevSelected, { msg_id: msgId, content: msgContent }];
      }
    });
  };

  const handleCheckboxChange = (msg_id, msg_text) => {
    setSelectedMessages((prevSelected) => {
      const isSelected = prevSelected.some((m) => m.msg_id === msg_id);

      // Update checkbox visibility
      setCheckboxVisible((prev) => ({
        ...prev,
        [msg_id]: !isSelected, // Toggle visibility
      }));

      if (isSelected) {
        // Remove message from selection
        return prevSelected.filter((m) => m.msg_id !== msg_id);
      } else {
        // Add message to selection
        return [...prevSelected, { msg_id, text: msg_text }];
      }
    });
  };

  const handleMemberSelectionForward = (id, type) => {
    const identifier = `${type}_${id}`; // Unique key to differentiate users and groups

    setSelectedMembers((prevState) =>
      prevState.includes(identifier)
        ? prevState.filter((item) => item !== identifier) // Deselect
        : [...prevState, identifier] // Select
    );
  };


  const handleForwardMessage = () => {
    if ((!forwardMessage && selectedMessages.length === 0) || selectedMembers.length === 0) {
      alert("Please select at least one user/group and one message to forward.");
      return;
    }

    console.log(`Forwarding messages to users/groups:`, selectedMembers);

    selectedMembers.forEach((member) => {
      if (forwardMessage) {
        console.log(`Forwarding single message: "${forwardMessage}" to ${member}`);
        // Implement sending logic for single message
      } else {
        selectedMessages.forEach((msg) => {
          if (msg && msg.content) {  // Ensure msg has a valid 'content' property
            console.log(`Forwarding message: "${msg.content}" to ${member}`);
            // Implement sending logic for multiple messages
          } else {
            console.error("Message does not have a valid 'content' field.");
          }
        });
      }
    });



    // Reset selections after forwarding
    setCheckboxVisible({})
    setSelectedMembers([]);
    setSelectedMessages([]);
    setForwardMessage(null);
    setMutipleMsgOption(false)

    // Close modal
    const modalElement = document.getElementById("staticBackdrop");
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modalInstance.hide();
    }

    // Remove remaining modal backdrop to prevent UI issues
    setTimeout(() => {
      document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
    }, 300);
  };


  const handleMultipleMsgForword = () => {
    if (selectedMessages.length === 0) {
      alert("Please select at least one message to forward.");
      return;
    }
  
    // Add sender name and timestamp for each forwarded message
    const formattedForwards = selectedMessages.map(msg => ({
      ...msg,
      forwardMeta: {
        originalSender: msg.sender?.name || "Unknown",
        originalTime: msg.timestamp || new Date().toISOString()
      }
    }));
  
    setForwardMessage(formattedForwards); // store this for display
  };


  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const [showFullEmojiPickerId, setShowFullEmojiPicker] = useState(null);

  const emojiList = ["✔️", "🔥", "👍", "👎", "👏",];

  const handleReact = async (msgId, emoji) => {
    const token = localStorage.getItem("token");
    console.log('selected emoji', emoji)
    try {
      await axios.post(
        `${API_BASE_URL}/chat/api/reaction/`,
        {
          message_id: msgId,
          user_id: loggedInUserId,
          emoji: emoji,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // setMessages((prevMessages) => {
      //   const updated = { ...prevMessages };
      //   const target = updated[selectedUser?.id || selectedGroup?.id];
      //   if (target) {
      //     const msgIndex = target.findIndex((m) => m.msg_id === msgId);
      //     if (msgIndex !== -1) {
      //       const message = { ...target[msgIndex] };
      //       message.msg_reacted = [...(message.msg_reacted || []), emoji];
      //       target[msgIndex] = message;
      //     }
      //   }
      //   return updated;
      // });

    } catch (err) {
      console.error("Error sending reaction:", err);
    }

    setShowEmojiPickerFor(null);
  };



  const handleRemoveReaction = async (msgId, emoji) => {
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`${API_BASE_URL}/chat/api/reaction/`, {
        data: {
          message_id: msgId,
          user_id: loggedInUserId,
          emoji: emoji,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // setMessages((prevMessages) => {
      //   const updated = { ...prevMessages };
      //   const target = updated[selectedUser?.id || selectedGroup?.id];
      //   if (target) {
      //     const msgIndex = target.findIndex((m) => m.msg_id === msgId);
      //     if (msgIndex !== -1) {
      //       const message = { ...target[msgIndex] };
      //        message.msg_reacted = (message.msg_reacted || []).filter((e) => e !== emoji);
      //       target[msgIndex] = message;
      //     }
      //   }
      //   return updated;
      // });

    } catch (err) {
      console.error("Error removing reaction:", err);
    }
  };


  async function softDeleteMessage(messageId) {
    console.log("Deletingggggggg msggggg")
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/messages/${messageId}/soft-delete/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (response.ok) {
        // ✅ Remove the message from the current chat immediately
        const userId = selectedUser?.id || selectedGroup?.id;
        setMessages((prevMessages) => {
          const updatedMessages = { ...prevMessages };
          updatedMessages[userId] = updatedMessages[userId]?.filter(
            (msg) => msg.msg_id !== messageId
          );
          return updatedMessages;
        });
  
        // Optionally: show a toast
        // toast.success("Message deleted!", { position: "bottom-right" });
      } else {
        const data = await response.json();
        console.error("Soft delete failed:", data.error);
        toast.error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Server error while deleting message");
    }
  }
  
  

  //Rendering





  return (
    <>

      <div className="d-flex vh-100">
        <div
          className="bg-light text-dark position-fixed h-100 p-3 d-flex flex-column align-items-center"
          style={{
            width: sidebarOpen ? "250px" : "80px",
            transition: "width 0.3s",
            overflowX: "hidden",
            whiteSpace: "nowrap",
            boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          }}
        >
          {/* User Info */}
          <div className={`d-flex align-items-center justify-content-start mb-3 w-100 ${sidebarOpen ? "border rounded shadow-lg p-2" : ""}`}>
            <h6
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold "
              style={{
                width: "35px",
                height: "35px",
                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
              }}
            >
              {loggedInUser ? loggedInUser.charAt(0).toUpperCase() : ""}
            </h6>
            {sidebarOpen && <h6 className="fw-bold text-center ms-2 mb-0">{loggedInUser}</h6>}
          </div>
          {/* <div className={`d-flex align-items-center justify-content-start mb-3 ${sidebarOpen ? "border rounded shadow-sm p-2" : ""}`}>
          <h6
            className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
            style={{
              width: "35px",
              height: "35px",
              background: "linear-gradient(135deg, #6a11cb, #2575fc)",
            }}
          >
            {loggedInUser ? loggedInUser.charAt(0).toUpperCase() : ""}
          </h6>
          {sidebarOpen && <h6 className="fw-bold text-center ms-2 mb-0">{loggedInUser}</h6>}
        </div> */}

          {!sidebarOpen && (
            <div>
              <p className="icon-btn shadow-sm border btn" onClick={() => setSidebarOpen(!sidebarOpen)} ><i className="fa-solid fa-ellipsis-vertical" ></i></p>
            </div>
          )}

          {sidebarOpen && (

            <div className="">

              {/* Search Bar */}
              <div className="mb-3 w-100 position-relative">
                <input
                  type="search"
                  className="form-control p-2 ps-4 rounded-pill shadow-sm"
                  placeholder="  Search People..."
                  onChange={handleSearch}
                  style={{
                    border: "1px solid #ccc",
                    transition: "all 0.3s ease-in-out",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.border = "1px solid #6a11cb")}
                  onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
                />
                <i
                  className="fas fa-search position-absolute"
                  style={{
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6a11cb",
                  }}
                ></i>
              </div>


              {/* chat,noti,notes,task manager */}
              <div className={`mb-3 w-100 d-flex  ${sidebarOpen ? "flex-wrap" : "flex-column align-items-center"} gap-2`}>

                {/* Chat Button with Popover */}
                <div className="icon-container">
                  <OverlayTrigger
                    trigger="click"
                    placement="right"
                    overlay={chatPopover}
                    show={showPopover}
                    onToggle={(isVisible) => setShowPopover(isVisible)}
                    rootClose
                  >
                    <Button variant="light" className="icon-btn shadow-sm">
                      <i className="fa-regular fa-comments"></i>
                    </Button>
                  </OverlayTrigger>
                  <span className="icon-label">Chat</span>
                </div>

                {/* Notifications */}

                <div className="icon-container">
                  <Button variant="light" className="icon-btn shadow-sm position-relative" onClick={handleNotificationBtn}>
                    {notificationlist.length > 0 && (
                      <span className="notification-badge">
                        {notificationlist.length}
                      </span>
                    )}
                    <i className="fa-solid fa-bell"></i>
                  </Button>
                  <span className="icon-label">Notification</span>
                </div>

                {/* Task Manager */}
                <div className="icon-container">
                  <Button variant="light" className="icon-btn shadow-sm">
                    <i className="fa-solid fa-list-check"></i>
                  </Button>
                  <span className="icon-label">Tasks</span>
                </div>

                {/* Notes */}
                <div className="icon-container">
                  <Button variant="light" className="icon-btn shadow-sm">
                    <i className="fa-solid fa-notes-medical"></i>
                  </Button>
                  <span className="icon-label">Notes</span>
                </div>

              </div>

            </div>
          )}

          {/* Scrollable Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              width: "100%",
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE & Edge
            }}>

            <style> {`div::-webkit-scrollbar {display: none; } `} </style>

            {/* Search Results */}
            {users.length > 0 && (
              <ul className="list-unstyled w-100">
                {users.map((user) => (
                  <li
                    key={user.id}
                    className={`d-flex align-items-center p-2 rounded mb-2 ${selectedUser === user ? "active-chat" : ""}`}
                    style={{
                      color: selectedUser === user ? "white" : "black",
                      background: selectedUser === user
                        ? "linear-gradient(135deg,rgba(107, 17, 203, 0.5),rgba(37, 116, 252, 0.45))"
                        : "#f8f9fa",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onClick={() => handleUserClick(user)}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                      style={{
                        width: "25px",
                        height: "25px",
                        background: "linear-gradient(135deg,rgba(107, 17, 203, 0.66),rgba(37, 116, 252, 0.64))",
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {sidebarOpen && <p className=" ms-2 mb-0 p-1">{user.name.charAt(0).toUpperCase() + user.name.slice(1)}</p>}
                  </li>
                ))}
              </ul>
            )}

            {/* Create Group Button */}
            {/* <div className="mb-3 w-100">
            <button type="button" className="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#exampleModal" style={{ background: "linear-gradient(135deg, #6a11cb, #2575fc)" }}>
              <i className="fas fa-users mx-2"></i> {sidebarOpen && "Create Group"}
            </button>
          </div> */}

            {/* Active Chats */}
            {(!notiSpace && (activeChat === "all" || activeChat === "private")) ? (
              <div className="private-chat-list text-start w-100">
                {activeChat === 'all' ? <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Recent Chat:</p> : <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Private Chat:</p>}
                <ul className="list-unstyled w-100">
                  {chatUsers.map((user, index) => (
                    <li
                      key={index}
                      className={`chat-user-item d-flex align-items-center p-2 rounded mb-2 ${selectedUser === user ? "active-chat" : ""}`} onClick={() => handleUserClick(user)} >
                      <div className="user-avatar  ">{user.name.charAt(0).toUpperCase()}</div>
                      {sidebarOpen && <p className="ms-2 mb-0">{user.name.charAt(0).toUpperCase() + user.name.slice(1)}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}


            {/* {(!notiSpace && (activeChat === "all" || activeChat === "group")) ? (
              <div className="group-chat-list text-start w-100">
                {activeChat === 'all' ? "" : <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Group Chat:</p>}
                <ul className="list-unstyled w-100">
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <li
                        key={group.id}
                        className={`group-chat-item d-flex align-items-center p-2 rounded mb-2 ${selectedGroup?.id === group.id ? "active-group" : ""
                          }`} onClick={() => handleSelectGroup(group)}>
                        <div
                          className="group-avatar"

                        >{group.name.charAt(0).toUpperCase()}</div>
                        {sidebarOpen && <p className="ms-2 mb-0">{group.name.charAt(0).toUpperCase() + group.name.slice(1)}</p>}
                      </li>
                    ))
                  ) : (
                    <p className="text-muted" style={{ fontSize: "12px" }}>No groups found</p>
                  )}
                </ul>
              </div>
            ) : null} */}

            {activeChat === "all" || activeChat === "group" ? (
              <div className="text-start w-100">
                {activeChat === 'all' ? "" : <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Group Chat:</p>}
                <ul className="list-unstyled w-100">
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <li
                        key={group.id}
                        className={`d-flex align-items-center p-2 rounded mb-2 ${selectedGroup?.id === group.id ? "active-chat" : ""
                          }`}
                        style={{
                          color: selectedGroup?.id === group.id ? "white" : "black",
                          background:
                            selectedGroup?.id === group.id
                              ? "linear-gradient(135deg,rgba(107, 17, 203, 0.5),rgba(37, 116, 252, 0.45))"
                              : "#f8f9fa",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onClick={() => handleSelectGroup(group)}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                          style={{
                            width: "25px",
                            height: "25px",
                            background: "linear-gradient(135deg,rgba(107, 17, 203, 0.66),rgba(37, 116, 252, 0.64))",
                          }}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        {sidebarOpen && <p className="ms-2 mb-0">{group.name}</p>}
                      </li>
                    ))
                  ) : (
                    <p className="text-muted" style={{ fontSize: "14px" }}>No groups found</p>
                  )}
                </ul>
              </div>
            ) : null}

            {/* {notiSpace ? (
            <div className="noti-chat-list ">
              <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Notifications : </p>
              <div className="group-chat-list text-start">
                <ul className="list-unstyled">
                  {notificationlist.length > 0 ? (
                    notificationlist.map((value, id) => (
                      <li
                      key={id}
                      className={`noti-chat-item d-flex align-items-center p-2 rounded mb-2` } onClick={()=>handleNotificationMessage(value.sender)}>
                        <div className="noti-avatar" >{value.sender_name.charAt(0)}</div>

                        <div className="d-flex flex-wrap flex-column">
                          <p className="mb-0 mx-2 text-dark" style={{ fontSize: "14px" }}>{value.content}</p>
                          <small className="text-muted mx-2 " style={{fontSize:'11px'}}>{new Date(value.timestamp).toLocaleString()}</small>
                          </div>
                      </li>
                    ))
                  ) : (
                    <p className="text-muted text-center">No new notifications</p>
                  )}
                </ul>
              </div>
            </div>
          ) : null} */}

            {notiSpace ? (
              <div className="noti-chat-list ">
                <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Notifications:</p>
                <div className="group-chat-list text-start">
                  <ul className="list-unstyled">
                    {notificationlist.length > 0 ? (
                      notificationlist.map((value, id) => (
                        <li
                          key={id}
                          className={`noti-chat-item d-flex align-items-center p-2 rounded mb-2 ${selectedUser?.id === value.sender ? "active-noti" : ""
                            }`}
                          onClick={() => handleUserClick({ id: value.sender, name: value.sender_name })}
                        >
                          <div className="noti-avatar">{value.sender_name.charAt(0)}</div>

                          {sidebarOpen && (
                            <div className="d-flex flex-wrap flex-column">
                              <p className="mb-0 mx-2 text-dark" style={{ fontSize: "14px" }}>
                                {value.content.slice(0, 20)}
                              </p>
                              <small className="text-muted mx-2" style={{ fontSize: "11px" }}>
                                {new Date(value.timestamp).toLocaleString()}
                              </small>
                            </div>
                          )}
                        </li>
                      ))
                    ) : (
                      <p className="text-muted text-center">No new notifications</p>
                    )}
                  </ul>
                </div>
              </div>
            ) : null}


          </div>

          {/* Admin Panel Button */}
          {isAdmin && (
            <div className="mt-auto mb-3">
              <button onClick={() => navigate("/admin")} className="btn btn-primary w-100" style={{ background: "linear-gradient(135deg, #6a11cb, #2575fc)", border: "none", padding: "10px", borderRadius: "8px" }}>
                <i className="fas fa-user-shield me-2"></i> {sidebarOpen && "Admin Panel"}
              </button>
            </div>
          )}
        </div>





        {/* Main Content */}
        <div
          className="flex-grow-1"
          style={{
            marginLeft: sidebarOpen ? "250px" : "80px",
            transition: "margin-left 0.3s",
          }}>


          {/* Navbar */}

          <nav className="navbar navbar-white shadow-sm bg-light d-flex justify-content-between px-3">
            <div className="d-flex align-items-center">
              <button className="btn btn-outline-light me-2 text-dark" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu />
              </button>

              {selectedUser || selectedGroup ? (
                <div className="chat-header d-flex align-items-center">
                  <h5 className="mb-0" style={{
                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}> {selectedUser ? selectedUser.name.charAt(0).toUpperCase() + selectedUser.name.slice(1) : '' || selectedGroup ? selectedGroup.name.charAt(0).toUpperCase() + selectedGroup.name.slice(1) : ""}</h5>
                </div>
              ) : (
                <span
                  className="navbar-brand fw-bold"
                  style={{
                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Nasiwak Messenger
                </span>
              )}
            </div>

            <div className="d-flex align-items-center">

              <div className="d-flex align-items-center">
                {showSearchModal ? (
                  <input
                    type="text"
                    className="form-control me-2 shadow-lg"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "400px",
                      transition: "all 0.3s ease",
                      borderRadius: "20px",
                    }}
                    onFocus={(e) => (e.target.style.border = "1px solid #6a11cb")}
                    onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
                  />
                ) : null}</div>

              {selectedUser || selectedGroup ? (
                <>
                  <button onClick={() => setShowSearchModal(!showSearchModal)} className="call-btn search-call btn  me-2">
                    <i className="fa-solid fa-magnifying-glass text-white"></i>
                  </button>
                  <button onClick={startCall} className="call-btn video-call btn btn-outline-primary me-2">
                    <FaVideo />
                  </button>
                  <button onClick={startCall} className="call-btn voice-call btn btn-outline-success me-2">
                    <FaPhone />
                  </button>

                  {multipleMsgOption && (
                    <div className="icon-container">
                      <OverlayTrigger
                        trigger="click"
                        placement="left"
                        overlay={MutipleMessagePopup}
                        show={multiPopup}
                        rootClose
                      >
                        <button
                          className="call-btn btn btn-secondary"
                          onClick={() => setMultipopup((prev) => !prev)}
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                      </OverlayTrigger>
                    </div>
                  )}

                </>
              ) : (
                <button
                  onClick={handleLogout}
                  className="btn border"
                  style={{
                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              )}
            </div>
          </nav>
          {showInviteModal && (
            <div className="invite-modal">
              <div className="invite-modal-content">
                <h4>Select User to Add</h4>
                <ul className="invite-user-list">
                  {onlineUsers.filter(user => user.id !== loggedInUserId).map(user => (
                    <li key={user.id} onClick={() => inviteToCall(user)}>
                      {user.name}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShowInviteModal(false)} className="btn end-call-btn">Close</button>
              </div>
            </div>
          )}


          {/* Incoming Call Popup */}
          {incomingCall && (
            <div className="incoming-call-popup">
              <h2> Incoming Call </h2>
              <div className="call-btns">
                <button onClick={acceptCall} className="btn accept-btn">Accept</button>
                <button onClick={declineCall} className="btn decline-btn">Decline</button>
              </div>
            </div>
          )}
          {/* Content Section */}
          <div className=" ">

            {isCallActive ? (
              /* Video/Audio Call Interface */
              <div className="video-call-overlay">
                <div className="video-call-container">
                  {/* Remote Video */}
                  <div className="video-frame primary-video">
                    <div ref={remoteVideoRef} className="video-content"></div>
                    <span className="video-badge">{selectedUser?.name}</span>
                  </div>

                  {/* Local Video - Floating on top of Remote Video */}
                  <div className="video-frame self-video">
                    <div ref={videoRef} className="video-content"></div>
                    <span className="video-badge">You</span>
                  </div>

                  {/* Controls Bar */}
                  <div className="call-controls">
                    <button onClick={endCall} className="btn end-call-btn">
                      <FaPhoneSlash className="me-2" /> End Call
                    </button>
                    <button onClick={openInviteModal} className="btn mic-call-btn">
                      ➕ Add Person
                    </button>
                    {screenTrack ? (
                      <button onClick={stopScreenShare}>Stop Screen Share</button>
                    ) : (
                      <button onClick={startScreenShare}>Share Screen</button>
                    )}
                  </div>
                </div>
              </div>

            ) : selectedUser || selectedGroup ? (
              <>


                {/* Chat Messages */}
                <div className="chat-container">
                  <div className="chat-messages " >


                    {(messages[selectedId] || []).map((msg, idx) => {
                      {/* {(selectedUser ? messages[selectedUser.id] || [] : messages[selectedGroup.id] || []).map((msg, idx) => { */ }
                      const msgDate = moment(msg.timestamp).format("DD MMM YYYY");
                      const showDateHeader = lastDate !== msgDate;
                      lastDate = msgDate;

                      return (
                        <React.Fragment key={idx}>
                          {/* Date Separator */}
                          {showDateHeader && (
                            <div className="date-separator">
                              <span>{msgDate}</span>
                            </div>
                          )}


                          {/* Chat Message */}

                          <div
                            
                            className="message-row"
                            style={{
                              display: "flex",
                              justifyContent: msg.isSender ? "flex-end" : "flex-start",
                              alignItems: "center",
                              marginBottom: "10px",
                              padding: "5px",
                              borderRadius: "10px",
                              position: "relative",
                              backgroundColor: searchTerm && msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ? 'rgb(172, 171, 171)' : 'transparent',
                            }}
                            onMouseEnter={() => setHoveredMessageId(msg.msg_id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                            onDoubleClick={() => {
                              if (multipleMsgOption) {
                                handleDoubleClick(msg.msg_id, msg.text);
                              }
                            }}>

                            {hoveredMessageId === msg.msg_id && (

                              <small>
                                <div style={{ position: 'relative' }}>
                                  <button
                                    className="btn btn-sm text-secondray border-0"
                                    onClick={() =>
                                      setShowEmojiPickerFor(showEmojiPickerFor === msg.msg_id ? null : msg.msg_id)
                                    }
                                  >
                                    <i className="fa-regular fa-face-smile text-secondray" ></i>
                                  </button>

                                  {showEmojiPickerFor === msg.msg_id && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: '30px',
                                        left: '0',
                                        background: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '5px 10px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                                        visibility: hoveredMessageId === msg.msg_id ? "visible" : "hidden",
                                        display: 'flex',
                                        gap: '8px',
                                        zIndex: 999,
                                      }}
                                    >
                                      {emojiList.map((emoji) => (
                                        <span
                                          key={emoji}
                                          style={{ cursor: 'pointer', fontSize: '15px' }}
                                          onClick={() => handleReact(msg.msg_id, emoji)}
                                        >
                                          {emoji}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {showEmojiPickerFor === msg.msg_id && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: '30px',
                                        left: '0',
                                        background: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '5px 10px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                                        zIndex: 999,
                                      }}
                                    >
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        {emojiList.map((emoji) => (
                                          <span
                                            key={emoji}
                                            style={{ cursor: 'pointer', fontSize: '15px' }}
                                            onClick={() => handleReact(msg.msg_id, emoji)}
                                          >
                                            {emoji}
                                          </span>
                                        ))}
                                        {/* <span
                                          onClick={() => setShowFullEmojiPicker(msg.msg_id)}
                                          style={{ cursor: 'pointer', fontSize: '15px' }}
                                        >
                                          ➕
                                        </span> */}
                                      </div>

                                      {/* {showFullEmojiPickerId === msg.msg_id && (
                                        <div style={{ marginTop: '10px' }}>
                                          <Picker
                                            onSelect={(emoji) => {
                                              handleReact(msg.msg_id, emoji.native);
                                              setShowFullEmojiPicker(null);
                                              setShowEmojiPickerFor(null);
                                            }}
                                            theme="light"
                                            title="Pick your reaction"
                                          />
                                        </div>
                                      )} */}
                                    </div>
                                  )}




                                </div>
                              </small>

                            )}

                            <div
                              className="message-box"
                              id={`message-${msg.msg_id}`}
                              style={{
                                maxWidth: "90%",
                                padding: "10px 15px",
                                borderRadius: "15px",
                                background: msg.isSender
                                  ? "linear-gradient(135deg, #6a11cb, #2575fc)"
                                  : "#f1f0f0",
                                color: msg.isSender ? "white" : "black",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                position: "relative",
                                marginBottom: '10px'

                              }}>
                              
                              {/* 🔁 Forwarded Message Preview */}
                              {msg.forwarded_from && (

                                <div
                                  className="forwarded-box small text-muted border-start ps-2 mb-2"
                                  style={{
                                    borderLeft: "3px solid #00bcd4",
                                    color: msg.isSender ? 'white' : 'black',
                                    paddingLeft: "8px",
                                    marginBottom: "6px",
                                    fontStyle: "italic",
                                  }}
                                >
                                  <span className="badge bg-secondary mb-1">Forwarded</span>
                                  <strong>Forwarded from {msg.forwarded_from.name}</strong>
                                </div>
                              )}

                              
                              {/* 🔁 Replied Message Preview */}
                              {msg.reply_to && (
                                <div 
                                className={`reply-box ${msg.isSender ? 'sent' : 'received'}`}
                                onClick={() => scrollToMessage(msg.reply_to.id)}
                                style={{ cursor: 'pointer' , position: 'relative' }}
                                >
                                  <strong>{msg.reply_to.sender_name}:</strong>{" "}
                                  <div>{msg.reply_to.content || msg.reply_to.file_name }</div> {/* wrapped for multiline */}
                                </div>
                              )}

                              {/* File Attachment */}
                              {msg.file_url && (
                                <div className="card mb-2" style={{ maxWidth: '250px', overflow: 'hidden' }}>
                                  <div className="card-body p-2">
                                    {/* <img
                                      src= {msg.file_url}
                                      alt={msg.file_name}
                                      className="img-fluid "
                                      style={{ maxHeight: '250px', objectFit: 'cover', borderRadius: '12px', width: '100%' }}
                                      onError={(e) => {
                                        console.error("Image failed to load:", e.target.src);
                                        e.target.style.display = "none";
                                      }}
                                    /> */}

                                  </div>
                                  {/* <p>{msg.file_name}</p> */}
                                  <a
                                    download={msg.file_name}
                                    // href={`http://127.0.0.1:8001${msg.file_url}`}    
                                    className="btn btn-sm btn-primary"
                                    style={{ fontSize: '0.8rem' }}
                                  >
                                    📥 Download
                                  </a>
                                </div>
                              )}


                              
                              
                              <p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-wrap", wordWrap: "break-word", }} id={`msg-${idx}`}> {msg.text}  </p>


                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                  alignSelf: 'flex-end',
                                  fontSize: '8px',
                                  color: msg.isSender ? '#f0f0f0' : '#555',
                                }}>
                                  {moment(msg.timestamp).format("h:mm A")}
                                </div>
                              </div>



                              {msg.msg_reacted && msg.msg_reacted.length > 0 && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '-10px',
                                    left: msg.isSender ? 'auto' : '5px',
                                    right: msg.isSender ? '5px' : 'auto',
                                    display: 'flex',
                                    gap: '3px',
                                    background: 'white',
                                    borderRadius: '10px',
                                    padding: '2px 6px',
                                  }}
                                >
                                  {msg.msg_reacted.map((emoji, i) => (
                                    <span
                                      key={i}
                                      style={{ fontSize: '12px', cursor: 'pointer' }}
                                      onDoubleClick={() => handleRemoveReaction(msg.msg_id, emoji)}
                                      title="Double-click to remove"
                                    >
                                      {emoji}
                                    </span>
                                  ))}
                                </div>
                              )}





                            </div>

                            {checkboxVisible[msg.msg_id] && (
                              <small> <div
                                className="checkbox-circle"
                                onClick={() => handleCheckboxChange(msg.msg_id, msg.text)}
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  border: "2px solid #2575fc",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginLeft: "10px",
                                  cursor: "pointer",
                                  marginBottom: '10px',
                                  backgroundColor: selectedMessages.some((m) => m.msg_id === msg.msg_id) ? "#2575fc" : "transparent",
                                }}
                              >
                                {selectedMessages.some((m) => m.msg_id === msg.msg_id) && (
                                  <i className="fa-solid fa-check" style={{ color: "white", fontSize: "14px" }}></i>
                                )}
                              </div></small>
                            )}


                            {hoveredMessageId === msg.msg_id && (
                              <OverlayTrigger
                                trigger="click"
                                placement="left"
                                overlay={<MsgPopover messageId={msg.msg_id} isSender={msg.isSender} />}
                                show={activeMessageId === msg.msg_id}
                                onToggle={(isOpen) => handlePopoverToggle(msg.msg_id, isOpen)}
                                rootClose
                              >
                                <button
                                  className="border-0 rounded-circle bg-transparent p-0 "
                                  style={{
                                    marginLeft: "10px",
                                    cursor: "pointer",
                                    visibility: hoveredMessageId === msg.msg_id ? "visible" : "hidden",
                                    color: "black",
                                    marginBottom: '10px',
                                    fontSize: '13px'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePopoverToggle(msg.msg_id, activeMessageId !== msg.msg_id, e, msg);
                                  }}
                                >
                                  <i className="fa-solid fa-ellipsis-vertical text-dark"></i>
                                </button>
                              </OverlayTrigger>
                            )}


                          </div>


                          {searchTerm && (
                            <div
                              className="text-center rounded-3  bg-white "
                              style={{
                                position: 'fixed',
                                top: 60,
                                left: '50%',
                                zIndex: 1000,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '5px ',
                              }}
                            >
                              {matchingIndices.length === 0 ? (
                                <span className="text-danger fw-medium">No messages found</span>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-sm search-btn"
                                    onClick={() =>
                                      setCurrentMatchIndex((prev) => (prev - 1 + matchingIndices.length) % matchingIndices.length)
                                    }
                                    title="Previous match"
                                  >
                                    <i className="fa-solid fa-circle-chevron-down"></i>
                                  </button>
                                  <span className="fw-medium text-dark">
                                    {currentMatchIndex + 1} / {matchingIndices.length}
                                  </span>
                                  <button
                                    className="btn btn-sm search-btn"
                                    onClick={() =>
                                      setCurrentMatchIndex((prev) => (prev + 1) % matchingIndices.length)
                                    }
                                    title="Next match"
                                  >
                                    <i className="fa-solid fa-circle-chevron-up"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>



                  {/* File Upload Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="selected-files" style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "right", alignItems: "start" }}>
                      {selectedFiles.map((file, index) => (
                        <p key={index} style={{ marginRight: "10px" }}>📂 {file.name}</p>
                      ))}
                    </div>
                  )}


                  <div className="chat-input-container">
                    {/* Reply Preview  */}

                    {replyTo && (
                      <div className="reply-preview d-flex align-items-center p-2 rounded">
                        <div className="reply-indicator"></div>
                        <div className="reply-content">
                          {Array.isArray(replyTo) ? (
                            <>
                              <span className="reply-user">Replying to {replyTo.length} messages</span>
                              <div className="reply-text-container">
                                {replyTo.map((msg, index) => (
                                  <p key={index} className="reply-text">
                                    {msg.content}
                                  </p>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="reply-user">{replyTo.sender === "You" ? "You" : replyTo.sender}</span>
                              <div className="reply-text-container">
                                <p className="reply-text">{replyTo.text}</p>
                              </div>
                            </>
                          )}
                        </div>
                        <button className="close-reply" onClick={() => setReplyTo(null)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    )}


                    <div className="chat-input d-flex align-items-center  p-2 bg-light shadow-sm" >
                      <button onClick={() => document.getElementById("fileInput").click()} className="btn btn-light attach-btn me-2">
                        <FaPaperclip size={20} />
                      </button>
                      <input id="fileInput" type="file" multiple onChange={handleFileChange} style={{ display: "none" }} />
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="chat-textarea"
                      />




                      <button
                        onClick={selectedFiles.length > 0 ? handleFileUpload : handleSendMessage}
                        className="btn text-white send-btn ms-2 rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: "40px", height: "40px", background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                        }}
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </div>
                </div>

              </>
            ) : (
              <div className="welcome-message p-5">
                <h4>Welcome to Nasiwak Messenger</h4>
                <p>Start a conversation by selecting a user or group.</p>
              </div>
            )}
          </div>



        </div>
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />
      </div>








      {/* modal for add group */}
      <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <p
                className="modal-title fw-bold"
                id="exampleModalLabel"
                style={{
                  background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Create New Group
              </p>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div className="modal-body">
              {/* Group Name Input */}
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control p-2 shadow-sm"
                  placeholder="Enter Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    transition: "all 0.3s ease-in-out",
                  }}
                  onFocus={(e) => (e.target.style.border = "1px solid #6a11cb")}
                  onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
                />
              </div>

              {/* Add People Section */}
              <div>
                <h6 className="fw-bold">Select Members:</h6>
                <div className="mt-2">
                  <ul className="list-unstyled">
                    {chatUsers.map((user) => (
                      <li
                        key={user.id}
                        className="d-flex align-items-center p-2 rounded shadow-sm mb-2"
                        style={{
                          background: selectedMembers.includes(user.id) ? "linear-gradient(135deg, rgba(107, 17, 203, 0.5), rgba(37, 116, 252, 0.45))" : "#f8f9fa",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onClick={() => handleMemberSelection(user.id)}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user.id)}
                          onChange={() => handleMemberSelection(user.id)}
                          onClick={() => handleMemberSelection(user.id)}
                          className="form-check-input me-2"
                        />

                        {/* User Avatar */}
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold me-2"
                          style={{
                            width: "30px",
                            height: "30px",
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Username */}
                        <span className="fw-bold">{user.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button
                type="button"
                className="btn text-white"
                onClick={handleCreateGroup}
                style={{ background: "linear-gradient(135deg, #6a11cb, #2575fc)" }}
                data-bs-dismiss="modal"
              >
                Create Group
              </button>
            </div>
          </div>

        </div>
      </div>




      <div
        className="modal fade"
        id="staticBackdrop"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabIndex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="staticBackdropLabel">
                Forward Message
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div>
                <p className="fw-bold">Select Members:</p>
                <div className="mt-2">
                  <ul className="list-unstyled">
                    {/* Render Users */}
                    {chatUsers.map((user) => (
                      <li
                        key={`user_${user.id}`}
                        className="d-flex align-items-center p-2 rounded shadow-sm mb-2"
                        style={{
                          background: selectedMembers.includes(`user_${user.id}`)
                            ? "linear-gradient(135deg, rgba(107, 17, 203, 0.5), rgba(37, 116, 252, 0.45))"
                            : "#f8f9fa",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onClick={() => handleMemberSelectionForward(user.id, "user")}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(`user_${user.id}`)}
                          onChange={() => handleMemberSelectionForward(user.id, "user")}
                          className="form-check-input me-2"
                        />
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold me-2"
                          style={{
                            width: "30px",
                            height: "30px",
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="fw-bold">{user.name}</span>
                      </li>
                    ))}

                    {/* Render Groups */}
                    <p className="fw-bold mt-2">Select Groups:</p>
                    {groups.map((group) => (
                      <li
                        key={`group_${group.id}`}
                        className="d-flex align-items-center p-2 rounded shadow-sm mb-2"
                        style={{
                          background: selectedMembers.includes(`group_${group.id}`)
                            ? "linear-gradient(135deg, rgba(107, 17, 203, 0.5), rgba(37, 116, 252, 0.45))"
                            : "#f8f9fa",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onClick={() => handleMemberSelectionForward(group.id, "group")}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(`group_${group.id}`)}
                          onChange={() => handleMemberSelectionForward(group.id, "group")}
                          className="form-check-input me-2"
                        />
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold me-2"
                          style={{
                            width: "30px",
                            height: "30px",
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                          }}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="fw-bold">{group.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button
                type="button"
                className="btn text-white"
                onClick={() => handleForwardMessage(selectedMembers)}
                style={{ background: "linear-gradient(135deg, #6a11cb, #2575fc)" }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};


// Append custom styles for spinner/incoming call popup if needed
// (You can remove this if you’re not doing popups at all)
const styleTag = document.createElement("style");
styleTag.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleTag);
export default ChatPage;


// this is only the msg part 