import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import './Chatbot.css';
import { useAuth } from '../context/AuthContext';

// Helpers para storage por usuario
function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(`chat_history:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(userId, messages) {
  try {
    localStorage.setItem(`chat_history:${userId}`, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

// Perfil/memoria ligera
function loadProfile(userId) {
  try {
    const raw = localStorage.getItem(`chat_profile:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfile(userId, profile) {
  try {
    localStorage.setItem(
      `chat_profile:${userId}`,
      JSON.stringify({
        ...profile,
        ultimaActualizacion: new Date().toISOString(),
      })
    );
  } catch {
    // ignore
  }
}

// detectar información personal básica
// ej: "me llamo Ana", "tengo 15 años"
function maybeExtractUserFacts(userMsgText, currentProfile) {
  const updated = { ...currentProfile };

  // nombre: "me llamo <nombre>"
  const nameMatch = userMsgText.match(/me llamo\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\b/i);
  if (nameMatch) {
    updated.nombre = nameMatch[1];
  }

  // edad: "tengo 15 años", "tengo 16"
  const ageMatch = userMsgText.match(/tengo\s+(\d{1,2})\s*(años)?/i);
  if (ageMatch) {
    updated.edad = Number(ageMatch[1]);
  }

  return updated;
}

const ChatBot = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // obtenemos el user_id real desde el contexto
  const userId = user?.user_id || user?.id || null;

  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // cargar historial y perfil apenas tengamos userId
  useEffect(() => {
    if (!userId) return;
    const prevMsgs = loadHistory(userId);
    const prevProfile = loadProfile(userId);

    setMessages(prevMsgs);
    setProfile(prevProfile);
  }, [userId]);

  // guardar historial cada vez que cambian los mensajes
  useEffect(() => {
    if (!userId) return;
    saveHistory(userId, messages);
  }, [messages, userId]);

  // auto-scroll cuando llegan mensajes nuevos o está cargando
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // terminar conversación: sólo agrega un mensaje "bot"
  const handleEndConversation = () => {
    setMessages(prev => [
      ...prev,
      {
        sender: 'bot',
        text: 'La conversación ha finalizado por ahora. Cuando quieras seguir, aquí estaré 💖',
      },
    ]);
  };

  // cerrar sesión real
  const handleLogout = () => {
    logout();           // limpia user en AuthContext
    navigate('/login'); // manda al login
  };

  // enviar mensaje al bot
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!userId) {
        setMessages(prev => [
          ...prev,
          { sender: 'bot', text: 'No se detectó tu sesión. Por favor vuelve a iniciar sesión.' },
        ]);
        return;
    }

    const userText = input.trim();

    // 1. agregamos mensaje del usuario
    const userMessage = { sender: 'user', text: userText };
    setMessages(prev => [...prev, userMessage]);

    // 2. intentamos extraer info personal y guardarla en profile
    const newProfile = maybeExtractUserFacts(userText, profile);
    if (JSON.stringify(newProfile) !== JSON.stringify(profile)) {
      setProfile(newProfile);
      saveProfile(userId, newProfile);
    }

    // 3. limpiamos input / seteamos loading
    setInput('');
    setIsLoading(true);

    try {
      // armamos payload para backend
      const payload = {
        messages: userText,
        user_id: userId,
        contexto_usuario: {
          nombre: newProfile.nombre || null,
          edad: newProfile.edad || null,
        },
      };

      console.log(
        "Enviando a /chat_agent:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch(
        'https://us-central1-tera-bot-1ba7c.cloudfunctions.net/chat_agent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let errorDetails = `E:${response.status}`;
        try {
          const errorData = await response.json();
          errorDetails += `-${errorData.error || errorData.message || JSON.stringify(errorData)}`;
        } catch {
          try {
            const errorText = await response.text();
            errorDetails += `-${errorText}`;
          } catch {
            /* ignore */
          }
        }
        throw new Error(errorDetails);
      }

      const data = await response.json();
      console.log("Respuesta de la API:", data);

      let botText = null;
      if (data && data.respuesta_asistente) {
        botText = data.respuesta_asistente;
      } else if (data && data.reply) {
        botText = data.reply;
      } else {
        botText = "Lo siento, no entendí la respuesta del servidor.";
      }

      const botMessage = { sender: 'bot', text: botText };
      setMessages(prev => [...prev, botMessage]);

    } catch (err) {
      console.error("Error al conectar con la API:", err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `Lo siento, hubo un error al procesar tu mensaje: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Si entramos al chat sin userId por alguna razón, mensaje seguro
  if (!userId) {
    return (
      <div className="chatbot-container">
        <div className="chat-window">
          <div className="message bot">
            No tienes una sesión activa. Por favor inicia sesión nuevamente.
          </div>
        </div>
        <div className="chat-input-area">
          <button
            className="chat-header-button chat-header-button-logout"
            onClick={() => navigate('/login')}
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chatbot-container">
      <header className="chat-header">
        <span className="chat-header-title">
          {profile?.nombre
            ? `Hola ${profile.nombre} 👋`
            : "Asistente Virtual"}
        </span>

        <div className="chat-header-actions">
          <Link
            to="/agendar-cita"
            className="chat-header-button chat-header-link-agendar"
          >
            Agendar Cita
          </Link>

          <button
            onClick={handleEndConversation}
            className="chat-header-button chat-header-button-terminar"
          >
            Terminar Conversación
          </button>

          <button
            onClick={handleLogout}
            className="chat-header-button chat-header-button-logout"
          >
            Cerrar Sesión
          </button>

          <ThemeToggle className="theme-toggle-button" />
        </div>
      </header>

      <div ref={chatRef} className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-container ${
              msg.sender === 'user' ? 'user' : ''
            }`}
          >
            <div
              className={`message ${
                msg.sender === 'user' ? 'user' : 'bot'
              }`}
            >
              {typeof msg.text === 'string'
                ? msg.text.split('\n').map((line, i) => (
                    <p
                      key={i}
                      style={{ margin: 0, minHeight: '1em' }}
                    >
                      {line || '\u00A0'}
                    </p>
                  ))
                : <p>{JSON.stringify(msg.text)}</p>}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <div>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

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
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="send-button"
          >
            {isLoading ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
