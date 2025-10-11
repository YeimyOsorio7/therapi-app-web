// src/components/Header.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle"; // asegúrate de que la ruta sea correcta

const Header = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const isChat = pathname.startsWith("/chat");

  const btn = (active, base = "") =>
    active
      ? "bg-indigo-600 text-white"
      : `${base} text-gray-700 dark:text-gray-200 hover:bg-gray-100/40 dark:hover:bg-gray-800/40`;

  const closeMenu = () => setOpen(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-transparent backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2 shrink-0">
          <span className="text-xl" role="img" aria-label="brain">🧠</span>
          <span className="text-lg md:text-xl font-extrabold text-indigo-700 dark:text-indigo-300">
            THERAPY-BOOT
          </span>
        </Link>

        {/* Navegación escritorio */}
        <nav className="hidden md:flex items-center gap-3">
          <Link
            to="/"
            onClick={closeMenu}
            className={`px-3 py-1.5 rounded font-medium text-sm ${btn(pathname === "/")}`}
          >
            Inicio
          </Link>

          {isChat && (
            <>
              <Link
                to="/chat"
                onClick={closeMenu}
                className={`px-3 py-1.5 rounded font-medium text-sm ${btn(
                  pathname.startsWith("/chat"),
                  "border border-gray-200 dark:border-gray-700"
                )}`}
              >
                Probar el chat
              </Link>
              <Link
                to="/cita"
                onClick={closeMenu}
                className={`px-3 py-1.5 rounded font-medium text-sm ${btn(
                  pathname === "/cita",
                  "border border-gray-200 dark:border-gray-700"
                )}`}
              >
                Agendar cita
              </Link>
            </>
          )}

          <Link
            to="/login"
            onClick={closeMenu}
            className={`px-3 py-1.5 rounded font-medium text-sm ${btn(
              pathname === "/login",
              "border border-gray-200 dark:border-gray-700"
            )}`}
          >
            Iniciar sesión
          </Link>

          <ThemeToggle />
        </nav>

        {/* Botón Hamburguesa en móvil */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2 rounded-md border border-gray-200 dark:border-gray-700"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {/* Icono hamburguesa */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700 dark:text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Navegación móvil */}
      <nav
        id="mobile-nav"
        className={`md:hidden transition-[max-height] duration-300 overflow-hidden ${
          open ? "max-h-64" : "max-h-0"
        }`}
      >
        <div className="px-4 pb-3 flex flex-col gap-2">
          <Link
            to="/"
            onClick={closeMenu}
            className={`px-3 py-2 rounded font-medium text-sm ${btn(pathname === "/")}`}
          >
            Inicio
          </Link>

          {isChat && (
            <>
              <Link
                to="/chat"
                onClick={closeMenu}
                className={`px-3 py-2 rounded font-medium text-sm ${btn(
                  pathname.startsWith("/chat"),
                  "border border-gray-200 dark:border-gray-700"
                )}`}
              >
                Probar el chat
              </Link>
              <Link
                to="/cita"
                onClick={closeMenu}
                className={`px-3 py-2 rounded font-medium text-sm ${btn(
                  pathname === "/cita",
                  "border border-gray-200 dark:border-gray-700"
                )}`}
              >
                Agendar cita
              </Link>
            </>
          )}

          <Link
            to="/login"
            onClick={closeMenu}
            className={`px-3 py-2 rounded font-medium text-sm ${btn(
              pathname === "/login",
              "border border-gray-200 dark:border-gray-700"
            )}`}
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
