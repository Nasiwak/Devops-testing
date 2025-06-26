

import React from 'react';
import moment from 'moment';
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import { useEffect } from 'react';

const MessageList = ({
    scrollToMessage,
    reactEmoji,
    setReactEmoji,
    textareaRef,
    autoResizeTextarea,


    selectedFiles,
    setSelectedFiles,
    replyTo,
    FaPaperclip,
    handleFileChange,
    textEmoji,
    input,
    editMode,
    handleKeyPress,
    handleSendMessage,
    FaPaperPlane,
    setTextEmoji,
    EmojiPicker,
    handleEmojiClick,
    setInput,
    setReplyTo,
    handleEditMessage,
    handleFileUpload,
    messages,
    selectedId,
    searchTerm,
    hoveredMessageId,
    setHoveredMessageId,
    multipleMsgOption,
    handleDoubleClick,
    showEmojiPickerFor,
    setShowEmojiPickerFor,
    emojiList,
    handleReact,
    checkboxVisible,
    selectedMessages,
    handleCheckboxChange,
    activeMessageId,
    handlePopoverToggle,
    MsgPopover,
    currentMatchIndex,
    matchingIndices,
    setCurrentMatchIndex,
    messagesEndRef,
    handleDownload,
    handleRemoveReaction,
    

}) => {
    let lastDate = null;

    useEffect(() => {
        autoResizeTextarea(); 
      }, []);
      const API_BASE_URL = import.meta.env.VITE_API_URL;
    return (
        <>
            <div className="chat-messages">
                {(messages[selectedId] || []).map((msg, idx) => {
                    const msgDate = moment(msg.timestamp).format("DD MMM YYYY");
                    const showDateHeader = lastDate !== msgDate;
                    lastDate = msgDate;

                    return (
                        <React.Fragment key={idx}>
                            {showDateHeader && (
                                <div className="date-separator">
                                    <span>{msgDate}</span>
                                </div>
                            )}

                            <div
                                className="message-row px-5"
                                style={{
                                    display: "flex",
                                    justifyContent: msg.isSender ? "flex-end" : "flex-start",
                                    alignItems: "center",
                                    marginBottom: "10px",
                                    padding: "5px",
                                    borderRadius: "10px",
                                    position: "relative",
                                    backgroundColor:
                                        searchTerm &&
                                            (
                                                msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                msg.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                msg.file_url?.toLowerCase().includes(searchTerm.toLowerCase())
                                            )
                                            ? 'rgb(172, 171, 171)'
                                            : 'transparent',
                                }}
                                onMouseEnter={() => setHoveredMessageId(msg.msg_id)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                                onDoubleClick={() => {
                                    if (multipleMsgOption) {
                                        handleDoubleClick(msg.msg_id, msg.text);
                                    }
                                }}
                            >

                                <div style={{
                                    visibility: hoveredMessageId === msg.msg_id ? "visible" : "hidden",
                                    position: 'relative',
                                    marginRight: '5px'
                                }}>
                                    <button
                                        className="btn btn-sm text-secondray border-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowEmojiPickerFor(showEmojiPickerFor === msg.msg_id ? null : msg.msg_id);
                                            setReactEmoji(false);
                                        }}
                                    >
                                        <i className="fa-regular fa-face-smile text-secondray"></i>
                                    </button>

                                    {showEmojiPickerFor === msg.msg_id && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                bottom: '30px',
                                                left: msg.isSender ? 'auto' : '0',
                                                right: msg.isSender ? '0' : 'auto',
                                                background: '#fff',
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                padding: '5px 10px',
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                                                display: 'flex',
                                                gap: '8px',
                                                zIndex: 999,
                                            }}
                                        >
                                            {emojiList.map((emoji) => (
                                                emoji !== "+" ? (
                                                    <span
                                                        key={emoji}
                                                        style={{ cursor: 'pointer', fontSize: '15px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReact(msg.msg_id, emoji);
                                                            setShowEmojiPickerFor(null);
                                                        }}
                                                    >
                                                        {emoji}
                                                    </span>
                                                ) : (
                                                    <span
                                                        key={emoji}
                                                        style={{ cursor: 'pointer', fontSize: '15px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setReactEmoji(!reactEmoji);

                                                        }}
                                                    >
                                                        {emoji}
                                                    </span>
                                                )
                                            ))}

                                            {reactEmoji && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '35px',
                                                    left: msg.isSender ? 'auto' : '0',
                                                    right: msg.isSender ? '0' : 'auto',
                                                    zIndex: 1000
                                                }}>
                                                    <EmojiPicker
                                                        onEmojiClick={(emojiData) => {
                                                            handleReact(msg.msg_id, emojiData.emoji);
                                                            setReactEmoji(false);
                                                            setShowEmojiPickerFor(null);
                                                        }}
                                                        previewConfig={{ showPreview: false }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>





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
                                    }}


                                >


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

                                    {msg.file_url && (
                                        <div className="card shadow-sm" style={{ maxWidth: '180px', borderRadius: '8px', overflow: 'hidden' }}>
                                            <img
                                                src={`http://127.0.0.1:8000${msg.file_url}`}
                                                alt={msg.file_name}
                                                className="img-fluid"
                                                style={{ height: '100px', objectFit: 'cover', borderBottom: '1px solid #eee' }}
                                                onError={(e) => {
                                                    console.error("Image failed to load:", e.target.src);
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                            <div className="p-2 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                                                <span style={{ fontSize: '13px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {msg.file_name}
                                                </span>
                                                <button
                                                    onClick={() => handleDownload(msg)}
                                                    className="btn btn-sm btn-outline-primary rounded-circle"
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    <i className="fa-solid fa-download"></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-wrap", wordWrap: "break-word" }} id={`msg-${idx}`}>{msg.text}</p>

                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{
                                            alignSelf: 'flex-end',
                                            fontSize: '9px',
                                            color: msg.isSender ? '#f0f0f0' : '#555',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            <span>{moment(msg.timestamp).format("h:mm A")}</span>
                                            {msg.isSender && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {msg.is_read ? (
                                                        <i className="fa-solid fa-check-double" style={{ color: '#4fc3f7' }}></i>
                                                    ) : (
                                                        <i className="fa-solid fa-check" style={{ color: '#aaa' }}></i>
                                                    )}
                                                </span>
                                            )}
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
                                                    title={`Double-click to remove (${emoji.user_name})`}
                                                >
                                                    {emoji.emote}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {checkboxVisible[msg.msg_id] && (
                                    <div
                                        className="checkbox-circle"
                                        onClick={() => handleCheckboxChange(msg.msg_id, msg.text)}
                                        style={{
                                            width: "22px",
                                            height: "22px",
                                            borderRadius: "50%",
                                            border: "2px solid #6a11cb",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginLeft: "10px",
                                            cursor: "pointer",
                                            marginBottom: '10px',
                                            backgroundColor: selectedMessages.some((m) => m.msg_id === msg.msg_id) ? "#6a11cb" : "transparent",

                                        }}
                                    >
                                        {selectedMessages.some((m) => m.msg_id === msg.msg_id) && (
                                            <i className="fa-solid fa-check" style={{ color: "white", fontSize: "14px" }}></i>
                                        )}
                                    </div>
                                )}

                                {/* Three-dot menu button - only visible on hover */}
                                <div style={{
                                    visibility: hoveredMessageId === msg.msg_id ? "visible" : "hidden",
                                    marginLeft: "10px",
                                    marginBottom: '10px'
                                }}>
                                    <OverlayTrigger
                                        trigger="click"
                                        placement="left"
                                        overlay={<MsgPopover messageId={msg.msg_id} isSender={msg.isSender} />}
                                        show={activeMessageId === msg.msg_id}
                                        onToggle={(isOpen) => handlePopoverToggle(msg.msg_id, isOpen)}
                                        rootClose
                                    >
                                        <button
                                            className="border-0 rounded-circle bg-transparent p-0"
                                            style={{
                                                cursor: "pointer",
                                                color: "black",
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
                                </div>
                            </div>


                            {searchTerm && (
                                <div
                                    className="text-center rounded-3 bg-white"
                                    style={{
                                        position: 'fixed',
                                        top: 60,
                                        left: '50%',
                                        zIndex: 1000,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '5px',
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




            {selectedFiles.length > 0 && (
                <div
                    className="selected-files p-3 px-4"
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        justifyContent: "flex-end",
                        alignItems: "flex-start",
                    }}
                >
                    {selectedFiles.map((file, index) => {
                        const isImage = file.type.startsWith("image/");
                        return (
                            <div
                                key={index}
                                style={{
                                    position: "relative",
                                    backgroundColor: "#f3f4f6",
                                    borderRadius: "12px",
                                    padding: "8px",
                                    maxWidth: "180px",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                                    textAlign: "center",
                                }}
                            >
                                <button
                                    onClick={() => {
                                        const updatedFiles = [...selectedFiles];
                                        updatedFiles.splice(index, 1);
                                        setSelectedFiles(updatedFiles);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: "6px",
                                        right: "6px",
                                        background: "#ef4444",
                                        border: "none",
                                        borderRadius: "50%",
                                        color: "#fff",
                                        width: "20px",
                                        height: "20px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        lineHeight: "20px",
                                        textAlign: "center",
                                    }}
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>

                                {isImage ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        style={{
                                            width: "100%",
                                            height: "auto",
                                            borderRadius: "8px",
                                            marginBottom: "6px",
                                        }}
                                    />
                                ) : (
                                    <p style={{ marginBottom: "6px" }}>📂</p>
                                )}
                                <span style={{ fontSize: "12px", color: "#555" }}>{file.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}



            <div className="chat-input-container">
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

                <div className="chat-input d-flex align-items-center p-2 bg-light shadow-sm">
                    <button onClick={() => document.getElementById("fileInput").click()} className="btn border shadow   me-2 rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                            width: "35px",
                            height: "35px",
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                            color: 'white'

                        }}>
                        <FaPaperclip />
                    </button>
                    <input id="fileInput" type="file" className="rounded-circle" multiple onChange={handleFileChange} style={{ display: "none" }} />
                    {textEmoji && (
                        <div style={{ position: "absolute", bottom: "65px", left: "10px", zIndex: 1000 }}>
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                    )}
                    <button
                        className="btn border shadow   me-2 rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                            width: "35px",
                            height: "35px",
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                            color: 'white'
                        }}
                        onClick={() => setTextEmoji(!textEmoji)}
                    ><i class="fa-solid fa-face-smile"></i></button>
                    {/* <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={editMode ? handleEditMessage : handleKeyPress}
                        placeholder="Type a message..."
                        className="chat-textarea"
                    /> */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            autoResizeTextarea();
                        }}
                        onKeyDown={editMode ? handleEditMessage : handleKeyPress}
                        placeholder="Type a message..."
                        className="chat-textarea rounded"
                    />

                    <button
                        onClick={selectedFiles.length > 0 ? handleFileUpload : handleSendMessage}
                        className="btn text-white send-btn ms-2 rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                            width: "40px",
                            height: "40px",
                            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                        }}
                    >
                        <FaPaperPlane />
                    </button>
                </div>
            </div>
        </>
    );
};

export default MessageList;


