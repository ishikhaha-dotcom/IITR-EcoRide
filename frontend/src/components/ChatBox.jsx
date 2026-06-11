import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function ChatBox({ rideId, currentUserId, receiverId, isOpen, onClose }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const endOfMessagesRef = useRef(null);

  // Quick replies configuration
  const quickReplies = user?.role === 'driver' ? [
    "I've arrived at the location",
    "I'm on my way",
    "Can you call me?",
    "Please come to the pickup point",
    "I'll be there in a few minutes"
  ] : [
    "I'm coming",
    "I've reached at the pickup point",
    "Please call me",
    "I am near the entrance",
    "I'll be there in a minute"
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !isOpen) return;

    function onNewMessage(msg) {
      if (msg.ride_id === rideId) {
        setMessages((prev) => [...prev, msg]);
      }
    }

    function onMessageSentSuccess(msg) {
      if (msg.ride_id === rideId) {
        setMessages((prev) => [...prev, msg]);
      }
    }

    socket.on('new_message', onNewMessage);
    socket.on('message_sent_success', onMessageSentSuccess);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_sent_success', onMessageSentSuccess);
    };
  }, [socket, isOpen, rideId]);

  function handleSend(e) {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    socket?.emit('send_message', {
      rideId,
      receiverId,
      message_text: newMessage,
    });
    setNewMessage('');
  }

  function handleQuickReplyClick(text) {
    socket?.emit('send_message', {
      rideId,
      receiverId,
      message_text: text,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden h-[480px] animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
          <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm shadow-sm">💬</span>
          Live Chat
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-3xl mb-2 opacity-50">👋</span>
            <p className="text-sm font-medium">Say hello to coordinate!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-teal-500 text-white rounded-br-sm' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  {msg.message_text}
                </div>
              </div>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Quick Replies Panel */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
        {quickReplies.map((reply, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleQuickReplyClick(reply)}
            className="inline-block bg-white hover:bg-teal-50 hover:text-teal-600 border border-slate-200 hover:border-teal-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all cursor-pointer select-none active:scale-95"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-3">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder-slate-400 font-medium"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl transition-all font-bold shadow-md active:translate-y-px"
        >
          Send
        </button>
      </form>
    </div>
  );
}
