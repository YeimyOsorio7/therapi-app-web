// src/components/Header.jsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const [open, setOpen] = useState(false);

  // Cierra el menú móvil al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  const showLoginLink = currentPath !== "/login";
  const showCreateUserLink = currentPath !== "/crear-usuario";
  const showChatLink = currentPath !== "/"; // mostrará el link a Inicio cuando NO estás en "/"

  const linkBase =
    "block px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkIdle =
    "text-gray-700 hover:text-sky-600 dark:text-gray-300 dark:hover:text-sky-400";
  const linkActive =
    "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-gray-800";

  const linkClass = (isActive) =>
    `${linkBase} ${isActive ? linkActive : linkIdle}`;

  return (
    <header className="fixed top-0 inset-x-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md z-50 border-b border-gray-200 dark:border-gray-700">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Barra superior */}
        <div className="flex items-center justify-between h-16">
          {/* Marca */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="text-2xl sm:text-3xl font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-500 transition-colors duration-200"
              style={{
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "1px",
                textShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              Therapy-Bot
            </Link>
          </div>

          {/* Acciones derecha (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {showChatLink && (
              <Link to="/" className={linkClass(currentPath === "/")}>
                Inicio
              </Link>
            )}
            {showLoginLink && (
              <Link
                to="/login"
                className={linkClass(currentPath === "/login")}
              >
                Iniciar Sesión
              </Link>
            )}
            {showCreateUserLink && (
              <Link
                to="/Registro"
                className={linkClass(
                  currentPath.toLowerCase() === "/registro"
                )}
              >
                Registrarme
              </Link>
            )}
            <ThemeToggle />
          </div>

          {/* Botón hamburguesa (mobile) */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={open ? "true" : "false"}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {/* Ícono hamburguesa / cerrar */}
              <svg
                className={`h-6 w-6 transition-transform ${open ? "rotate-90" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {open ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Panel móvil */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${
            open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pb-3 pt-2 space-y-1 border-t border-gray-200 dark:border-gray-800">
            {showChatLink && (
              <Link
                to="/"
                className={`${linkClass(currentPath === "/")} mx-1`}
              >
                Inicio
              </Link>
            )}
            {showLoginLink && (
              <Link
                to="/login"
                className={`${linkClass(currentPath === "/login")} mx-1`}
              >
                Iniciar Sesión
              </Link>
            )}
            {showCreateUserLink && (
              <Link
                to="/Registro"
                className={`${linkClass(
                  currentPath.toLowerCase() === "/registro"
                )} mx-1`}
              >
                Registrarme
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
