import ChatBot from './components/ChatBot';
import './index.css'; // Asegúrate de que los estilos de Tailwind estén aquí

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-teal-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <ChatBot /> 
    </div>
  );
}

export default App;   