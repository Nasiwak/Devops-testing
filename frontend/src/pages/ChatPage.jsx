import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaPaperPlane, FaPaperclip, FaVideo, FaPhone, FaPhoneSlash, FaUsers } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// import TopNavbar from "../components/Navbar";
import { FiCameraOff } from "react-icons/fi";
import { connect, createLocalTracks } from "twilio-video";
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import { Home, Settings, FileText, Menu, LogOut, Compass } from "lucide-react";
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
import MessageList from './MessageList';
import EmojiPicker from 'emoji-picker-react';
import MobileHome from "./MobileHome";



/**
 *  ChatPage component: handles text chat, user search, and file attachments.
 *  All WebRTC/call-related code has been removed.
 */
const ChatPage = () => {

    const [remoteTracks, setRemoteTracks] = useState([]);

    const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(null);

    // const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
    const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);

    const loggedIn_User = localStorage.getItem('loggedInUser')

    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [forwardFrom, setForwardFrom] = useState(null);


    // ---------- Basic state for user + chat ----------
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loggedInUserId, setLoggedInUserId] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState({});
    const [input, setInput] = useState("");
    console.log("msg:", messages)

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
    // const API_BASE_URL = "https://192.168.5.27/api";
    // const API_BASE_URL = "http://127.0.0.1:8000/api";
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
        localStorage.removeItem('user_email');
        localStorage.removeItem('chatUsers');
        localStorage.removeItem('is_admin');

        window.location.href = "/login";
    };

    const chatPopover = (
        <Popover id="chat-pop">
            <Popover.Body className="d-flex flex-column popover-body-custom">
                <Button className="chat-option-btn" onClick={() => { handlePrivateChat(); setShowPopover(false); }}>Private Chat</Button>
                <Button className="chat-option-btn" onClick={() => { handleGroupChat(); setShowPopover(false); }} >Group Chat</Button>
                <Button className="chat-option-btn" onClick={() => { handleAllChat(); setShowPopover(false); }}>All Chat</Button>

                <Button type="button" className="chat-option-btn" data-bs-toggle="modal" data-bs-target="#exampleModal" onClick={() => setShowPopover(false)}>Create Group</Button>
            </Popover.Body>

        </Popover>
    )

    let lastDate = null;

    const handleChatIconClick = () => {
        if (notiSpace) {
            setNotiSpace(false)
            setActiveChat('all')
            setShowPopover(false)
        } else {
            setShowPopover(!showPopover)
        }
    }

    const handleNotificationBtn = () => {
        setNotiSpace(true)
        setActiveChat('')
        console.log("hello")
    }

    // notification 
    const [notificationlist, setnotificationlist] = useState([])
    // console.log("notilist", notificationlist)




    useEffect(() => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            if (!globalSocketRef.current || globalSocketRef.current.readyState !== WebSocket.OPEN) {
                setupGlobalWebSocket();  // ✅ Ensure the global WebSocket stays connected
            }
        }
        fetchGroups();
    }, [loggedInUserId]);

    async function fetchNotificationMsg() {
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



        const wsUrl = `wss://13.232.126.102/ws/chat/${roomName}/`;
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

                case "delete_message":
                    setMessages((prev) => {
                        const chatKey = selectedUser ? `${selectedUser.id}` : `group_${selectedGroup.id}`;
                        return {
                            ...prev,
                            [chatKey]: prev[chatKey]?.filter((msg) => msg.msg_id !== msgData.id)
                        };
                    });
                    break;

                case "edit_message":
                    const editedMsgId = msgData.id;
                    const newText = msgData.new_text;

                    const chatKey = selectedUser
                        ? `${selectedUser.id}`
                        : `${selectedGroup.id}`;

                    setMessages((prev) => {
                        const updated = { ...prev };
                        if (updated[chatKey]) {
                            updated[chatKey] = updated[chatKey].map((msg) =>
                                msg.msg_id === editedMsgId
                                    ? { ...msg, text: newText, edited: true }
                                    : msg
                            );
                        }
                        return updated;
                    });
                    break;
                case "edit_group_message":
                    setMessages(prev => {
                        const key = `group_${selectedGroup.id}`;
                        return {
                            ...prev,
                            [key]: prev[key].map(msg =>
                                msg.msg_id === msgData.id ? { ...msg, text: msgData.new_text, edited: true } : msg
                            ),
                        };
                    });
                    break;

                case "delete_group_message":
                    setMessages((prev) => {
                        const chatKey = selectedUser ? `${selectedUser.id}` : `${selectedGroup.id}`;
                        return {
                            ...prev,
                            [chatKey]: prev[chatKey]?.filter((msg) => msg.msg_id !== msgData.id)
                        };
                    });
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

    const [callType, setCallType] = useState('audio'); // 'audio' or 'video'


    const setupGlobalWebSocket = () => {
        if (!loggedInUserId) return;

        const wsUrl = `wss://13.232.126.102/ws/chat/user/${loggedInUserId}/`;
        console.log("🌐 Connecting to Global WebSocket:", wsUrl);

        globalSocketRef.current = new WebSocket(wsUrl);

        globalSocketRef.current.onopen = () => {
            console.log("✅ Global WebSocket connected for user:", loggedInUserId);
        };



        globalSocketRef.current.onmessage = (event) => {
            const msgData = JSON.parse(event.data);
            console.log("📩 Global WebSocket message received:", msgData);


            if (msgData.type === "call_ended") {
                if (msgData.receiver === loggedInUserId || msgData.caller === loggedInUserId) {
                    console.log("📴 Call ended by remote user. Cleaning up...");
                    endCall();
                    videoRoom.disconnect();
                    toast.info("The other person ended the call.");
                }
            }

            // if (msgData.type === "incoming_call") {
            //     console.log("📞 Incoming call from:", msgData.caller);

            //     if (!isCallActive && msgData.receiver == loggedInUserId) {
            //         setCaller(msgData.caller);
            //         setIncomingCall(true);
            //         setIsVideoCall(msgData.call_type === 'video');

            //         // playRingtone();
            //         if (msgData.call_type === 'video') {
            //             playVideoRingtone();
            //         } else {
            //             playAudioRingtone();
            //         }
            //     } selectedUser
            // }
            // In setupGlobalWebSocket, modify the incoming_call handler:
            // if (msgData.type === "incoming_call") {
            //     console.log("📞 Incoming call from:", msgData.caller);

            //     if (!isCallActive && msgData.receiver == loggedInUserId) {
            //         setCaller(msgData.caller);
            //         setIncomingCall(true);
            //         setIsVideoCall(msgData.call_type === 'video' || msgData.is_video_call);

            //         // Update UI state to show correct call type
            //         setCallType(msgData.call_type || (msgData.is_video_call ? 'video' : 'audio'));

            //         // Play appropriate ringtone
            //         if (msgData.call_type === 'video' || msgData.is_video_call) {
            //             playVideoRingtone();
            //         } else {
            //             playAudioRingtone();
            //         }
            //     }
            // }

            // In setupGlobalWebSocket, modify the incoming_call handler:
if (msgData.type === "incoming_call") {
    console.log("📞 Incoming call from:", msgData.caller);
    
    if (!isCallActive && msgData.receiver == loggedInUserId) {
        setCaller(msgData.caller);
        setIncomingCall(true);
        
        // Handle both old and new message formats
        const callType = msgData.call_type || (msgData.is_video_call ? 'video' : 'audio');
        setIsVideoCall(callType === 'video');
        setCallType(callType); // Store the call type
        
        // Play appropriate ringtone
        if (callType === 'video') {
            playVideoRingtone();
        } else {
            playAudioRingtone();
        }
    }
}

            // Handle "Add Person to Call" invitation
            if (msgData.type === "call_invite" && msgData.receiver === loggedInUserId) {
                console.log("👥 Received call invite from:", msgData.caller, "Room:", msgData.room);

                // Prompt the user to join the call
                const accept = window.confirm(`📞 ${msgData.caller} invited you to join a video call. Accept?`);
                if (accept) {
                    startCallWithRoom(msgData.room); // This function joins the given Twilio room
                } else {
                    console.log("❌ User declined the call invite.");
                }
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

                if (localStorage.getItem("selectedUser")) {
                    let a = JSON.parse(localStorage.getItem("selectedUser"))
                } else {
                    let a = JSON.parse(localStorage.getItem("selectedGroup"))
                }


                console.log("local selected user: ", a.id)
                if (msgData.sender === a.id && msgData.forward_from != null) {
                    console.log("logging ", msgData.forward_from)
                    const isSender = false;
                    const chatKey = msgData.sender;

                    const newMsg = {
                        msg_id: msgData.id,
                        sender: msgData.sender_name || "Unknown",
                        text: msgData.text || "",
                        file_url: msgData.file_url || "",
                        isSender,
                        timestamp: msgData.timestamp || new Date().toLocaleString(),
                        msg_reacted: msgData.reactions || [],
                        reply_to: msgData.reply_to || [],
                        forward_msg: msgData.forward_from || null,
                    };

                    setMessages((prev) => ({
                        ...prev,
                        [chatKey]: [...(prev[chatKey] || []), newMsg],
                    }));

                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 100);

                }
            }

        };

        globalSocketRef.current.onclose = () => {
            console.warn("⚠️ Global WebSocket disconnected! Reconnecting...");
            setTimeout(setupGlobalWebSocket, 2000);
        };
    };



    const openInviteModal = () => setShowInviteModal(true);
    const closeInviteModal = () => setShowInviteModal(false);

    const inviteToCall = (user) => {
        if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
            globalSocketRef.current.send(
                JSON.stringify({
                    type: "call_invite",
                    caller: loggedInUserId,
                    receiver: user.id,
                    room: videoRoom.name, // Use the existing room name
                })
            );
            console.log(`📞 Invited ${user.name} to join room: ${videoRoom.name}`);
        }
        closeInviteModal();
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

            // ✅ Attach local video
            const localVideoTrack = localTracks.find(t => t.kind === "video");
            if (localVideoTrack) {
                const attachLocalVideo = () => {
                    if (videoRef.current) {
                        videoRef.current.innerHTML = ""; // Clear old video elements
                        const videoElement = localVideoTrack.attach();

                        // Optional: mirror & fit properly
                        videoElement.style.width = "100%";
                        videoElement.style.height = "100%";
                        videoElement.style.objectFit = "contain";
                        videoElement.style.transform = "scaleX(-1)";

                        videoRef.current.appendChild(videoElement);
                        console.log("✅ Local video attached successfully!");
                    } else {
                        console.warn("⚠️ videoRef not ready, retrying...");
                        setTimeout(attachLocalVideo, 100);
                    }
                };

                attachLocalVideo();
            }

            // Setup remote participant handling
            room.participants.forEach(handleParticipantTracks);
            room.on("participantConnected", handleParticipantTracks);
            room.on("participantDisconnected", participant => {
                setRemoteTracks(prev => prev.filter(t => t.participantSid !== participant.sid));
            });

        } catch (err) {
            console.error("❌ Error joining room:", err);
            alert("Failed to join the call.");
        }
    }

    const [isVideoCall, setIsVideoCall] = useState(false);

    // Function to start a video call
    async function startCall(callType = 'video') {
        if (!selectedUser && !incomingCall && !selectedGroup) {
            return alert("Select a user or group first!");
        }
        let roomName;
        if (incomingCall) {
            roomName = loggedInUserId > caller
                ? `${caller}-${loggedInUserId}`
                : `${loggedInUserId}-${caller}`;
        } else {
            if (selectedGroup) {
                roomName = `Group_${selectedGroup.id}`;
            } else {
                roomName = loggedInUserId > selectedUser.id
                    ? `${selectedUser.id}-${loggedInUserId}`
                    : `${loggedInUserId}-${selectedUser.id}`;
            }
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
            // const localTracks = await createLocalTracks({
            //     audio: true, // Simplified audio constraints
            //     video: true  // Simplified video constraints
            // });
            const localTracks = await createLocalTracks({
                audio: true, // Simplified audio constraints
                video: callType === 'video'
            });
            const audioTrack = localTracks.find(track => track.kind === "audio");
            const videoTrack = localTracks.find(track => track.kind === "video");

            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);
            setIsVideoCall(callType === 'video');
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

            // if (localVideoTrack) {
            //     const attachLocalVideo = () => {
            //         if (videoRef.current) {
            //             videoRef.current.innerHTML = ""; // Clear old video elements
            //             const videoElement = localVideoTrack.attach();

            //             // Ensure full video is visible
            //             videoElement.style.width = "100%";
            //             videoElement.style.height = "100%";
            //             videoElement.style.objectFit = "contain";  // Prevents cropping
            //             videoElement.style.transform = "scaleX(-1)";  // Optional: Mirror effect

            //             videoRef.current.appendChild(videoElement);
            //             console.log("✅ Local video attached successfully!");
            //         } else {
            //             console.error("❌ videoRef.current is NULL. Retrying...");
            //             setTimeout(attachLocalVideo, 100); // Retry after 100ms
            //         }
            //     };

            //     attachLocalVideo();
            // } else {
            //     console.error("❌ Could not find local video track");
            // }
            if (callType === 'video' && videoTrack) {
                const attachLocalVideo = () => {
                    if (videoRef.current) {
                        videoRef.current.innerHTML = "";
                        const videoElement = videoTrack.attach();
                        videoElement.style.width = "100%";
                        videoElement.style.height = "100%";
                        videoElement.style.objectFit = "contain";
                        videoElement.style.transform = "scaleX(-1)";
                        videoRef.current.appendChild(videoElement);
                    } else {
                        setTimeout(attachLocalVideo, 100);
                    }
                };
                attachLocalVideo();
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


            room.on('participantDisconnected', participant => {
                console.log(`${participant.identity} left the room`);

                const participantEl = document.getElementById(`participant-${participant.sid}`);
                if (participantEl) {
                    participantEl.remove();
                }

                if (room.participants.size === 0) {
                    endCall();
                }
            });



            if (!incomingCall && globalSocketRef.current?.readyState === WebSocket.OPEN) {
                globalSocketRef.current.send(
                    JSON.stringify({
                        // type: "incoming_call",
                        // call_type: callType, 
                        // caller: loggedInUserId,
                        // receiver: selectedGroup ? null : selectedUser.id,
                        // group_id: selectedGroup?.id || null,
                        // type: "incoming_call",
                        // call_type: callType,  // Make sure this is included
                        // caller: loggedInUserId,
                        // caller_name: loggedInUser,  // Add caller name for display
                        // receiver: selectedGroup ? null : selectedUser.id,
                        // group_id: selectedGroup?.id || null,
                        // is_video_call: callType === 'video'

                        type: "incoming_call",
        call_type: callType,  // 'video' or 'audio'
        is_video_call: callType === 'video', // Explicit boolean
        caller: loggedInUserId,
        caller_name: loggedInUser, // For display purposes
        receiver: selectedGroup ? null : selectedUser.id,
        group_id: selectedGroup?.id || null
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

    // function handleTrackSubscribed(track, participant) {
    //     console.log("✅ Track subscribed:", track.kind);

    //     if (track.kind === "video") {
    //         setRemoteTracks(prev => {
    //             const alreadyExists = prev.some(t => t.participantSid === participant.sid);
    //             if (alreadyExists) return prev;
    //             return [...prev, { track, participantSid: participant.sid, identity: participant.identity }];
    //         });
    //     } else if (track.kind === "audio") {
    //         const audioElement = track.attach();
    //         audioElement.style.display = "none";
    //         document.body.appendChild(audioElement);
    //     }
    // }
    function handleTrackSubscribed(track, participant) {
        console.log(`✅ ${track.kind} track subscribed from ${participant.identity}`);
    
        if (track.kind === "video") {
            setRemoteTracks(prev => {
                // Check if we already have a video track from this participant
                const existingIndex = prev.findIndex(
                    t => t.participantSid === participant.sid && t.track.kind === "video"
                );
    
                // If track exists, replace it (in case of track change)
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = { 
                        track, 
                        participantSid: participant.sid, 
                        identity: participant.identity 
                    };
                    return updated;
                }
                
                // Add new video track
                return [...prev, { 
                    track, 
                    participantSid: participant.sid, 
                    identity: participant.identity 
                }];
            });
            
            // Immediately attach to DOM if possible
            attachVideoTrack(track, participant.sid);
        } 
        else if (track.kind === "audio") {
            // Handle audio tracks
            const audioElement = track.attach();
            audioElement.style.display = "none";
            document.body.appendChild(audioElement);
        }
    }
    
    // Helper function to attach video tracks
    function attachVideoTrack(track, participantSid) {
        const container = document.querySelector(`.remote-videos-grid`);
        if (!container) return;
    
        // Find or create video element for this participant
        let videoContainer = document.getElementById(`video-${participantSid}`);
        if (!videoContainer) {
            videoContainer = document.createElement('div');
            videoContainer.id = `video-${participantSid}`;
            videoContainer.className = 'video-frame';
            
            const videoContent = document.createElement('div');
            videoContent.className = 'video-content';
            videoContainer.appendChild(videoContent);
            
            const badge = document.createElement('span');
            badge.className = 'video-badge';
            badge.textContent = participant.identity;
            videoContainer.appendChild(badge);
            
            container.appendChild(videoContainer);
        }
    
        // Attach the video track
        const videoElement = track.attach();
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover";
        
        const videoContent = videoContainer.querySelector('.video-content');
        videoContent.innerHTML = '';
        videoContent.appendChild(videoElement);
    }


    // function handleTrackSubscribed(track, participant) {
    //     console.log("✅ Track subscribed:", track.kind);
    //     const trackElement = track.attach();

    //     if (track.kind === "video") {
    //         if (remoteVideoRef.current) {
    //             remoteVideoRef.current.innerHTML = "";
    //             remoteVideoRef.current.appendChild(trackElement);
    //             trackElement.style.width = "100%";
    //             trackElement.style.height = "100%";
    //             trackElement.style.objectFit = "contain";
    //             console.log("✅ Remote video track attached successfully!");
    //             setIsRemoteCameraOff(!track.isEnabled);

    //             // 🛜 Detect camera ON/OFF
    //             const videoStatusEl = document.getElementById("remote-video-status");
    //             if (videoStatusEl) {
    //                 videoStatusEl.textContent = track.isEnabled ? "📷 Camera On" : "📷 Camera Off";

    //                 track.on("disabled", () => {
    //                     setIsRemoteCameraOff(true);
    //                     console.log("📷 Remote camera turned OFF");
    //                     videoStatusEl.textContent = "📷 Camera Off";
    //                 });

    //                 track.on("enabled", () => {
    //                     setIsRemoteCameraOff(false);
    //                     console.log("📷 Remote camera turned ON");
    //                     videoStatusEl.textContent = "📷 Camera On";
    //                 });
    //             }
    //         } else {
    //             console.error("❌ remoteVideoRef.current is NULL. Retrying...");
    //             setTimeout(() => handleTrackSubscribed(track, participant), 100); // Retry
    //         }
    //     }
    //     else if (track.kind === "audio") {
    //         trackElement.style.display = "none";
    //         document.body.appendChild(trackElement);
    //         console.log("✅ Remote audio track attached successfully!");
    //         setIsRemoteAudioMuted(!track.isEnabled);

    //         // 🔊 Detect mute/unmute
    //         const audioStatusEl = document.getElementById("remote-audio-status");
    //         if (audioStatusEl) {
    //             audioStatusEl.textContent = track.isEnabled ? "🔊 Unmuted" : "🔇 Muted";

    //             track.on("disabled", () => {
    //                 setIsRemoteAudioMuted(true);
    //                 console.log("🔇 Remote user muted");
    //                 audioStatusEl.textContent = "🔇 Muted";
    //             });

    //             track.on("enabled", () => {
    //                 setIsRemoteAudioMuted(false);
    //                 console.log("🔊 Remote user unmuted");
    //                 audioStatusEl.textContent = "🔊 Unmuted";
    //             });
    //         }
    //     }
    // }
    // function handleTrackSubscribed(track, participant) {
    //     console.log("✅ Track subscribed:", track.kind);
    //     const trackElement = track.attach();

    //     if (track.kind === "video") {
    //         const container = document.getElementById("remote-video-container");

    //         if (container) {
    //             // Create a wrapper div for this participant
    //             const wrapper = document.createElement("div");
    //             wrapper.className = "video-box shadow";
    //             wrapper.style.width = "300px";
    //             wrapper.style.height = "200px";
    //             wrapper.style.position = "relative";
    //             wrapper.style.backgroundColor = "#222";
    //             wrapper.id = `participant-${participant.sid}`;

    //             // Add participant name tag
    //             const nameTag = document.createElement("span");
    //             nameTag.textContent = participant.identity;
    //             nameTag.style.position = "absolute";
    //             nameTag.style.top = "5px";
    //             nameTag.style.left = "5px";
    //             nameTag.style.color = "#fff";
    //             nameTag.style.background = "rgba(0,0,0,0.5)";
    //             nameTag.style.padding = "2px 6px";
    //             nameTag.style.fontSize = "12px";
    //             nameTag.style.borderRadius = "4px";

    //             // Style video track
    //             trackElement.style.width = "100%";
    //             trackElement.style.height = "100%";
    //             trackElement.style.objectFit = "contain";

    //             wrapper.appendChild(nameTag);
    //             wrapper.appendChild(trackElement);
    //             container.appendChild(wrapper);
    //         }
    //     } else if (track.kind === "audio") {
    //         trackElement.style.display = "none";
    //         document.body.appendChild(trackElement);
    //     }
    // }




    function handleTrackUnsubscribed(track) {
        console.log("Track unsubscribed:", track.kind);
        track.detach().forEach(el => el.remove());

        setRemoteTracks(prev => prev.filter(t => t.track !== track));
    }



    // async function acceptCall() {
    //     setIncomingCall(false);
    //     console.log("📞 Accepting call from caller ID:", caller);

    //     const callerUser = chatUsers.find(user => user.id === caller);
    //     if (callerUser) {
    //         setSelectedUser(callerUser);
    //     }
    //     await startCall(callType);


    // }
    async function acceptCall() {
        try {
            setIncomingCall(false);
            console.log("📞 Accepting", callType, "call from:", caller);
    
            // Find and set caller if available
            const callerUser = chatUsers.find(user => user.id === caller);
            if (callerUser) setSelectedUser(callerUser);
    
            // Start the call with the correct type
            await startCall(callType);
    
            // Notify caller that call was accepted
            if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
                globalSocketRef.current.send(
                    JSON.stringify({
                        type: "call_accepted",
                        receiver: caller,
                        sender: loggedInUserId
                    })
                );
            }
        } catch (error) {
            console.error("Error accepting call:", error);
            setIncomingCall(true); // Show call UI again if failed
            toast.error("Failed to accept call");
        }
    }

    function declineCall() {
        setIncomingCall(false);

    }

    const scrollToMessage = (id) => {
        console.log("its scrolling ")
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



    function endCall() {
        if (videoRoom) {


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
            // Properly disconnect from the Twilio room
            videoRoom.disconnect();

            setVideoRoom(null);
        }

        setIsCallActive(false);
        setShowChat(false)


        setIsMicMuted(false)
        setIsCameraOff(false)


        // Clear video containers
        if (videoRef.current) {
            videoRef.current.innerHTML = "";
        }
        // if (remoteVideoRef.current) {
        //   remoteVideoRef.current.innerHTML = "";
        // }

        // Notify the other participant about call ending
        if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
            globalSocketRef.current.send(
                JSON.stringify({
                    type: "call_ended",
                    receiver: selectedUser?.id,
                    sender: loggedInUserId
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
        const senderName = isSender ? "You" : msg.username || "Unknown";

        // If multiple files
        const incomingFiles = msg.files || [];

        const newMessages = incomingFiles.map(file => ({
            sender: senderName,
            file_url: file.file_url,
            file_name: file.file_name.split("/").pop(),
            isSender,
            text: msg.message || "",  // Same message caption for all
            timestamp: msg.timestamp || new Date().toLocaleString(),
            reply_to: msg.reply_to || null,
            forward_msg: msg.forward_from || null,
        }));

        setMessages(prev => ({
            ...prev,
            [chatKey]: [...(prev[chatKey] || []), ...newMessages], // Append multiple files
        }));

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }


    function handleIncomingChat(msg) {
        const isSender = msg.sender === loggedInUserId;
        const otherUserId = selectedUser ? selectedUser.id : selectedGroup.id;

        if (msg.forward_from != null && msg.receiver != otherUserId) {
            return
        }

        if (!isSender && otherUserId) {
            console.log("message changing : ", msg)
            updateMessage(msg.id, null, true);
        }

        console.log("Logging sender , other and msg", isSender, otherUserId, msg)
        setMessages((prev) => ({
            ...prev,
            [otherUserId]: [
                ...(prev[otherUserId] || []),
                {
                    msg_id: msg.id,
                    sender: isSender ? "You" : msg.username || "Them",
                    text: msg.message || "",
                    file_url: msg.file_url || "",
                    isSender,
                    timestamp: msg.timestamp || new Date().toLocaleString(),
                    msg_reacted: msg.reactions,
                    reply_to: msg.reply_to || null,
                    // forward_msg: msg.forward_from || null,
                },
            ],
        }));



        // Scroll down after receiving a message
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

    }

    // function handleIncomingChat(msg) {
    //     const chatKey = selectedUser ? selectedUser.id : selectedGroup.id;
    //     const isSender = msg.sender === loggedInUserId;
    //     const isReceiver = msg.receiver === chatKey;

    //     if (!isSender && !isReceiver) {
    //       console.warn("⚠️ Message does not belong to current chat. Skipping display.");
    //       return;
    //     }

    //     const senderName = isSender ? "You" : msg.username || "Unknown";

    //     const newMessage = {
    //       msg_id: msg.id,
    //       sender: senderName,
    //       text: msg.message || "",
    //       file_url: msg.file_url || "",
    //       isSender,
    //       timestamp: msg.timestamp || new Date().toLocaleString(),
    //       reply_to: msg.reply_to || null,
    //       forward_from: msg.forward_from || null,
    //     };

    //     setMessages((prev) => ({
    //       ...prev,
    //       [chatKey]: [...(prev[chatKey] || []), newMessage],
    //     }));

    //     setTimeout(() => {
    //       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    //     }, 100);
    //   }






    // async function handleSendMessage(e) {
    //     if (!input.trim() || (!selectedUser && !selectedGroup)) return;
    //     const token = localStorage.getItem("token");
    //         // 🔥 Move editMode logic here first
    //         if (editMode && selectedEdit) {
    //             console.log("Editing existing message...");

    //             const url = `${API_BASE_URL}/chat/api/messages/${selectedEdit.msg_id}/update/`;

    //             try {
    //                 const editResp = await fetch(url, {
    //                     method: "PATCH",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                         Authorization: `Bearer ${token}`,
    //                     },
    //                     body: JSON.stringify({ content: input }),
    //                 });

    //                 const editData = await editResp.json();
    //                 console.log("Edit response:", editData);

    //                 setInput("");
    //                 setEditMode(false);
    //                 setSelectedEdit(null);
    //                 setReplyTo(null);

    //                 if (textareaRef.current) {
    //                     textareaRef.current.style.height = "60px";
    //                 }

    //                 // ✅ Real-time WebSocket broadcast
    //                 if (editResp.ok && socketRef.current?.readyState === WebSocket.OPEN) {
    //                     socketRef.current.send(
    //                         JSON.stringify({
    //                             type: "edit_message",
    //                             id: selectedEdit.msg_id,
    //                             new_text: input,
    //                             edited: true,  // Optional: used to mark as (edited) in UI
    //                             chat_key: selectedUser
    //                                 ? `${selectedUser.id}`
    //                                 : `group_${selectedGroup.id}`, // optional for clarity
    //                         })
    //                     );
    //                 }

    //                 return; // ✅ Exit after edit
    //             } catch (err) {
    //                 console.error("Error editing message:", err);
    //                 return;
    //             }
    //         }

    //     const formData = new FormData();

    //     formData.append("sender", loggedInUserId);
    //     formData.append("content", input)

    //     // if (replyTo?.msg_id) {
    //     //     formData.append("reply_to", replyTo.msg_id);
    //     // }

    //     if (Array.isArray(replyTo)) {
    //         replyTo.forEach((msg) => {
    //             if (msg?.msg_id || msg?.id) {
    //                 formData.append("reply_to", msg.msg_id );
    //             }
    //         });
    //     } else if (replyTo?.msg_id || replyTo?.id) {
    //         formData.append("reply_to", replyTo.msg_id );
    //     }

    //     if (forwardFrom?.msg_id || forwardFrom?.id) {
    //         formData.append("forward_from", forwardFrom.msg_id || forwardFrom.id);
    //     }

    //     // if (Array.isArray(replyTo)) {
    //     //     console.log("Multiple replies selected", replyTo);
    //     //     const replyIds = replyTo.map(msg => msg?.msg_id || msg?.id);
    //     //     formData.append("reply_to", JSON.stringify(replyIds));
    //     //   } else if (replyTo?.msg_id || replyTo?.id) {
    //     //     console.log("Single reply selected", replyTo);
    //     //     formData.append("reply_to", JSON.stringify([replyTo.msg_id || replyTo.id]));
    //     //   }



    //     selectedFiles.forEach((file) => formData.append("files", file));
    //     selectedFiles.forEach((file) => formData.append("file_names", file.name));

    //     try {
    //         let url;
    //         // console.log("Seleceted Group",selectedGroup,selectedUser)
    //         if (selectedUser) {
    //             formData.append("receiver", selectedUser.id);
    //             url = `${API_BASE_URL}/chat/api/messages/send/`;
    //         } 

    //         else {
    //             url = `${API_BASE_URL}/chat/api/group/${selectedGroup.id}/send-message/`;
    //         }
    //         const resp = await fetch(url, {
    //             method: "POST",
    //             headers: {
    //                 // "Content-Type": "application/json",
    //                 Authorization: `Bearer ${token}`,
    //             },
    //             withCredentials: true,
    //             body: formData
    //         });
    //         const data = await resp.json();
    //         console.log("Message sent response:", data);

    //         setInput("");
    //         setReplyTo(null);
    //         if (textareaRef.current) {
    //             textareaRef.current.style.height = "60px";
    //         }
    //         setHoveredMessageId(null);

    //         setSelectedMessages([]);
    //         setCheckboxVisible({})
    //         setMutipleMsgOption(false)
    //         setTextEmoji(false)
    //         setEditMode(false)
    //         setForwardFrom(null);  // Clear it
    //         const forwardPayload = forwardFrom
    //         ? {
    //             forward_from: {
    //                 id: forwardFrom.msg_id || forwardFrom.id,
    //                 sender_name: forwardFrom.sender_name || forwardFrom.sender || "Unknown",
    //                 content: forwardFrom.text || forwardFrom.content || "",
    //                 file_name: forwardFrom.file_name || null
    //             }
    //             }
    //         : {};


    //         // Also send over WS if open
    //         if (resp.ok && socketRef.current?.readyState === WebSocket.OPEN) {
    //             if (selectedUser) {
    //                 socketRef.current.send(
    //                     JSON.stringify({
    //                         type: "chat_message",
    //                         message: input,
    //                         sender: loggedInUserId,
    //                         receiver: selectedUser.id,
    //                         username: loggedInUser,
    //                         id: data.id,
    //                         reply_to: data.reply_to || null,
    //                         forwardPayload

    //                     })
    //                 );
    //                 if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
    //                     console.log("true in globle 💐💐💐💐 ", globalSocketRef.current?.readyState === WebSocket.OPEN)
    //                     globalSocketRef.current.send(
    //                         JSON.stringify({
    //                             id: data.id,
    //                             type: "new_message",
    //                             sender: loggedInUserId,
    //                             receiver: selectedUser.id,
    //                             sender_name: loggedInUser,
    //                             text: data.content,
    //                             reply_to: data.reply_to || null,
    //                             forwardPayload

    //                         })
    //                     );
    //                 }
    //                 else {
    //                     console.log("false in globle 💐💐💐💐 ", globalSocketRef.current?.readyState === WebSocket.OPEN)
    //                 }

    //             } else if (selectedGroup) {
    //                 console.log("Logging data in group Chat: ", data)
    //                 socketRef.current.send(
    //                     JSON.stringify({
    //                         type: "chat_message",
    //                         message: input,
    //                         sender: loggedInUserId,
    //                         receiver: selectedGroup.id,
    //                         username: loggedInUser,
    //                         id: data.message.id,
    //                         reply_to: data.reply_to || null,
    //                         // forward_from: forwardFrom?.msg_id || forwardFrom?.id || null
    //                         forwardPayload

    //                     })
    //                 );
    //                 // if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
    //                 //   console.log("true in globle 💐💐💐💐 ",globalSocketRef.current?.readyState === WebSocket.OPEN)
    //                 //   globalSocketRef.current.send(
    //                 //     JSON.stringify({
    //                 //       type: "new_message",
    //                 //       sender: loggedInUserId,
    //                 //       receiver: selectedGroup.id,
    //                 //       sender_name: loggedInUser,
    //                 //       text : data.content,
    //                 //     })
    //                 //   );
    //                 // }
    //                 // else{
    //                 //   console.log("false in globle 💐💐💐💐 ",globalSocketRef.current?.readyState === WebSocket.OPEN)
    //                 // }
    //             };

    //         }
    //     } catch (err) {
    //         console.error("Error sending message:", err);
    //     }

    //     // setInput("");
    //     setTimeout(() => {
    //         messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    //     }, 100);
    // }

    function handleDropFiles(files) {
        const validFiles = files.filter(file => file.size <= 100 * 1024 * 1024); // Example: max 100MB
        setSelectedFiles((prev) => [...prev, ...validFiles]);
    }


    async function handleSendMessage(e) {
        if (!input.trim() || (!selectedUser && !selectedGroup)) return;

        const token = localStorage.getItem("token");

        // Handle edit mode
        if (editMode && selectedEdit) {
            let url = ""
            if (selectedGroup) {
                url = `${API_BASE_URL}/chat/api/group-messages/${selectedEdit.msg_id}/update/`;

            } else {
                url = `${API_BASE_URL}/chat/api/messages/${selectedEdit.msg_id}/update/`;
            }

            try {
                const editResp = await fetch(url, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ content: input }),
                });

                const editData = await editResp.json();

                setInput("");
                setEditMode(false);
                setSelectedEdit(null);
                setReplyTo(null);

                if (textareaRef.current) {
                    textareaRef.current.style.height = "60px";
                }

                // Real-time WebSocket broadcast
                if (editResp.ok && socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "edit_message",
                            id: selectedEdit.msg_id,
                            new_text: input,
                            edited: true,
                            chat_key: selectedUser
                                ? `${selectedUser.id}`
                                : `${selectedGroup.id}`,
                        })
                    );
                }

                return;
            } catch (err) {
                console.error("Error editing message:", err);
                return;
            }
        }

        const formData = new FormData();

        formData.append("sender", loggedInUserId);
        formData.append("content", input);

        if (Array.isArray(replyTo)) {
            replyTo.forEach((msg) => {
                if (msg?.msg_id || msg?.id) {
                    formData.append("reply_to", msg.msg_id);
                }
            });
        } else if (replyTo?.msg_id || replyTo?.id) {
            formData.append("reply_to", replyTo.msg_id);
        }

        if (forwardFrom?.msg_id || forwardFrom?.id) {
            formData.append("forward_from", forwardFrom.msg_id || forwardFrom.id);
        }

        selectedFiles.forEach((file) => formData.append("files", file));
        selectedFiles.forEach((file) => formData.append("file_names", file.name));

        try {
            let url;
            if (selectedUser) {
                formData.append("receiver", selectedUser.id);
                url = `${API_BASE_URL}/chat/api/messages/send/`;
            } else {
                url = `${API_BASE_URL}/chat/api/group/${selectedGroup.id}/send-message/`;
            }

            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
                body: formData,
            });

            const data = await resp.json();
            console.log("Responsed", data)

            setInput("");
            setReplyTo(null);
            if (textareaRef.current) {
                textareaRef.current.style.height = "60px";
            }
            setHoveredMessageId(null);
            setSelectedMessages([]);
            setCheckboxVisible({});
            setMutipleMsgOption(false);
            setTextEmoji(false);
            setEditMode(false);
            setForwardFrom(null);

            // Construct forward_from payload
            const forwardFromData = forwardFrom
                ? {
                    id: forwardFrom.msg_id || forwardFrom.id,
                    sender_name: forwardFrom.sender_name || forwardFrom.sender || "Unknown",
                    content: forwardFrom.text || forwardFrom.content || "",
                    file_name: forwardFrom.file_name || null,
                }
                : null;

            // Prepare WebSocket message payload
            const messagePayload = {
                type: "chat_message",
                message: input,
                sender: loggedInUserId,
                receiver: selectedUser?.id || selectedGroup?.id,
                username: loggedInUser,
                id: data.id || data.message?.id,
                reply_to: data.reply_to || null,
                forward_from: forwardFromData


            };

            //   if (forwardFromData) {
            //     messagePayload.forward_from = forwardFromData;
            //   }

            // Send message over WebSocket
            if (resp.ok && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(messagePayload));

                if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
                    globalSocketRef.current.send(
                        JSON.stringify({
                            id: data.id,
                            type: "new_message",
                            sender: loggedInUserId,
                            receiver: selectedUser?.id || selectedGroup?.id,
                            sender_name: loggedInUser,
                            text: data.content,
                            reply_to: data.reply_to || null,
                            forward_from: forwardFromData

                        })
                    );
                }
            }
        } catch (err) {
            console.error("Error sending message:", err);
        }

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }




    function handleKeyPress(e) {
        if (e.key === "Enter") {
            if (e.shiftKey) {

                setTimeout(() => {
                    autoResizeTextarea();
                }, 0);
                return;
            } else {
                e.preventDefault(); // Prevent newline on normal Enter
                selectedFiles.length > 0 ? handleFileUpload(selectedFiles) : handleSendMessage();
                setTextEmoji(false);
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
        formData.append("content", input || "");

        selectedFiles.forEach((file) => formData.append("files", file));
        selectedFiles.forEach((file) => formData.append("file_names", file.name));

        let url;
        if (selectedUser) {
            formData.append("receiver", selectedUser.id);
            url = `${API_BASE_URL}/chat/api/messages/send/`;
        } else {
            url = `${API_BASE_URL}/chat/api/group/${selectedGroup.id}/send-message/`;
        }

        try {
            const resp = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!resp.ok) throw new Error("Failed to upload");

            const data = await resp.json();
            console.log("Uploaded Files:", data);

            // ✅ Correct parsing based on your backend structure
            const uploadedFiles = (data.message || []).map(fileObj => ({
                file_name: fileObj.file_name,
                file_url: fileObj.file
            })) || [];

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(
                    JSON.stringify({
                        type: "file_message",
                        sender: loggedInUserId,
                        username: loggedInUser,
                        message: input,
                        files: uploadedFiles,
                        receiver: selectedUser?.id || null,
                        group_id: selectedGroup?.id || null,
                        timestamp: new Date().toISOString(),
                    })
                );
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
        } catch (error) {
            console.error('Error updating message:', error);
            return
        }

    }

    async function handleUserClick(user) {
        localStorage.setItem("selectedUser", JSON.stringify(user));
        localStorage.removeItem("selectedGroup");


        setSelectedUser(user);

        setSelectedGroup(null);
        setQuery(user.name);
        setUsers([]);
        setInput("")
        setMutipleMsgOption(false)

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
                console.log(chatHistory)

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
                        msg_reacted: m.reactions || [],
                        is_read: m.is_read,
                        reply_to: m.reply_to || null,
                        forward_msg: m.forward_from || null
                    }))
                }));


                localStorage.setItem("messages", JSON.stringify(chatHistory));
                // ✅ Identify unread messages and mark them as read using `updateMessage`
                const unreadMessages = chatHistory.filter(
                    (m) => !m.is_read && m.sender !== loggedInUserId
                );


                setnotificationlist((prevList) =>
                    prevList.filter((n) => n.sender !== user.id)
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
        localStorage.setItem("selectedGroup", JSON.stringify(group));
        localStorage.removeItem("selectedUser");

        setSelectedGroup(group);
        setSelectedUser(null);
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
                        timestamp: m.timestamp,
                        msg_reacted: m.reactions || [],
                        is_read: m.is_read,
                        reply_to: m.reply_to || null,
                        forward_msg: m.forward_from || null
                    })),
                }));

                localStorage.setItem("messages", JSON.stringify(chatHistory));
                localStorage.setItem(`messages_group_${group.id}`, JSON.stringify(chatHistory));
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

    // async function softDeleteMessage(messageId) {
    //     console.log("Deletingggggggg msggggg")
    //     const token = localStorage.getItem("token");
    //     try {
    //       const response = await fetch(`${API_BASE_URL}/chat/api/messages/${messageId}/soft-delete/`, {
    //         method: "DELETE",
    //         headers: {
    //           Authorization: `Bearer ${token}`,
    //           "Content-Type": "application/json",
    //         },
    //       });

    //       if (response.ok) {
    //         // ✅ Remove the message from the current chat immediately
    //         const userId = selectedUser?.id || selectedGroup?.id;
    //         setMessages((prevMessages) => {
    //           const updatedMessages = { ...prevMessages };
    //           updatedMessages[userId] = updatedMessages[userId]?.filter(
    //             (msg) => msg.msg_id !== messageId
    //           );
    //           return updatedMessages;
    //         });

    //         // Optionally: show a toast
    //         // toast.success("Message deleted!", { position: "bottom-right" });
    //       } else {
    //         const data = await response.json();
    //         console.error("Soft delete failed:", data.error);
    //         toast.error("Failed to delete message");
    //       }
    //     } catch (error) {
    //       console.error("Error deleting message:", error);
    //       toast.error("Server error while deleting message");
    //     }
    //   }

    async function softDeleteMessage(messageId) {
        console.log("Deletingggggggg msggggg");

        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${API_BASE_URL}/chat/api/messages/${messageId}/soft-delete/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const userId = selectedUser?.id || selectedGroup?.id;

                // ✅ 1. Remove locally for sender
                setMessages((prevMessages) => {
                    const updatedMessages = { ...prevMessages };
                    updatedMessages[userId] = updatedMessages[userId]?.filter(
                        (msg) => msg.msg_id !== messageId
                    );
                    return updatedMessages;
                });

                // ✅ 2. Send WebSocket event for others
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "delete_message",
                            id: messageId,
                            chat_key: selectedUser
                                ? `${selectedUser.id}`
                                : `group_${selectedGroup.id}`
                        })
                    );
                }

                // Optionally: toast or log
                // toast.success("Message deleted!");
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




    // function startVideoTrack() {
    //   // Logic to enable video track again (using getUserMedia or Twilio's API)
    // }


    // 10/4/25 searchbar functionality


    const [showSearchModal, setShowSearchModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState("");


    // const selectedId = selectedUser?.id || selectedGroup?.id;


    // const matchingIndices = selectedId
    //     ? (messages[selectedId] || []).reduce((acc, msg, idx) => {
    //         const textMatch = msg.text?.toLowerCase().includes(searchTerm.toLowerCase());
    //         const fileNameMatch = msg.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
    //         const fileUrlMatch = msg.file_url?.toLowerCase().includes(searchTerm.toLowerCase());

    //         if (textMatch || fileNameMatch || fileUrlMatch) acc.push(idx);
    //         return acc;
    //     }, [])
    //     : [];

    const selectedId = selectedUser?.id || selectedGroup?.id;

    const matchingIndices = selectedId && Array.isArray(messages[selectedId])
        ? messages[selectedId].reduce((acc, msg, idx) => {
            const textMatch = msg.text?.toLowerCase().includes(searchTerm.toLowerCase());
            const fileNameMatch = msg.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const fileUrlMatch = msg.file_url?.toLowerCase().includes(searchTerm.toLowerCase());

            if (textMatch || fileNameMatch || fileUrlMatch) acc.push(idx);
            return acc;
        }, [])
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
    const [selectedEdit, setSelectedEdit] = useState(null)


    const MsgPopover = ({ messageId, isSender }) => {
        const handleAction = (action) => {
            if (!selectedMessage) return;

            switch (action) {
                case "Edit":


                    setEditMode(true);
                    setSelectedMessage(selectedMessage);
                    setSelectedEdit(selectedMessage)
                    setInput(selectedMessage.text);

                    break;

                case "Reply":
                    setReplyTo(selectedMessage);
                    break;

                case "Copy":
                    navigator.clipboard.writeText(selectedMessage.text);
                    break;


                case "Forward":
                    setForwardMessage(selectedMessage); // Store the message to forward
                    break;


               
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
                    if (selectedMessage?.msg_id && selectedUser) {
                        softDeleteMessage(selectedMessage.msg_id);
                    }
                    else if (selectedMessage?.msg_id && selectedGroup) {
                        handleDeleteMessage(selectedMessage.msg_id);
                    }
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
                            Edit<i class="fa-solid fa-pen-to-square px-2"></i>
                        </button>
                    )}
                    <button className="chat-option-btn" onClick={() => handleAction("Reply")}>
                        Reply  <i class="fa-solid fa-reply-all px-2"></i>
                    </button>
                    <button className="chat-option-btn" onClick={() => handleAction("Copy")}>
                        Copy <i class="fa-solid fa-copy px-2"></i>
                    </button>

                    <button type="button" class="chat-option-btn" onClick={() => handleAction("Forward")} data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                        Forword  <i class="fa-solid fa-share px-2"></i>
                    </button>

                    <button className="chat-option-btn" onClick={() => handleAction("Select_Message")}>
                        Select Message <i class="fa-solid fa-circle-check px-2"></i>
                    </button>
                    {isSender && (
                        <button className="chat-option-btn" onClick={() => handleAction("Delete")}>
                            Delete <i class="fa-solid fa-trash px-2"></i>
                        </button>

                    )}

                    <button className="chat-option-btn" onClick={() => handleAction("Cancel")}>
                        Close
                    </button>
                </div>
            )
        );
    };



    const handlePopoverToggle = (messageId, isOpen, event = null, msg = null) => {
        if (!isOpen) {
            setActiveMessageId(null);
            setSelectedMessage(null);
            return;
        }

        if (!event?.target) return;

        // Get elements and dimensions
        const rect = event.target.getBoundingClientRect();
        const container = showChat ? chatPanelRef.current : document.body;
        const containerRect = container.getBoundingClientRect();
        const textarea = document.querySelector('.chat-input-container');
        const textareaRect = textarea?.getBoundingClientRect();

        const popoverHeight = 200; // estimated popover height
        const popoverWidth = 250; // estimated popover width

        // Calculate available space below message
        const spaceBelow = textareaRect
            ? textareaRect.top - rect.bottom - 10 // space above textarea
            : window.innerHeight - rect.bottom;

        // Calculate position
        if (showChat) {
            // For chat panel
            const topOffset = spaceBelow < popoverHeight
                ? rect.top - containerRect.top - popoverHeight // show above
                : rect.top - containerRect.top + rect.height; // show below

            setPopoverPosition({
                top: topOffset,
                left: Math.min(
                    rect.left - containerRect.left + rect.width / 2,
                    containerRect.width - popoverWidth - 10
                ),
                isSender: String(messageId).startsWith("you"),
                constrained: true
            });
        } else {
            // For main view
            setPopoverPosition({
                top: spaceBelow < popoverHeight
                    ? rect.top - popoverHeight
                    : rect.bottom,
                left: Math.min(
                    rect.left + rect.width / 2,
                    window.innerWidth - popoverWidth - 10
                ),
                isSender: String(messageId).startsWith("you"),
                constrained: false
            });
        }

        setActiveMessageId(messageId);
        setSelectedMessage(msg);
    };






    // const handlePopoverToggle = (messageId, isOpen, event = null, msg = null) => {
    //     if (!isOpen) {
    //         setActiveMessageId(null);
    //         setSelectedMessage(null);
    //         return;
    //     }

    //     if (!event?.target) return;

    //     // Get elements and dimensions
    //     const rect = event.target.getBoundingClientRect();
    //     const container = showChat ? chatPanelRef.current : document.body;
    //     const containerRect = container.getBoundingClientRect();
    //     const textarea = document.querySelector('.chat-input-container');
    //     const textareaRect = textarea?.getBoundingClientRect();

    //     const popoverHeight = 200; // estimated popover height
    //     const popoverWidth = 250; // estimated popover width

    //     // Calculate available space below message
    //     const spaceBelow = textareaRect
    //         ? textareaRect.top - rect.bottom - 10 // space above textarea
    //         : window.innerHeight - rect.bottom;

    //     // Calculate position
    //     if (showChat) {
    //         // For chat panel
    //         const topOffset = spaceBelow < popoverHeight
    //             ? rect.top - containerRect.top - popoverHeight // show above
    //             : rect.top - containerRect.top + rect.height; // show below

    //         setPopoverPosition({
    //             top: topOffset,
    //             left: Math.min(
    //                 rect.left - containerRect.left + rect.width / 2,
    //                 containerRect.width - popoverWidth - 10
    //             ),
    //             isSender: String(messageId).startsWith("you"),
    //             constrained: true
    //         });
    //     } else {
    //         // For main view
    //         setPopoverPosition({
    //             top: spaceBelow < popoverHeight
    //                 ? rect.top - popoverHeight
    //                 : rect.bottom,
    //             left: Math.min(
    //                 rect.left + rect.width / 2,
    //                 window.innerWidth - popoverWidth - 10
    //             ),
    //             isSender: String(messageId).startsWith("you"),
    //             constrained: false
    //         });
    //     }

    //     setActiveMessageId(messageId);
    //     setSelectedMessage(msg);
    // };




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

            setReplyTo([...selectedMessages]);
        }
        setMultipopup(false);
        console.log("Replying to:", selectedMessages);
    };

    const handleMultipleMsgDelete = async () => {
        console.log("Selected messages to delete:", selectedMessages);

        setMultipopup(false);
        setCheckboxVisible({});
        setSelectedMembers([]);
        setMutipleMsgOption(false)

        // Loop through each selected message and delete it
        for (const message of selectedMessages) {
            if (message?.msg_id) {
                if (selectedUser) {
                    await softDeleteMessage(message.msg_id);
                } else if (selectedGroup) {
                    await handleDeleteMessage(message.msg_id);
                }
            }
        }

        setSelectedMessages([]);
    };



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

   


  



    const handleForwardMessage = async () => {
        if ((!forwardMessage && selectedMessages.length === 0) || selectedMembers.length === 0) {
            alert("Please select at least one user/group and one message to forward.");
            return;
        }
        console.log("forward msg: ", forwardMessage, selectedMessages)

        const token = localStorage.getItem("token");
        // const forwardList = forwardMessage ? [forwardMessage] : selectedMessages;
        const forwardList = forwardMessage ? Array.isArray(forwardMessage) ? forwardMessage : [forwardMessage] : selectedMessages;

        for (const rawMember of selectedMembers) {
            let member;

            if (typeof rawMember === "string") {
                const [prefix, id] = rawMember.split("_");
                member = {
                    id,
                    type: prefix === "group" ? "group" : "user",
                    name: rawMember,
                };
            } else {
                member = rawMember;
            }

            for (const msg of forwardList) {
                const formData = new FormData();

                const forwardId = msg.msg_id ?? msg.id;
                if (forwardId !== undefined && forwardId !== null && forwardId !== "undefined") {
                    formData.append("forward_from", forwardId);
                }

                const messageText = msg.text || msg.content || "";
                formData.append("content", messageText);


                const originalSenderId = msg.sender_id || msg.sender?.id || msg.sender;
                if (member.type === "user" && String(member.id) === String(originalSenderId)) {
                    console.warn(`⛔ Skipping forward to original sender (User ${originalSenderId})`);
                    continue;
                }

                let url;
                if (member.type === "user") {
                    formData.append("receiver", member.id);
                    url = `${API_BASE_URL}/chat/api/messages/send/`;
                } else if (member.type === "group") {
                    console.log("Sending to group")
                    url = `${API_BASE_URL}/chat/api/group/${member.id}/send-message/`;
                } else {
                    console.warn("❌ Unknown member type:", member);
                    continue;
                }

                console.log("form data",formData)

                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: formData,
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(`Status ${response.status}: ${errText}`);
                    }

                    const result = await response.json();
                    console.log(`✅ Message forwarded to ${member.name || member.id}:`, result, member.type);

                    // ✅ Real-time WebSocket broadcast
                    if (member.type === "user" && socketRef.current?.readyState === WebSocket.OPEN) {
                        // socketRef.current.send(JSON.stringify({
                        //     id: result.id || result.message?.id,
                        //     type: "chat_message",
                        //     message: messageText,
                        //     sender: loggedInUserId,
                        //     receiver: member.id,
                        //     username: loggedInUser,
                        //     reply_to: null,
                        //     forward_from: {
                        //         id: forwardId,
                        //         // sender_name: msg.sender || "Unknown",
                        //         sender_name: msg.sender_name || "Unknown",
                        //         content: msg.text || msg.content || "",
                        //         file_name: msg.file_name || null
                        //     }
                        // }));
                        // Main message payload
socketRef.current.send(JSON.stringify({
    id: result.id || result.message?.id,
    type: "chat_message",
    message: messageText,
    sender: loggedInUserId,
    receiver: member.id,
    username: loggedInUser, // this is who forwarded the message
    reply_to: null,
    forward_from: {
        id: forwardId,
        sender_name: msg.sender_name || msg.sender || "Unknown", // original message sender
        content: msg.text || msg.content || "",
        file_name: msg.file_name || null
    }
}));

                    }

                    if (globalSocketRef.current?.readyState === WebSocket.OPEN) {
                        // globalSocketRef.current.send(
                        //     JSON.stringify({
                        //         type: "new_message",
                        //         id: result.id,
                        //         sender: loggedInUserId,
                        //         receiver: member.id,
                        //         sender_name: loggedInUser,
                        //         text: messageText,
                        //         forward_from: {
                        //             id: forwardId,
                        //             // sender_name: msg.sender_name || msg.sender || "Unknown",
                        //              sender_name: msg.sender_name || msg.sender || "Unknown", 
                        //             content: msg.text || msg.content || "",
                        //             file_name: msg.file_name || null
                        //         }
                        //     })
                        // );
                        globalSocketRef.current.send(JSON.stringify({
    type: "new_message",
    id: result.id,
    sender: loggedInUserId,
    receiver: member.id,
    sender_name: loggedInUser, // you, who is forwarding
    text: messageText,
    forward_from: {
        id: forwardId,
        sender_name: msg.sender_name || msg.sender || "Unknown", // original sender
        content: msg.text || msg.content || "",
        file_name: msg.file_name || null
    }
}));

                    }


                } catch (error) {
                    console.error(`❌ Error forwarding to ${member.name || member.id}:`, error);
                }
            }

        }

        // ✅ Reset UI state
        setForwardMessage(null);
        setSelectedMessages([]);
        setSelectedMembers([]);
        setCheckboxVisible({});
        setMutipleMsgOption(false);

        // ✅ Close modal
        const modalElement = document.getElementById("staticBackdrop");
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modalInstance.hide();
        }

        // ✅ Remove modal backdrops
        setTimeout(() => {
            document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
        }, 300);
    };


    console.log("logineduserd", loggedInUser)


//     const handleForwardMessage = async () => {
//         if ((!forwardMessage && selectedMessages.length === 0) || selectedMembers.length === 0) {
//             alert("Please select at least one user/group and one message to forward.");
//             return;
//         }
    
//         const token = localStorage.getItem("token");
//         // const forwardList = forwardMessage ? [forwardMessage] : selectedMessages;
//           const forwardList = forwardMessage ? Array.isArray(forwardMessage) ? forwardMessage : [forwardMessage] : selectedMessages;
    
//         for (const rawMember of selectedMembers) {
//             let member;
    
//             if (typeof rawMember === "string") {
//                 const [prefix, id] = rawMember.split("_");
//                 member = {
//                     id,
//                     type: prefix === "group" ? "group" : "user",
//                     name: rawMember,
//                 };
//             } else {
//                 member = rawMember;
//             }
    
//             for (const msg of forwardList) {
//                 const formData = new FormData();
    
//                 const forwardId = msg.msg_id ?? msg.id;
//                 if (forwardId !== undefined && forwardId !== null && forwardId !== "undefined") {
//                     formData.append("forward_from", forwardId);
//                 }
    
//                 // Use the original message content for both the forwarded content and the main message
//                 const originalContent = msg.text || msg.content || "";
//                 formData.append("content", originalContent);
    
//                 const originalSenderId = msg.sender_id || msg.sender?.id || msg.sender;
//                 if (member.type === "user" && String(member.id) === String(originalSenderId)) {
//                     console.warn(`⛔ Skipping forward to original sender (User ${originalSenderId})`);
//                     continue;
//                 }
    
//                 let url;
//                 if (member.type === "user") {
//                     formData.append("receiver", member.id);
//                     url = `${API_BASE_URL}/chat/api/messages/send/`;
//                 } else if (member.type === "group") {
//                     url = `${API_BASE_URL}/chat/api/group/${member.id}/send-message/`;
//                 } else {
//                     console.warn("❌ Unknown member type:", member);
//                     continue;
//                 }
    
//                 try {
//                     const response = await fetch(url, {
//                         method: "POST",
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                         },
//                         body: formData,
//                     });
    
//                     if (!response.ok) {
//                         const errText = await response.text();
//                         throw new Error(`Status ${response.status}: ${errText}`);
//                     }
    
//                     const result = await response.json();
//                     console.log(`✅ Message forwarded to ${member.name || member.id}:`, result, member.type);
    
//                     // Unified WebSocket message structure
//                     // const wsMessage = {
//                     //     id: result.id || result.message?.id,
//                     //     type: member.type === "group" ? "group_message" : "chat_message",
//                     //     message: originalContent, // Use original content here
//                     //     sender: loggedInUserId,
//                     //     receiver: member.id,
//                     //     username: loggedInUser,
//                     //     text: originalContent, // And here
//                     //     forward_from: {
//                     //         id: forwardId,
//                     //         sender_name: loggedInUser || "Unknown",
//                     //         content: originalContent, // And here
//                     //         file_name: msg.file_name || null
//                     //     }
//                     // };
//                     const wsMessage = {
//     id: result.id || result.message?.id,
//     type: member.type === "group" ? "group_message" : "chat_message",
//     message: originalContent,
//     sender: loggedInUserId,
//     receiver: member.id,
//     username: loggedInUser, // "pc"
//     text: originalContent,
//     forward_from: {
//         id: forwardId,
//         // Override with YOUR username (the forwarder)
//         sender_name: loggedInUser, // Forces "pc" instead of original "nasi"
//         content: originalContent,
//         file_name: msg.file_name || null
//     },
//     sender_name: loggedInUser // Ensure top-level sender is also "pc"
// };
    
//                     // Send via appropriate WebSocket
//                     const socketToUse = member.type === "user" ? socketRef.current : globalSocketRef.current;
//                     if (socketToUse?.readyState === WebSocket.OPEN) {
//                         socketToUse.send(JSON.stringify(wsMessage));
//                     }
    
//                 } catch (error) {
//                     console.error(`❌ Error forwarding to ${member.name || member.id}:`, error);
//                 }
//             }
//         }
    
//         // Reset UI state
//         setForwardMessage(null);
//         setSelectedMessages([]);
//         setSelectedMembers([]);
//         setCheckboxVisible({});
//         setMutipleMsgOption(false);
    
//         // Close modal
//         const modalElement = document.getElementById("staticBackdrop");
//         if (modalElement) {
//             const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
//             modalInstance.hide();
//         }
    
//         // Remove modal backdrops
//         setTimeout(() => {
//             document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
//         }, 300);
//     };


    const handleMultipleMsgForword = () => {
        if (selectedMessages.length === 0) {
            alert("Please select at least one message to forward.");
            return;
        }

        console.log("Selected messages to forward:", selectedMessages);

        // Store selected messages for forwarding

        setForwardMessage(selectedMessages);
    };


    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
    const [reactEmoji, setReactEmoji] = useState(false)

    const emojiList = ["✔️", "🔥", "👍", "👎", "👏", "+"];



    const handleReact = async (msgId, emoji) => {

        console.log("emoji", emoji)
        const token = localStorage.getItem("token");
        let url = `${API_BASE_URL}/chat/messages/react/`
        if (selectedGroup) {
            console.log("Group React")
            url = `${API_BASE_URL}/chat/messages/groupreact/`
        }
        console.log("url react: ", url)
        try {
            await axios.post(
                url,
                {
                    message_id: msgId,
                    user_id: loggedInUserId,
                    emote: emoji,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            setMessages((prevMessages) => {
                const updatedMessages = { ...prevMessages };
                Object.keys(updatedMessages).forEach((userId) => {
                    updatedMessages[userId] = updatedMessages[userId].map((msg) => {
                        if (msg.msg_id === msgId) {
                            const existingReactions = msg.msg_reacted || [];
                            const alreadyReacted = existingReactions.find(
                                (r) => r.user_id === loggedInUserId && r.emote === emoji
                            );

                            return {
                                ...msg,
                                msg_reacted: alreadyReacted
                                    ? existingReactions.filter(
                                        (r) =>
                                            !(
                                                r.user_id === loggedInUserId && r.emote === emoji
                                            )
                                    ) // remove reaction
                                    : [...existingReactions, { user_id: loggedInUserId, emote: emoji }], // add reaction
                            };
                        }
                        return msg;
                    });
                });

                return updatedMessages;
            });

        } catch (err) {
            console.error("Error sending reaction:", err);
        }

        setShowEmojiPickerFor(null);

    };





    const handleRemoveReaction = async (msgId, emoji) => {

        console.log(emoji, "to delete")
        const token = localStorage.getItem("token");

        try {
            await axios.delete(`${API_BASE_URL}/chat/messages/react/`, {
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

    // const handleEditMessage = async (e) => {
    //     console.log("handleEditMessage triggered");
    //     if (e.key === "Enter") {
    //         if (e.shiftKey) {
    //             e.preventDefault();
    //             setInput((prev) => prev + "\n");
    //         } else {
    //             e.preventDefault();
    //             try {
    //                 console.log("sm",selectedMessage)
    //                 const data = {
    //                     msg_id: selectedMessage.msg_id,
    //                     content: input
    //                 };

    //                 console.log("Sending edited message:", data);

    //                 const response = await fetch(`${API_BASE_URL}/chat/api/messages/${data.msg_id}/update/`, {
    //                     method: 'PATCH', // <-- ✅ correct method
    //                     headers: {
    //                         'Content-Type': 'application/json',
    //                         'Authorization': `Bearer ${token}`
    //                     },
    //                     body: JSON.stringify(data)
    //                 });

    //                 if (!response.ok) {
    //                     const err = await response.json();
    //                     console.error("Failed to update message:", err);
    //                     return;
    //                 }

    //                 setEditMode(false);
    //                 setInput("");
    //                 setSelectedMessage(null);

    //             } catch (error) {
    //                 console.log("Error updating message:", error);
    //             }
    //         }
    //     }
    // };

    const handleEditMessage = (msgId, newText) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                // type: selectedGroup ? "edit_group_message" : "edit_message",
                type: "edit_message",
                id: msgId,
                new_text: newText
            }));
        }
    };

    async function handleDeleteMessage(messageId) {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${API_BASE_URL}/chat/api/group-messages/${messageId}/delete/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            // if (response.ok) {
            //     const chatKey = selectedGroup.id.toString();
            //     setMessages(prev => ({
            //         ...prev,
            //         [chatKey]: (prev[chatKey] || []).filter(msg => msg.msg_id !== messageId)
            //     }));

            //     if (socketRef.current?.readyState === WebSocket.OPEN) {
            //         socketRef.current.send(JSON.stringify({
            //             type: "delete_group_message",
            //             id: messageId
            //         }));
            //     }
            if (response.ok) {
                const userId = selectedUser?.id || selectedGroup?.id;
                console.log(userId)
                // ✅ 1. Remove locally for sender
                setMessages((prevMessages) => {
                    const updatedMessages = { ...prevMessages };
                    updatedMessages[userId] = updatedMessages[userId]?.filter(
                        (msg) => msg.msg_id !== messageId
                    );
                    return updatedMessages;
                });

                // ✅ 2. Send WebSocket event for others
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "delete_group_message",
                            id: messageId,
                            chat_key: selectedUser
                                ? `${selectedUser.id}`
                                : `${selectedGroup.id}`
                        })
                    );
                }
            } else {
                toast.error("Failed to delete group message");
            }
        } catch (error) {
            console.error("Group message delete error:", error);
            toast.error("Server error while deleting group message");
        }
    }


    async function updateGroupMessageContent(messageId, newContent) {
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE_URL}/chat/api/group-messages/${messageId}/update/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ content: newContent })
        });
    }









    // const handleDownload = async (msg) => {
    //     try {
    //         const response = await fetch(`http://127.0.0.1:8000${msg.file_url}`);
    //         const blob = await response.blob();
    //         const url = window.URL.createObjectURL(blob);
    //         const link = document.createElement('a');
    //         link.href = url;
    //         link.download = msg.file_name || 'download.jpg';
    //         document.body.appendChild(link);
    //         link.click();
    //         link.remove();
    //         window.URL.revokeObjectURL(url);
    //     } catch (error) {
    //         console.error("Download failed:", error);
    //     }
    // };

    const handleDownload = async (msg) => {
        try {
            const baseURL = import.meta.env.VITE_API_URL.replace('/api', '');
            const response = await fetch(`${baseURL}${msg.file_url}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            const extension = msg.file_url.split('.').pop();
            link.href = url;
            link.download = msg.file_name || `download.${extension}`;

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };




    const handleGroupProfile = () => {
        navigate('/groupprofile', { state: { selectedGroup, isAdmin, chatUsers } });

    }

    const handleSearchOption = () => {
        setShowSearchModal((prev) => !prev);
        setSearchTerm('');
        setCurrentMatchIndex(0);
    };



    useEffect(() => {
        if (hoveredMessageId !== showEmojiPickerFor) {
            setShowEmojiPickerFor(null);
        }
        if (hoveredMessageId !== activeMessageId) {
            setActiveMessageId(null);
        }
    }, [hoveredMessageId]);






    useEffect(() => {
        setSelectedFiles([])
    }, [selectedGroup, selectedUser])



    const [showCamera, setShowCamera] = useState(true)
    const [showMic, setShowMic] = useState(true)


    function handleMic() {
        if (localAudioTrack) {
            const newState = !isMicMuted;
            localAudioTrack.enable(!newState);  // enable(true) = unmute, enable(false) = mute
            setIsMicMuted(newState);
            console.log(`🎤 Microphone ${newState ? "muted" : "unmuted"}`);
        }
    }

    function handleCamera() {
        if (localVideoTrack) {
            const newState = !isCameraOff;
            localVideoTrack.enable(!newState);  // enable(true) = show, enable(false) = hide
            setIsCameraOff(newState);
            console.log(`📷 Camera ${newState ? "disabled" : "enabled"}`);
        }
    }



    const [textEmoji, setTextEmoji] = useState(false)

    const handleEmojiClick = (emojiData, event) => {
        setInput((prevInput) => prevInput + emojiData.emoji);
    };




    const [showChat, setShowChat] = useState(false);

    const handleShowChat = () => {
        setShowChat(true)
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 100);
    }

    const textareaRef = useRef(null);

    const autoResizeTextarea = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height
            textarea.style.height = textarea.scrollHeight + 'px'; // Set new height
        }
    };

    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 480);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 480);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const chatContainerRef = useRef(null);


    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ top: 80, right: 20 });
    const draggableRef = useRef(null);
    let offset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = draggableRef.current.getBoundingClientRect();
        offset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };


    //   if (!isDragging) return;
    //   setPosition({
    //     top: e.clientY - offset.current.y,
    //     left: e.clientX - offset.current.x,
    //   });
    // };

    // const handleMouseUp = () => {
    //   setIsDragging(false);
    // };

    // useEffect(() => {
    //   window.addEventListener('mousemove', handleMouseMove);
    //   window.addEventListener('mouseup', handleMouseUp);
    //   return () => {
    //     window.removeEventListener('mousemove', handleMouseMove);
    //     window.removeEventListener('mouseup', handleMouseUp);
    //   };
    // }, [isDragging]);


    const handleStartDrag = (e) => {
        setIsDragging(true);

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        const rect = draggableRef.current.getBoundingClientRect();
        offset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const handleDragging = (e) => {
        if (!isDragging) return;

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        setPosition({
            top: clientY - offset.current.y,
            left: clientX - offset.current.x,
        });
    };

    const handleStopDrag = () => {
        setIsDragging(false);
    };


    useEffect(() => {
        window.addEventListener('mousemove', handleDragging);
        window.addEventListener('mouseup', handleStopDrag);
        window.addEventListener('touchmove', handleDragging, { passive: false });
        window.addEventListener('touchend', handleStopDrag);

        return () => {
            window.removeEventListener('mousemove', handleDragging);
            window.removeEventListener('mouseup', handleStopDrag);
            window.removeEventListener('touchmove', handleDragging);
            window.removeEventListener('touchend', handleStopDrag);
        };
    }, [isDragging]);


    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeMessageId && !e.target.closest('.three-dot-button')) {
                setActiveMessageId(null);
                setHoveredMessageId(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeMessageId]);






    useEffect(() => {
        if (!loggedInUserId) return; // Don't run until loggedInUserId is available

        const loadPersistedChat = async () => {
            const savedUser = localStorage.getItem("selectedUser");
            const savedGroup = localStorage.getItem("selectedGroup");
            const savedMessages = localStorage.getItem("messages");

            console.log('Saved data:', { savedUser, savedGroup, savedMessages });

            try {
                if (savedUser) {
                    const user = JSON.parse(savedUser);

                    if (savedMessages) {
                        const parsedMessages = JSON.parse(savedMessages);
                        const transformedMessages = parsedMessages.map(m => ({
                            msg_id: m.id,
                            sender: m.sender === loggedInUserId ? "You" : user.name,
                            text: m.content,
                            file_url: m.file || "",
                            file_name: m.file ? m.file_name : "",
                            isSender: m.sender === loggedInUserId,
                            timestamp: m.timestamp,
                            msg_reacted: m.reactions || [],
                            is_read: m.is_read,
                            reply_to: m.reply_to || null,
                            forward_msg: m.forward_from || null
                        }));

                        setMessages(prev => ({
                            ...prev,
                            [user.id]: transformedMessages
                        }));
                    }

                    await handleUserClick(user);
                } else if (savedGroup) {
                    const group = JSON.parse(savedGroup);
                    if (savedMessages) {
                        const parsedMessages = JSON.parse(savedMessages);
                        const transformedMessages = parsedMessages.map(m => ({
                            msg_id: m.id,
                            sender: m.sender === loggedInUserId ? "You" : "Other",
                            text: m.content,
                            file_url: m.file || "",
                            file_name: m.file ? m.file_name : "",
                            isSender: m.sender === loggedInUserId,
                            timestamp: m.timestamp,
                            msg_reacted: m.reactions || [],
                            is_read: m.is_read,
                            reply_to: m.reply_to || null,
                            forward_msg: m.forward_from || null
                        }));

                        setMessages(prev => ({
                            ...prev,
                            [group.id]: transformedMessages
                        }));
                    }
                    await handleSelectGroup(group);
                } else {
                    navigate("/chatpage");
                }
            } catch (error) {
                console.error("Error loading chat:", error);
                localStorage.removeItem("selectedUser");
                localStorage.removeItem("selectedGroup");
                localStorage.removeItem("messages");
            }
        };

        loadPersistedChat();
    }, [navigate, loggedInUserId]);



    useEffect(() => {
        const initializeChat = async () => {
            try {
                const savedChatUsers = localStorage.getItem("chatUsers");
                if (savedChatUsers) {
                    setChatUsers(JSON.parse(savedChatUsers));
                }

                const userEmail = localStorage.getItem("user_email");
                if (userEmail) {
                    const userResponse = await axios.get(
                        `${API_BASE_URL}/chat/auth/user/${userEmail}/`,
                        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                    );

                    const newUser = userResponse.data.name;
                    const userid = userResponse.data.id;
                    setLoggedInUser(newUser);
                    setLoggedInUserId(userid);


                    const connectedUsersResp = await axios.get(
                        `${API_BASE_URL}/chat/auth/get-connected-users/`,
                        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                    );

                    // 4. Update state with fresh data (will replace cached version)
                    setChatUsers(connectedUsersResp.data);
                    localStorage.setItem("chatUsers", JSON.stringify(connectedUsersResp.data));

                    // 5. Setup WebSocket if needed
                    if (userid) {
                        setupGlobalWebSocket();
                    }
                }
            } catch (err) {
                console.error("Initialization error:", err);

            }
        };

        initializeChat();
    }, []);



    const chatPanelRef = useRef();



    //Rendering

    return (
        <>
            {isMobileView ? (<>
                <div>



                    <MobileHome
                        setMessages={setMessages}
                        handleForwardMessage={handleForwardMessage}
                        softDeleteMessage={softDeleteMessage}
                        remoteTracks={remoteTracks}
                        showInviteModal={showInviteModal}
                        inviteToCall={inviteToCall}
                        incomingCall={incomingCall}
                        declineCall={declineCall}
                        openInviteModal={openInviteModal}
                        closeInviteModal={closeInviteModal}
                        setShowInviteModal={setShowInviteModal}

                        isMicMuted={isMicMuted}
                        loggedInUser={loggedInUser}
                        isCameraOff={isCameraOff}
                        selectedMessage={selectedMessage}
                        setReplyTo={setReplyTo}
                        replyTo={replyTo}
                        chatContainerRef={chatContainerRef}
                        handleDoubleClick={handleDoubleClick}
                        setSelectedMessages={setSelectedMessages}
                        setMutipleMsgOption={setMutipleMsgOption}
                        setCheckboxVisible={setCheckboxVisible}
                        setForwardMessage={setForwardMessage}
                        setPopoverPosition={setPopoverPosition}
                        popoverPosition={popoverPosition}
                        setActiveMessageId={setActiveMessageId}
                        setSelectedMessage={setSelectedMessage}
                        handleGroupProfile={handleGroupProfile}
                        handleLogout={handleLogout}
                        handleSearch={handleSearch}
                        handlePrivateChat={handlePrivateChat}
                        handleGroupChat={handleGroupChat}
                        handleAllChat={handleAllChat}
                        setActiveChat={setActiveChat}
                        activeChat={activeChat}
                        notiSpace={notiSpace}
                        chatUsers={chatUsers}
                        selectedUser={selectedUser}
                        groups={groups}
                        selectedGroup={selectedGroup}
                        users={users}
                        notificationlist={notificationlist}
                        isAdmin={isAdmin}
                        handleSelectGroup={handleSelectGroup}
                        handleNotificationBtn={handleNotificationBtn}
                        handleUserClick={handleUserClick}
                        startCall={startCall}
                        showSearchModal={showSearchModal}
                        setShowSearchModal={setShowSearchModal}
                        setSearchTerm={setSearchTerm}
                        handleSearchOption={handleSearchOption}
                        setSelectedUser={setSelectedUser}
                        setSelectedGroup={setSelectedGroup}

                        FaVideo={FaVideo}
                        FaPhone={FaPhone}
                        startScreenShare={startScreenShare}
                        handleMultipleMsgReply={handleMultipleMsgReply}
                        handleMultipleMsgForword={handleMultipleMsgForword}
                        handleMultipleMsgDelete={handleMultipleMsgDelete}
                        handleMultipleMsgCancel={handleMultipleMsgCancel}
                        remoteVideoRef={remoteVideoRef}
                        videoRef={videoRef}
                        FiCameraOff={FiCameraOff}
                        FaPhoneSlash={FaPhoneSlash}
                        endCall={endCall}
                        isCallActive={isCallActive}
                        draggableRef={draggableRef}
                        handleMouseDown={handleMouseDown}
                        position={position}
                        handleStartDrag={handleStartDrag}
                        isDragging={isDragging}
                        showMic={showMic}
                        showCamera={showCamera}
                        setShowChat={setShowChat}
                        handleMic={handleMic}
                        handleCamera={handleCamera}
                        messagesEndRef={messagesEndRef}
                        setNotiSpace={setNotiSpace}
                        messages={messages}
                        FaPaperclip={FaPaperclip}
                        handleFileChange={handleFileChange}
                        textareaRef={textareaRef}
                        input={input}
                        handleKeyPress={handleKeyPress}
                        textEmoji={textEmoji}
                        handleSendMessage={handleSendMessage}
                        FaPaperPlane={FaPaperPlane}
                        setInput={setInput}
                        scrollToMessage={scrollToMessage}
                        reactEmoji={reactEmoji}
                        setReactEmoji={setReactEmoji}
                        editMode={editMode}
                        handleEditMessage={handleEditMessage}
                        handleFileUpload={handleFileUpload}
                        selectedId={selectedId}
                        searchTerm={searchTerm}
                        hoveredMessageId={hoveredMessageId}
                        setHoveredMessageId={setHoveredMessageId}
                        multipleMsgOption={multipleMsgOption}
                        showEmojiPickerFor={showEmojiPickerFor}
                        setShowEmojiPickerFor={setShowEmojiPickerFor}
                        emojiList={emojiList}
                        handleReact={handleReact}
                        checkboxVisible={checkboxVisible}
                        selectedMessages={selectedMessages}
                        handleCheckboxChange={handleCheckboxChange}
                        activeMessageId={activeMessageId}
                        handlePopoverToggle={handlePopoverToggle}
                        MsgPopover={MsgPopover}
                        currentMatchIndex={currentMatchIndex}
                        matchingIndices={matchingIndices}
                        setCurrentMatchIndex={setCurrentMatchIndex}
                        handleDownload={handleDownload}
                        handleRemoveReaction={handleRemoveReaction}
                        selectedFiles={selectedFiles}
                        setSelectedFiles={setSelectedFiles}
                        acceptCall={acceptCall}


                    />
                </div>



            </>) : (<>

                <div className="d-flex vh-100 ">
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

                        <div onClick={() => navigate('/profile')} className={`d-flex align-items-center  mb-3 w-100 ${sidebarOpen ? "border rounded shadow-lg p-2 justify-content-start" : "justify-content-center"}`}>
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


                        {!sidebarOpen && (
                            <div>
                                <p className="icon-btn shadow-sm border btn" onClick={() => setSidebarOpen(!sidebarOpen)} ><i class="fa-solid fa-ellipsis-vertical" ></i></p>
                            </div>
                        )}

                        {sidebarOpen && (

                            <div className="" >

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
                                            <Button variant="light" className="icon-btn shadow-sm" onClick={handleChatIconClick}>
                                                <i className="fa-regular fa-comments"></i>
                                            </Button>
                                        </OverlayTrigger>
                                        <span className="icon-label">Chat</span>
                                    </div>

                                    {/* Notifications */}

                                    <div className="icon-container">
                                        <Button variant="light" className="icon-btn shadow-sm position-relative" onClick={handleNotificationBtn}>
                                            {notificationlist.length > 0 && (
                                                <span className="notification-badge" >
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
                            {users.length > 0 ? (
                                <ul className="list-unstyled w-100">
                                    <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Search Users:</p>
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
                            ) : null}



                            {/* Active Chats */}
                            {(!notiSpace && (activeChat === "all" || activeChat === "private")) && (
                                <div className="private-chat-list text-start w-100">
                                    {activeChat === 'all' ?
                                        <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Recent Chat:</p> :
                                        <p className="mb-2 fw-bold" style={{ fontSize: "10px" }}>Private Chat:</p>
                                    }
                                    <ul className="list-unstyled w-100">
                                        {chatUsers.map((user) => (
                                            <li
                                                key={user.id}
                                                className={`chat-user-item d-flex align-items-center p-2 rounded mb-2 ${selectedUser?.id === user.id ? "active-chat" : ""}`}
                                                onClick={() => handleUserClick(user)}
                                            >
                                                <div className="user-avatar">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                {sidebarOpen && (
                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                        <span className="ms-2">
                                                            {user.name.charAt(0).toUpperCase() + user.name.slice(1)}
                                                        </span>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}




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
                                                        // onClick={() => { handleUserClick({ id: value.sender, name: value.sender_name }), handleSelectGroup({ id: value.sender, name: value.sender_name }) }}
                                                        onClick={() => {
                                                            if (value.isGroup) {
                                                                handleSelectGroup({ id: value.group_id, name: value.group_name });
                                                            } else {
                                                                handleUserClick({ id: value.sender, name: value.sender_name });
                                                            }
                                                        }}
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
                            <div className="mt-auto w-100 ">
                                <button onClick={() => navigate("/admin")} className="btn btn-primary w-100 btn-sm" style={{ background: "linear-gradient(135deg, #6a11cb, #2575fc)", border: "none", padding: "10px", borderRadius: "8px" }}>
                                    <i className="fas fa-user-shield me-2"></i> {sidebarOpen && "Admin Panel"}
                                </button>
                            </div>
                        )}
                    </div>





                    {/* Main Content */}

                    <div
                        className="flex-grow-1 d-flex flex-column"
                        style={{
                            marginLeft: sidebarOpen ? "250px" : "80px",
                            transition: "margin-left 0.3s",
                            height: "100vh",
                            overflow: "hidden",
                        }}
                    >



                        {/* Navbar */}
                        {!isCallActive && (
                            <nav
                                className="navbar navbar-white shadow-sm bg-light d-flex justify-content-between px-3"
                                style={{
                                    position: "fixed",
                                    top: 0,
                                    left: sidebarOpen ? "250px" : "80px",
                                    right: 0,
                                    zIndex: 1000,
                                    transition: "left 0.3s",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <button className="btn btn-outline-light me-2 text-dark" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                        <Menu />
                                    </button>

                                    {selectedUser || selectedGroup ? (
                                        <div className="d-flex align-items-center">
                                            <h5 className="mb-0" style={{
                                                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                                                WebkitBackgroundClip: "text",
                                                WebkitTextFillColor: "transparent",
                                            }}>
                                                {/* {selectedUser ? selectedUser.name.charAt(0).toUpperCase() + selectedUser.name.slice(1) : '' || selectedGroup ? selectedGroup.name.charAt(0).toUpperCase() + selectedGroup.name.slice(1) : ""} */}

                                                {selectedUser ? (
                                                    selectedUser.name.charAt(0).toUpperCase() + selectedUser.name.slice(1)
                                                ) : selectedGroup ? (
                                                    <span onClick={handleGroupProfile} style={{ cursor: "pointer" }}>
                                                        {selectedGroup.name.charAt(0).toUpperCase() + selectedGroup.name.slice(1)}
                                                    </span>
                                                ) : (
                                                    ""
                                                )}
                                            </h5>


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
                                        ) : null}
                                    </div>

                                    {selectedUser || selectedGroup ? (
                                        <>
                                            <button onClick={handleSearchOption} className="call-btn search-call btn  me-2">
                                                <i class="fa-solid fa-magnifying-glass text-white"></i>
                                            </button>
                                            {/* <button onClick={startCall} className="call-btn video-call btn btn-outline-primary me-2">
                                                <FaVideo />
                                            </button>
                                            <button onClick={startCall} className="call-btn voice-call btn btn-outline-success me-2">
                                                <FaPhone />
                                                </button> */}
                                            <button onClick={() => startCall('video')} className="call-btn video-call btn btn-outline-primary me-2">
                                                <FaVideo />
                                            </button>
                                            <button onClick={() => startCall('audio')} className="call-btn voice-call btn btn-outline-success me-2">
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
                        )}


                        {showInviteModal && (
                            <div className="invite-modal">
                                <div className="invite-modal-content">
                                    <h4>Select User to Add</h4>
                                    <ul className="invite-user-list">
                                        {chatUsers
                                            .filter(user => user.id !== loggedInUserId)
                                            .filter(user => !remoteTracks.some(t => t.identity === user.name))
                                            .map(user => (
                                                <li key={user.id} onClick={() => inviteToCall(user)}>
                                                    {user.name}
                                                </li>
                                            ))}
                                    </ul>
                                    <button onClick={closeInviteModal} className="btn end-call-btn">Close</button>
                                </div>
                            </div>
                        )}

                        {/* {showInviteModal && (
                        <div className="modal show" style={{ display: 'block' }}>
                            <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                <h5 className="modal-title">Invite to Call</h5>
                                <button type="button" className="close" onClick={closeInviteModal}>
                                    ×
                                </button>
                                </div>
                                <div className="modal-body">
                                {onlineUsers.filter(u => u.id !== loggedInUserId).map((user) => (
                                    <button key={user.id} onClick={() => inviteToCall(user)} className="btn btn-outline-primary mb-2 w-100">
                                    {user.name}
                                    </button>
                                ))}
                                </div>
                            </div>
                            </div>
                        </div>
                        )} */}


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



                        <div className=" ">

                            {isCallActive ? (
                                <>
                                    <div className="video-call-overlay">

                                        <div className={`video-call-container ${showChat ? 'with-chat' : ''}`}>


                                            <div className="video-area">

                                                {isVideoCall && (
                                                    <div className="remote-videos-grid">

                                                        {remoteTracks.map(({ track, participantSid, identity }) => (
                                                            <div key={participantSid} className="video-frame">
                                                                <div
                                                                    className="video-content"
                                                                    ref={el => {
                                                                        if (el) {
                                                                            el.innerHTML = "";
                                                                            const element = track.attach();
                                                                            element.style.width = "100%";
                                                                            element.style.height = "100%";
                                                                            element.style.objectFit = "cover";
                                                                            el.appendChild(element);
                                                                        }
                                                                    }}
                                                                ></div>
                                                                <span className="video-badge">{identity}</span>
                                                            </div>
                                                        ))}

                                                    </div>
                                                )}


                                                {isVideoCall && (
                                                    <div
                                                        className="video-frame self-video"
                                                        ref={draggableRef}
                                                        onMouseDown={handleStartDrag}
                                                        onTouchStart={handleStartDrag}
                                                        style={{
                                                            bottom: position.top,
                                                            left: position.left,
                                                            position: 'absolute',
                                                            cursor: isDragging ? 'grabbing' : 'grab',
                                                            touchAction: 'none'
                                                        }}
                                                    >
                                                        <div ref={videoRef} className="video-content"></div>

                                                        {!isCameraOff ? (
                                                            <span className="video-badge">You</span>
                                                        ) : (
                                                            <span className="video-badge-camera-mute rounded-circle fw-bold">
                                                                {loggedInUser.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}

                                                    </div>
                                                )}



                                                {/* Controls Bar */}
                                                <div className="call-controls ">
                                                    {isVideoCall && (
                                                        <button onClick={handleCamera} className="btn camera-call-btn">
                                                            {!isCameraOff ? <i className="fa-solid fa-camera-retro"></i> : <FiCameraOff />}
                                                        </button>
                                                    )}

                                                    <button onClick={handleMic} className="btn mic-call-btn">
                                                        {!isMicMuted ? <i className="fa-solid fa-microphone-lines"></i> : <i className="fa-solid fa-microphone-slash"></i>}
                                                    </button>

                                                    {/* <button onClick={() => setShowChat(prev => !prev)} className="btn mic-call-btn"> */}
                                                    <button onClick={handleShowChat} className="btn mic-call-btn">
                                                        <i className="fa-regular fa-message"></i>
                                                    </button>

                                                    <button onClick={startScreenShare} className="btn mic-call-btn">
                                                        <i className="fa-solid fa-tablet-screen-button"></i>
                                                    </button>

                                                    <button onClick={openInviteModal} className="btn mic-call-btn">
                                                        <i className="fa-solid fa-user-plus"></i>
                                                    </button>

                                                    <button onClick={endCall} className="btn end-call-btn">
                                                        <FaPhoneSlash />
                                                    </button>
                                                </div>
                                            </div>


                                            {/* ... other call UI ... */}
                                            {showChat && (
                                                <div className="chat-panel" ref={chatPanelRef}>
                                                    <div className='d-flex flex-column vh-100'>


                                                        <nav className="navbar shadow-sm w-100 position-fixed  bg-white z-3 ">
                                                            <div className="d-flex align-items-center justify-content-between w-100">
                                                                {selectedUser || selectedGroup ? (
                                                                    <>

                                                                        <div className="d-flex ">
                                                                            <div className="d-flex align-items-center justify-content-between">
                                                                                <small>  <button
                                                                                    className="mx-2 btn btn-link btn-sm shadow border rounded-circle"
                                                                                    onClick={() => setShowChat(!showChat)}
                                                                                >
                                                                                    <i className="fa-solid fa-xmark" style={{ fontSize: '0.9rem' }}></i>
                                                                                </button></small>

                                                                                <span className="navbar-brand mb-0 h1 fw-bold" style={{
                                                                                    fontSize: '1.2rem',
                                                                                    fontWeight: '600',
                                                                                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                                                                                    WebkitBackgroundClip: "text",
                                                                                    WebkitTextFillColor: "transparent",
                                                                                }}>
                                                                                    {selectedUser ? (
                                                                                        selectedUser.name.charAt(0).toUpperCase() + selectedUser.name.slice(1)
                                                                                    ) : selectedGroup ? (
                                                                                        <span onClick={handleGroupProfile} style={{ cursor: "pointer" }}>
                                                                                            {selectedGroup.name.charAt(0).toUpperCase() + selectedGroup.name.slice(1)}
                                                                                        </span>
                                                                                    ) : (
                                                                                        ""
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <div className='d-flex' style={{ marginLeft: '150px' }}>
                                                                                <button onClick={handleSearchOption} className="call-btn search-call btn  me-2">
                                                                                    <i class="fa-solid fa-magnifying-glass text-white"></i>
                                                                                </button>

                                                                                <div className="icon-container ">
                                                                                    <OverlayTrigger
                                                                                        trigger="click"
                                                                                        placement="bottom"
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
                                                                            </div>

                                                                        </div>
                                                                    </>
                                                                ) : null}
                                                            </div>

                                                            <div className="d-flex mx-2 align-items-center ">
                                                                {showSearchModal ? (
                                                                    <input
                                                                        type="text"
                                                                        className="form-control me-2 shadow-lg mt-2"
                                                                        placeholder="Search messages..."
                                                                        value={searchTerm}
                                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                                        style={{
                                                                            width: "330px",
                                                                            transition: "all 0.3s ease",
                                                                            borderRadius: "20px",
                                                                        }}
                                                                        onFocus={(e) => (e.target.style.border = "1px solid #6a11cb")}
                                                                        onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
                                                                    />
                                                                ) : null}
                                                            </div>


                                                        </nav>



                                                        <div className="chat-container" ref={chatContainerRef}>
                                                            <MessageList
                                                                handleDropFiles={handleDropFiles}

                                                                showChat={showChat}
                                                                chatPanelRef={chatPanelRef}
                                                                setActiveMessageId={setActiveMessageId}
                                                                textareaRef={textareaRef}
                                                                autoResizeTextarea={autoResizeTextarea}
                                                                handleSendMessage={handleSendMessage}
                                                                scrollToMessage={scrollToMessage}
                                                                reactEmoji={reactEmoji}
                                                                setReactEmoji={setReactEmoji}
                                                                selectedFiles={selectedFiles}
                                                                setSelectedFiles={setSelectedFiles}
                                                                replyTo={replyTo}
                                                                FaPaperclip={FaPaperclip}
                                                                handleFileChange={handleFileChange}
                                                                textEmoji={textEmoji}
                                                                input={input}
                                                                editMode={editMode}
                                                                handleKeyPress={handleKeyPress}
                                                                FaPaperPlane={FaPaperPlane}
                                                                setTextEmoji={setTextEmoji}
                                                                EmojiPicker={EmojiPicker}
                                                                handleEmojiClick={handleEmojiClick}
                                                                setInput={setInput}
                                                                setReplyTo={setReplyTo}
                                                                handleEditMessage={handleEditMessage}
                                                                handleFileUpload={handleFileUpload}
                                                                messages={messages}
                                                                selectedId={selectedId}
                                                                searchTerm={searchTerm}
                                                                hoveredMessageId={hoveredMessageId}
                                                                setHoveredMessageId={setHoveredMessageId}
                                                                multipleMsgOption={multipleMsgOption}
                                                                handleDoubleClick={handleDoubleClick}
                                                                showEmojiPickerFor={showEmojiPickerFor}
                                                                setShowEmojiPickerFor={setShowEmojiPickerFor}
                                                                emojiList={emojiList}
                                                                handleReact={handleReact}
                                                                checkboxVisible={checkboxVisible}
                                                                selectedMessages={selectedMessages}
                                                                handleCheckboxChange={handleCheckboxChange}
                                                                activeMessageId={activeMessageId}
                                                                handlePopoverToggle={handlePopoverToggle}
                                                                MsgPopover={MsgPopover}
                                                                currentMatchIndex={currentMatchIndex}
                                                                matchingIndices={matchingIndices}
                                                                setCurrentMatchIndex={setCurrentMatchIndex}
                                                                messagesEndRef={messagesEndRef}
                                                                handleDownload={handleDownload}
                                                                handleRemoveReaction={handleRemoveReaction}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                            )}
                                        </div>
                                    </div>

                                </>
                            ) : selectedUser || selectedGroup ? (
                                <div className="chat-container" ref={chatContainerRef}>
                                    <MessageList
                                        handleDropFiles={handleDropFiles}
                                        showChat={showChat}
                                        setActiveMessageId={setActiveMessageId}
                                        scrollToMessage={scrollToMessage}
                                        reactEmoji={reactEmoji}
                                        setReactEmoji={setReactEmoji}
                                        textareaRef={textareaRef}
                                        autoResizeTextarea={autoResizeTextarea}
                                        setSelectedEdit={setSelectedEdit}
                                        selectedFiles={selectedFiles}
                                        setSelectedFiles={setSelectedFiles}
                                        replyTo={replyTo}
                                        FaPaperclip={FaPaperclip}
                                        handleFileChange={handleFileChange}
                                        textEmoji={textEmoji}
                                        input={input}
                                        editMode={editMode}
                                        handleKeyPress={handleKeyPress}
                                        handleSendMessage={handleSendMessage}
                                        FaPaperPlane={FaPaperPlane}
                                        setTextEmoji={setTextEmoji}
                                        EmojiPicker={EmojiPicker}
                                        handleEmojiClick={handleEmojiClick}
                                        setInput={setInput}
                                        setReplyTo={setReplyTo}
                                        handleEditMessage={handleEditMessage}
                                        handleFileUpload={handleFileUpload}
                                        messages={messages}
                                        selectedId={selectedId}
                                        searchTerm={searchTerm}
                                        hoveredMessageId={hoveredMessageId}
                                        setHoveredMessageId={setHoveredMessageId}
                                        multipleMsgOption={multipleMsgOption}
                                        handleDoubleClick={handleDoubleClick}
                                        showEmojiPickerFor={showEmojiPickerFor}
                                        setShowEmojiPickerFor={setShowEmojiPickerFor}
                                        emojiList={emojiList}
                                        handleReact={handleReact}
                                        checkboxVisible={checkboxVisible}
                                        selectedMessages={selectedMessages}
                                        handleCheckboxChange={handleCheckboxChange}
                                        activeMessageId={activeMessageId}
                                        handlePopoverToggle={handlePopoverToggle}
                                        MsgPopover={MsgPopover}
                                        currentMatchIndex={currentMatchIndex}
                                        matchingIndices={matchingIndices}
                                        setCurrentMatchIndex={setCurrentMatchIndex}
                                        messagesEndRef={messagesEndRef}
                                        handleDownload={handleDownload}
                                        handleRemoveReaction={handleRemoveReaction}

                                    />
                                </div>
                            ) : (
                                <div className="welcome-message p-5 mt-5">
                                    <h4>Welcome to Nasiwak Messenger</h4>
                                    <p>Start a conversation by selecting a user or group.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />
                </div>
            </>)}








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

export default ChatPage;

