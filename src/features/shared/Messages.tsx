import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Search, ArrowLeft, Send, Phone, MoreVertical } from 'lucide-react';

const CONVERSATIONS = [
  { id: 1, name: 'Kamran Plumber', avatarName: 'Kamran+Plumber', time: '10:45 AM', message: 'I will be there in 10 minutes sir.', unread: 2, online: true },
  { id: 2, name: 'Ali Electrician', avatarName: 'Ali+Electrician', time: 'Yesterday', message: 'The wiring is fixed now. Please check.', unread: 0, online: false },
  { id: 3, name: 'Usman Cleaner', avatarName: 'Usman+Cleaner', time: 'Mon', message: 'Should I bring my own cleaning supplies?', unread: 0, online: true },
  { id: 4, name: 'Ahmed Moving', avatarName: 'Ahmed+Moving', time: 'Sun', message: 'We can schedule the truck for Friday morning.', unread: 0, online: false }
];

export function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<typeof CONVERSATIONS[0] | null>(null);
  const [replyText, setReplyText] = useState('');
  const [mockMessages, setMockMessages] = useState<{text: string, isSender: boolean}[]>([]);

  const handleOpenChat = (chat: typeof CONVERSATIONS[0]) => {
    setSelectedChat(chat);
    setMockMessages([
      { text: `Hi! I need help with a task.`, isSender: true },
      { text: chat.message, isSender: false }
    ]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setMockMessages([...mockMessages, { text: replyText, isSender: true }]);
    setReplyText('');
    
    // Simulate a reply
    setTimeout(() => {
      setMockMessages(prev => [...prev, { text: 'Got it. Thanks!', isSender: false }]);
    }, 1500);
  };

  const filteredConversations = CONVERSATIONS.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedChat) {
    return (
      <div className="flex-1 bg-gray-50 flex flex-col h-full absolute inset-0 z-50">
        {/* Chat Header */}
        <div className="bg-white px-4 py-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedChat(null)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
               <div className="relative">
                 <img src={`https://ui-avatars.com/api/?name=${selectedChat.avatarName}&background=00C4B6&color=fff`} className="w-10 h-10 rounded-full" />
                 {selectedChat.online && <div className="w-2.5 h-2.5 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 border-white"></div>}
               </div>
               <div>
                 <h2 className="text-base font-bold text-gray-900">{selectedChat.name}</h2>
                 <p className="text-xs text-gray-500">{selectedChat.online ? 'Online' : 'Offline'}</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-gray-100 text-brand-teal transition-colors">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          <div className="text-center text-xs text-gray-400 my-4">Today</div>
          {mockMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isSender ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.isSender ? 'bg-brand-teal text-white rounded-tr-sm shadow-md shadow-brand-teal/20' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        
        {/* Chat Footer */}
        <div className="bg-white p-4 border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] sticky bottom-0 z-20">
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
            <input 
              type="text" 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a message..." 
              className="flex-1 bg-gray-100 rounded-full h-12 px-4 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
            />
            <button 
              type="submit"
              disabled={!replyText.trim()}
              className="w-12 h-12 bg-brand-teal text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-600 transition-colors"
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
        {filteredConversations.length > 0 ? (
          filteredConversations.map(chat => (
            <button 
              key={chat.id} 
              onClick={() => handleOpenChat(chat)}
              className="w-full bg-white p-3 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-left hover:shadow-md border border-transparent hover:border-brand-teal/30 group"
            >
               <div className="relative">
                 <img src={`https://ui-avatars.com/api/?name=${chat.avatarName}&background=00C4B6&color=fff`} className="w-14 h-14 rounded-full" />
                 {chat.online && <div className="w-3 h-3 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 border-white"></div>}
               </div>
               <div className="flex-1 overflow-hidden">
                 <div className="flex justify-between items-baseline mb-1">
                   <h4 className="font-bold text-gray-900 truncate group-hover:text-brand-teal transition-colors">{chat.name}</h4>
                   <span className={`text-xs flex-shrink-0 ml-2 ${chat.unread > 0 ? 'text-brand-orange font-bold' : 'text-gray-400'}`}>{chat.time}</span>
                 </div>
                 <p className={`text-sm truncate ${chat.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{chat.message}</p>
               </div>
               {chat.unread > 0 && <div className="w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm">{chat.unread}</div>}
            </button>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 animate-in fade-in">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>No messages found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
