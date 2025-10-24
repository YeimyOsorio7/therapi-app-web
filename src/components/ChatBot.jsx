// src/components/ChatBot.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle'; // Make sure path is correct
import './Chatbot.css'; // Make sure this CSS file is imported

// --- !!! TEMPORARY HARDCODED USER ID - REPLACE LATER !!! ---
const TEMP_USER_ID = "BIG7g7KqwSxYc1Fl8stJ"; // Replace this with dynamic user ID logic eventually
// --- END TEMPORARY ---


const ChatBot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // --- Button Handlers (Keep your existing logic) ---
    const handleEndConversation = () => { /* ... */ };
    const handleLogout = () => { navigate('/login'); };

    // --- API Call Logic (handleSend) ---
    // ✅ Uses the payload structure from your working file
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        // Get the temporary hardcoded user ID (REPLACE THIS LATER)
        const userId = TEMP_USER_ID;
        if (!userId) {
             setMessages((prev) => [...prev, { sender: 'bot', text: 'Error FATAL: No se pudo obtener el ID de usuario.' }]);
             setIsLoading(false);
             return;
        }

        const userMessage = { sender: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput(''); // Clear input immediately
        setIsLoading(true);

        try {
            // ✅ Construct payload with direct message string and user_id
            const payload = {
                messages: input.trim(), // Send the current input string
                user_id: userId          // Use the (currently hardcoded) user ID
            };

            console.log("Sending Payload to /chat_agent:", JSON.stringify(payload, null, 2));

            // Use the direct URL
            const response = await fetch('https://us-central1-tera-bot-1ba7c.cloudfunctions.net/chat_agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload), // Send the correct payload
            });

            if (!response.ok) {
                let errorDetails = `E:${response.status}`;
                try { const errorData = await response.json(); errorDetails += `-${errorData.error || errorData.message || JSON.stringify(errorData)}`; }
                catch { try { const errorText = await response.text(); errorDetails += `-${errorText}`; } catch {/* Ignore */} }
                throw new Error(errorDetails);
            }

            const data = await response.json();
            console.log("API Data Received:", data); // Log the received data

            // ✅ Use the correct response key: 'respuesta_asistente'
            if (data && data.respuesta_asistente) {
                const botResponse = { sender: 'bot', text: data.respuesta_asistente };
                setMessages((prev) => [...prev, botResponse]);
            } else {
                 console.warn("API response missing 'respuesta_asistente' field:", data);
                 // Try falling back to 'reply' just in case, otherwise show error
                 if (data && data.reply) {
                     const botResponse = { sender: 'bot', text: data.reply };
                     setMessages((prev) => [...prev, botResponse]);
                 } else {
                    throw new Error("Respuesta inesperada de la API (faltó 'respuesta_asistente').");
                 }
            }

        } catch (error) {
            console.error('Error al conectar con la API:', error);
            setMessages((prev) => [...prev, { sender: 'bot', text: `Lo siento, hubo un error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Effects (Keep your existing logic) ---
    useEffect(() => { /* ... */ }, [messages, isLoading]);

    // --- JSX Structure (Keep your existing structure) ---
    return (
        <div className="chatbot-container">
            <header className="chat-header">
                <span className="chat-header-title">Asistente Virtual</span>
                <div className="chat-header-actions">
                    <Link to="/agendar-cita" className="chat-header-button chat-header-link-agendar"> Agendar Cita </Link>
                    <button onClick={handleEndConversation} className="chat-header-button chat-header-button-terminar"> Terminar Conversación </button>
                    <button onClick={handleLogout} className="chat-header-button chat-header-button-logout"> Cerrar Sesión </button>
                    <ThemeToggle className="theme-toggle-button" />
                </div>
            </header>
            <div ref={chatRef} className="chat-window">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-container ${msg.sender === 'user' ? 'user' : ''}`}>
                        <div className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                            {typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (<p key={i} style={{ margin: 0, minHeight: '1em' }}>{line || '\u00A0'}</p>)) : <p>{JSON.stringify(msg.text)}</p>}
                        </div>
                    </div>
                ))}
                {isLoading && (<div className="loading-indicator"><div className="loading-dots"><div><span></span><span></span><span></span></div></div></div>)}
            </div>
            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <input ref={inputRef} type="text" className="chat-input" placeholder="Escribe tu mensaje..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} disabled={isLoading} />
                    <button onClick={handleSend} disabled={isLoading} className="send-button"> {isLoading ? '...' : 'Enviar'} </button>
                </div>
            </div>
        </div>
    );
};

export default ChatBot; // Make sure this line exists