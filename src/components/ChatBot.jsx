// src/components/ChatBot.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle'; // Make sure path is correct

// ✅ Import the CSS file
import './Chatbot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // --- Button Handlers ---
  const handleEndConversation = () => {
    console.log("Terminar Conversación clicked");
    setMessages([{ sender: 'bot', text: 'Conversación terminada. ¿Cómo puedo ayudarte ahora?' }]);
    setInput('');
  };

  const handleLogout = () => {
    console.log("Cerrar Sesión clicked");
    // Add actual logout logic here
    navigate('/login'); // Navigate to login page if it exists
  };

  // --- API Call Logic (handleSend) ---
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      // Assumes you have a proxy setup in vite.config.js for /api
      const response = await fetch('/api/chat_agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Lo siento, algo salió mal.' }]);
    } finally {
      setInput(''); setIsLoading(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ sender: 'bot', text: 'Hola, soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' }]);
    }
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    if (inputRef.current) inputRef.current.focus();
  }, [messages, isLoading]);

  // --- JSX Structure using CSS Class Names ---
  return (
    // Main container uses .chatbot-container
    <div className="chatbot-container">

      {/* Header uses .chat-header */}
      <header className="chat-header">
         {/* Title (Optional) */}
         <span className="chat-header-title">Asistente Virtual</span>

        {/* Right Side: Actions & Theme Toggle using .chat-header-actions */}
        <div className="chat-header-actions">
          <Link
            to="/agendar-cita" // Make sure this route exists if needed
            className="chat-header-button chat-header-link-agendar"
          >
            Agendar Cita
          </Link>
          <button
            onClick={handleEndConversation}
            className="chat-header-button chat-header-button-terminar"
            title="Terminar la conversación actual"
          >
            Terminar Conversación
          </button>
          <button
            onClick={handleLogout}
            className="chat-header-button chat-header-button-logout"
          >
            Cerrar Sesión
          </button>
          {/* Apply the theme toggle button class */}
          <ThemeToggle className="theme-toggle-button"/>
        </div>
      </header>

      {/* Chat Window uses .chat-window */}
      <div ref={chatRef} className="chat-window">
        {messages.map((msg, index) => (
          // Wrapper div for alignment: .message-container .user
          <div key={index} className={`message-container ${msg.sender === 'user' ? 'user' : ''}`}>
            {/* Message bubble: .message .user or .bot */}
            <div className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        {/* Loading Indicator: .loading-indicator > .loading-dots */}
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <div><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area uses CSS classes */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="chat-input" // .chat-input
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="send-button" // .send-button
          >
            {isLoading ? ( /* Loading indicator */ '...' ) : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;