import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatBot.css';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Hi there! I am your AI Companion. How are you feeling today?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const API_URL = 'http://localhost:5000/api/chat';

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', text: inputValue.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Send history so AI has context
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      
      const res = await axios.post(API_URL, {
        message: userMsg.text,
        history: history
      });

      const botMsg = { id: Date.now() + 1, role: 'bot', text: res.data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', text: "I'm sorry, I'm having trouble connecting right now." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderText = (text) => {
    // Basic Markdown/Lines rendering
    return text.split('\n').map((line, i) => (
      <p key={i}>
        {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
      </p>
    ));
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h3 className="chatbot-title">Mind Mentor AI</h3>
                <span className="chatbot-status">Online</span>
              </div>
            </div>
            <button className="chatbot-close" onClick={toggleChat}>&times;</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div 
                  className="message-content" 
                  dangerouslySetInnerHTML={{
                     __html: msg.text.replace(/\\n/g, '<br/>').replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                  }}
                />
              </div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-container">
            <form className="chatbot-form" onSubmit={handleSubmit}>
              <input
                type="text"
                className="chatbot-input"
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isTyping}
              />
              <button type="submit" className="chatbot-submit" disabled={!inputValue.trim() || isTyping}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOpen && (
        <button className="chatbot-toggle" onClick={toggleChat} aria-label="Open Chat">
          💬
        </button>
      )}
    </div>
  );
}
