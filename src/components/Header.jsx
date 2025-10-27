// src/components/Header.jsx
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Placeholder logout function
  const handleLogout = () => {
    console.log("Cerrar Sesión");
    // Add your actual logout logic here (e.g., clear token, redirect)
    // navigate('/login'); // Example redirect after logout
  };

  // Determine which links to show based on the current path
  const showLoginLink = currentPath !== '/login';
  const showCreateUserLink = currentPath !== '/crear-usuario';
  const showChatLink = currentPath !== '/'; // Link to go back to chat

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-md z-50 border-b border-gray-200 dark:border-gray-700">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-sky-600 dark:text-sky-400 hover:opacity-80 transition-opacity">
              THERAPY-BOOT {/* Or your App Name */}
            </Link>
          </div>

          {/* Navigation Links and Theme Toggle */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {showChatLink && (
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Chat
              </Link>
            )}
             {showLoginLink && (
              <Link
                to="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </Link>
            )}
            {showCreateUserLink && (
              <Link
                to="/Registro"
                className="text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Crear Usuario
              </Link>
            )}
            {/* Theme Toggle Button */}
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;