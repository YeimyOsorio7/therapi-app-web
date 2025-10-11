import { useState, useEffect, useRef } from 'react';
import { create_response } from '../services/openai.js';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // New: logout handler
  const handleLogout = () => {
    alert('Gracias por usar el asistente. ¡Hasta pronto!');
    window.location.href = '/';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Preparar toda la conversación para mantener el contexto
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Llamar al servicio de OpenAI con toda la conversación
      const response = await create_response(conversationHistory);
      console.log("Response from create_response:", response);
      
      // Extraer el contenido de la respuesta del modelo
      const botText = response;
      
      const botResponse = { sender: 'bot', text: botText };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, {
        sender: 'bot',
        text: 'Error al conectar con el servicio de IA. Intenta más tarde.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Mensaje inicial del bot
    if (messages.length === 0) {
      const welcomeMessage = {
        sender: 'bot',
        text: 'Hola, soy tu asistente psicológico virtual. Estoy aquí para escucharte y ofrecerte apoyo emocional. ¿En qué puedo ayudarte hoy? 🌱'
      };
      setMessages([welcomeMessage]);
    }

    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-gray-800 dark:text-white p-6 rounded-2xl shadow-xl border border-sky-100 dark:border-gray-700 transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-center text-sky-700 dark:text-sky-300">
          🧘 Asistente Emocional Virtual
        </h2>
        <button
          onClick={handleLogout}
          className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-sm transition-all"
        >
          Terminar sesión
        </button>
      </div>

      <div
        ref={chatRef}
        className="h-96 overflow-y-auto px-4 py-3 rounded-lg bg-sky-50 dark:bg-gray-700 space-y-3 border border-sky-100 dark:border-gray-600 transition-colors"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-xl text-sm shadow transition-colors ${
                msg.sender === 'user'
                  ? 'bg-sky-300 text-white rounded-br-none dark:bg-sky-500'
                  : 'bg-white text-gray-700 border border-sky-100 rounded-bl-none dark:bg-gray-600 dark:text-white dark:border-gray-500'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-2 rounded-xl text-sm bg-white text-gray-700 border border-sky-100 rounded-bl-none dark:bg-gray-600 dark:text-white dark:border-gray-500">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 w-full flex-col sm:flex-row">
        <input
          type="text"
          ref={inputRef}
          className="w-full flex-1 border border-sky-300 dark:border-gray-600 focus:ring-2 focus:ring-sky-400 focus:outline-none px-4 py-2 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors"
          placeholder="Escribe tu mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />

        <button
          onClick={handleSend}
          disabled={isLoading}
          className={`flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-sm transition-all w-full sm:w-auto ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </span>
          ) : (
            <>
              <span className="block sm:hidden text-xl">📩</span>
              <span className="hidden sm:block">Enviar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatBot;