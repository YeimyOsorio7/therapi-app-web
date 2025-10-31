// src/layout/AdminLayout.jsx
import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [openMobile, setOpenMobile] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: "estadisticas", label: "Estadísticas" },
    { to: "registro", label: "Registro paciente" },
    { to: "citas", label: "Citas" },
    { to: "notas", label: "Reportes Clínicos" },
    { to: "notas-evolutivas", label: "Notas Evolutivas" },
    { to: "pacientes", label: "Pacientes" },
  ];

  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-md text-sm font-medium ${
      isActive
        ? "bg-indigo-600 text-white"
        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
    }`;

  useEffect(() => {
    if (openMobile) setOpenMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = openMobile ? "hidden" : "";
  }, [openMobile]);

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] dark:bg-gray-900">
      {/* Topbar móvil — fijo arriba, solo botón */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center px-2 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-800/90 backdrop-blur h-12">
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={openMobile}
          onClick={() => setOpenMobile(true)}
          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Sidebar escritorio */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-800/60 backdrop-blur">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">Panel Psicóloga</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user?.usuario || "Licda. Maura Violeta"}
          </p>
        </div>

        <nav className="p-3 flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={logout}
            className="w-full px-3 py-2 rounded-md text-sm bg-rose-600 text-white hover:bg-rose-700"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Drawer móvil con botón Salir adentro */}
      {openMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setOpenMobile(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 transform transition-transform duration-200 translate-x-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">Panel Psicóloga</h2>
              <button
                aria-label="Cerrar menú"
                onClick={() => setOpenMobile(false)}
                className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800 dark:text-gray-100" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.415L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10 3.636 5.05l1.414-1.414L10 8.586z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {user?.usuario || "Licda. Maura Violeta"}
              </p>
            </div>

            <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setOpenMobile(false);
                  logout();
                }}
                className="w-full px-3 py-2 rounded-md text-sm bg-rose-600 text-white hover:bg-rose-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {/* Contenido */}
      <main className="flex-1 min-w-0">
        {/* padding-top para dejar espacio al topbar fijo en móvil */}
        <div className="pt-12 md:pt-0 max-w-none lg:max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
