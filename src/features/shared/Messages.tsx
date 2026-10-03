import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowLeft, Send } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  getMyBookings, getMessages, getLatestMessages, sendMessage, markMessagesRead, onMessagesChange, avatarUrl,
  type MessageRecord, type MyBooking,
} from '../../lib/marketplace';

// One conversation per booking, between its customer and helper. Messages are stored in
// Supabase (RLS: only the two parties) and arrive through Realtime.

function formatTime(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

const CLOSED_STATUSES = ['Rejected', 'Cancelled'];

export function MessagesScreen() {
  const role = useAppStore(state => state.role);
  const userId: string | undefined = useAppStore(state => state.user?.id);
  const addToast = useAppStore(state => state.addToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<MyBooking[]>([]);
  const [latest, setLatest] = useState<Record<string, MessageRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<MyBooking | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Conversations: this mode's bookings that were not declined or cancelled
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = (await getMyBookings())
          .filter(b => (role === 'helper' ? b.my_role === 'helper' : b.my_role === 'customer'))
          .filter(b => !CLOSED_STATUSES.includes(b.status));
        const last = await getLatestMessages(rows.map(b => b.booking_id));
        if (!active) return;
        setConversations(rows);
        setLatest(last);
      } catch (err: any) {
        addToast(err?.message || 'Could not load conversations.', 'error');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [role, selectedChat]);

  // Open chat: load, mark read, and follow new messages
  useEffect(() => {
    if (!selectedChat) return;
    const bookingId = selectedChat.booking_id;
    const load = () => getMessages(bookingId)
      .then(rows => {
        setMessages(rows);
        if (rows.some(m => m['Sender-id'] !== userId && !m['Read-at'])) markMessagesRead(bookingId).catch(() => {});
      })
      .catch(err => addToast(err?.message || 'Could not load messages.', 'error'));
    load();
    return onMessagesChange(bookingId, load);
  }, [selectedChat, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(selectedChat.booking_id, replyText);
      setReplyText('');
      setMessages(await getMessages(selectedChat.booking_id));
    } catch (err: any) {
      addToast(err?.message || 'Could not send the message.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(chat => {
    const q = searchQuery.toLowerCase();
    return (chat.counterpart_name || '').toLowerCase().includes(q)
      || (chat.title || '').toLowerCase().includes(q)
      || (latest[chat.booking_id]?.Body || '').toLowerCase().includes(q);
  });

  if (selectedChat) {
    const name = selectedChat.counterpart_name || (selectedChat.my_role === 'customer' ? 'Your helper' : 'Customer');
    return (
      <div className="flex-1 bg-gray-50 flex flex-col h-full absolute inset-0 z-50">
        {/* Chat Header */}
        <div className="bg-white px-4 py-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedChat(null); setMessages([]); }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
               <img src={avatarUrl(name)} className="w-10 h-10 rounded-full" />
               <div>
                 <h2 className="text-base font-bold text-gray-900">{name}</h2>
                 <p className="text-xs text-gray-500">{selectedChat.title || 'Task'} • {selectedChat.status.replace(/-/g, ' ')}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {messages.length === 0 && (
            <div className="text-center text-xs text-gray-400 my-4">No messages yet. Say hello to coordinate the job.</div>
          )}
          {messages.map((msg) => {
            const mine = msg['Sender-id'] === userId;
            return (
              <div key={msg.ID} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-brand-teal text-white rounded-tr-sm shadow-md shadow-brand-teal/20' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.Body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                    {formatTime(msg['Created-at'])}{mine && msg['Read-at'] ? ' • Read' : ''}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Chat Footer */}
        <div className="bg-white p-4 border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] sticky bottom-0 z-20">
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              maxLength={2000}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 rounded-full h-12 px-4 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSending}
              className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-orange-hover transition-colors"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pb-24 h-full">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 sticky top-0">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 rounded-full h-10 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>
      </div>
      <div className="p-4 space-y-2 overflow-y-auto">
        {isLoading && <p className="text-center text-sm text-gray-500 py-12">Loading conversations…</p>}
        {!isLoading && conversations.length === 0 && (
          <div className="text-center py-12 text-gray-500 animate-in fade-in">
            <p>No conversations yet. You can message {role === 'helper' ? 'a customer' : 'your helper'} once a booking is made.</p>
          </div>
        )}
        {filteredConversations.map(chat => {
          const last = latest[chat.booking_id];
          const unread = Boolean(last && last['Sender-id'] !== userId && !last['Read-at']);
          const name = chat.counterpart_name || (chat.my_role === 'customer' ? 'Your helper' : 'Customer');
          return (
            <button
              key={chat.booking_id}
              onClick={() => setSelectedChat(chat)}
              className="w-full bg-white p-3 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-left hover:shadow-md border border-transparent hover:border-brand-teal/30 group"
            >
               <img src={avatarUrl(name)} className="w-14 h-14 rounded-full" />
               <div className="flex-1 overflow-hidden">
                 <div className="flex justify-between items-baseline mb-1">
                   <h4 className="font-bold text-gray-900 truncate group-hover:text-brand-teal transition-colors">{name}</h4>
                   <span className={`text-xs flex-shrink-0 ml-2 ${unread ? 'text-brand-orange font-bold' : 'text-gray-400'}`}>{formatTime(last?.['Created-at'] || chat.created_at)}</span>
                 </div>
                 <p className={`text-sm truncate ${unread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{last?.Body || chat.title || 'Task'}</p>
               </div>
               {unread && <div className="w-3 h-3 bg-brand-orange rounded-full flex-shrink-0 shadow-sm"></div>}
            </button>
          );
        })}
        {!isLoading && conversations.length > 0 && filteredConversations.length === 0 && (
          <div className="text-center py-12 text-gray-500 animate-in fade-in">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>No messages found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
