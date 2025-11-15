import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle'; // si este archivo está en /components, cambia a "./ThemeToggle"
import './Chatbot.css';
import { useAuth } from '../context/AuthContext';

// Helpers para storage por usuario
function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(`chat_history:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(userId, messages) {
  try { localStorage.setItem(`chat_history:${userId}`, JSON.stringify(messages)); } catch { console.error("Error saving chat history:", userId); }
}
function loadProfile(userId) {
  try {
    const raw = localStorage.getItem(`chat_profile:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    console.error("Error loading profile:", userId);
    return {};
  }
}
function saveProfile(userId, profile) {
  try {
    localStorage.setItem(`chat_profile:${userId}`, JSON.stringify({
      ...profile, ultimaActualizacion: new Date().toISOString(),
    }));
  } catch {
    console.error("Error saving profile:", userId);
  }
}

// detectar datos básicos
function maybeExtractUserFacts(userMsgText, currentProfile) {
  const updated = { ...currentProfile };
  const nameMatch = userMsgText.match(/me llamo\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\b/i);
  if (nameMatch) updated.nombre = nameMatch[1];
  const ageMatch = userMsgText.match(/tengo\s+(\d{1,2})\s*(años)?/i);
  if (ageMatch) updated.edad = Number(ageMatch[1]);
  return updated;
}
function clearUserHistory(userId) {
  try {
    localStorage.removeItem(`chat_history:${userId}`);
    localStorage.removeItem(`chat_profile:${userId}`);
  } catch {
    console.error("Error clearing user history:", userId);
  }
}
async function sendConversationReport(userId, options = {}) {
  const { useBeacon = false, keepalive = false } = options;
  try {
    if (useBeacon) {
      const blob = new Blob([JSON.stringify({ user_id: userId })], { type: 'application/json' });
      navigator.sendBeacon('https://us-central1-tera-bot-1ba7c.cloudfunctions.net/agente_generador_reporte', blob);
    } else {
      await fetch('https://us-central1-tera-bot-1ba7c.cloudfunctions.net/agente_generador_reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        ...(keepalive && { keepalive: true }),
      });
    }
  } catch {
    console.error("Error sending conversation report for user:", userId);
  }
}

const ChatBot = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userId = user?.user_id || user?.id || null;

  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);

  // 👇 NUEVO: estado del menú hamburguesa (móvil)
  const [menuOpen, setMenuOpen] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setMessages(loadHistory(userId));
    setProfile(loadProfile(userId));
  }, [userId]);

  useEffect(() => { if (userId) saveHistory(userId, messages); }, [messages, userId]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isLoading]);

  // cerrar panel en unload y al desmontar
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!conversationEnded && userId && messages.length > 0) {
        sendConversationReport(userId, { useBeacon: true });
        clearUserHistory(userId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!conversationEnded && userId && messages.length > 0) {
        sendConversationReport(userId, { keepalive: true });
        clearUserHistory(userId);
      }
    };
  }, [userId, messages.length, conversationEnded]);

  const handleEndConversation = async () => {
    if (!userId) return;
    setConversationEnded(true);
    setMessages(prev => [...prev, {
      sender: 'bot',
      text: 'Gracias por compartir conmigo. Ha sido un placer acompañarte en esta conversación 💖\n\nTe recomiendo agendar una cita con la doctora para continuar con tu proceso. Puedes hacerlo desde el botón "Agendar Cita" en la parte superior.',
    }]);
    await sendConversationReport(userId);
    clearUserHistory(userId);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!userId) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'No se detectó tu sesión. Por favor vuelve a iniciar sesión.' }]);
      return;
    }
    const userText = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);

    const newProfile = maybeExtractUserFacts(userText, profile);
    if (JSON.stringify(newProfile) !== JSON.stringify(profile)) {
      setProfile(newProfile); saveProfile(userId, newProfile);
    }
    setInput(''); setIsLoading(true);

    try {
      const payload = { messages: userText, user_id: userId, contexto_usuario: { nombre: newProfile.nombre || null, edad: newProfile.edad || null } };
      const res = await fetch('https://us-central1-tera-bot-1ba7c.cloudfunctions.net/chat_agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let detail = `E:${res.status}`;
        try {
          const j = await res.json(); detail += `-${j.error || j.message || JSON.stringify(j)}`;
        } catch {
          try {
            detail += `-${await res.text()}`;
          } catch {
            detail += '-unknown error';
          }
        }
        throw new Error(detail);
      }
      const data = await res.json();
      const botText = data?.respuesta_asistente || data?.reply || "Lo siento, no entendí la respuesta del servidor.";
      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: `Lo siento, hubo un error al procesar tu mensaje: ${err.message}` }]);
    } finally { setIsLoading(false); }
  };

  if (!userId) {
    return (
      <div className="chatbot-container">
        <div className="chat-window">
          <div className="message bot">No tienes una sesión activa. Por favor inicia sesión nuevamente.</div>
        </div>
        <div className="chat-input-area">
          <button className="chat-header-button chat-header-button-logout" onClick={() => navigate('/login')}>Ir al login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chatbot-container">
      {/* ===== Encabezado con menú hamburguesa ===== */}
      <header className="chat-header" role="banner">
        <span className="chat-header-title">
          {profile?.nombre ? `Hola ${profile.nombre} 👋` : "Asistente Virtual"}
        </span>

        {/* Lado derecho: toggle + tema en móvil, acciones visibles en desktop */}
        <div className="chat-header-right">
          {/* Desktop: acciones inline */}
          <div className="chat-actions-desktop">
            <Link to="/agendar-cita" className="chat-header-button chat-header-link-agendar">Agendar Cita</Link>
            <button onClick={handleEndConversation} className="chat-header-button chat-header-button-terminar">Terminar Conversación</button>
            <button onClick={handleLogout} className="chat-header-button chat-header-button-logout">Cerrar Sesión</button>
            <ThemeToggle className="theme-toggle-button" aria-label="Cambiar tema" />
          </div>

          {/* Mobile: tema + hamburguesa */}
          <div className="chat-actions-mobile">
            <ThemeToggle className="theme-toggle-button" aria-label="Cambiar tema" />
            <button
              className="hamburger-btn"
              aria-label="Abrir menú"
              aria-expanded={menuOpen ? 'true' : 'false'}
              onClick={() => setMenuOpen(v => !v)}
            >
              <svg className={`hb-icon ${menuOpen ? 'open' : ''}`} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
                {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Panel desplegable (solo móvil) */}
        <div className={`chat-actions-panel ${menuOpen ? 'open' : ''}`}>
          <Link to="/agendar-cita" className="chat-header-button chat-header-link-agendar" onClick={() => setMenuOpen(false)}>
            Agendar Cita
          </Link>
          <button className="chat-header-button chat-header-button-terminar" onClick={() => { setMenuOpen(false); handleEndConversation(); }}>
            Terminar Conversación
          </button>
          <button className="chat-header-button chat-header-button-logout" onClick={() => { setMenuOpen(false); handleLogout(); }}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* ===== Ventana de chat ===== */}
      <div ref={chatRef} className="chat-window" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`message-container ${msg.sender === 'user' ? 'user' : ''}`}>
            <div className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
              {typeof msg.text === 'string'
                ? msg.text.split('\n').map((line, j) => (
                    <p key={j} style={{ margin: 0, minHeight: '1em' }}>{line || '\u00A0'}</p>
                  ))
                : <p>{JSON.stringify(msg.text)}</p>}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="loading-indicator" aria-label="Cargando">
            <div className="loading-dots"><div><span></span><span></span><span></span></div></div>
          </div>
        )}
      </div>

      {/* ===== Input ===== */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            aria-label="Mensaje"
          />
          <button onClick={handleSend} disabled={isLoading} className="send-button" aria-label="Enviar mensaje">
            {isLoading ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
