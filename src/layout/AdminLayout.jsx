// src/layout/AdminLayout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-800/60 backdrop-blur">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
            Panel Psicóloga
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user?.usuario || "—"}
          </p>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {[
            { to: "/admin/estadisticas", label: "Estadísticas" },
            { to: "/admin/citas", label: "Citas" },
            { to: "/admin/conversaciones", label: "Conversaciones" },
            { to: "/admin/notas", label: "Notas clínicas" },
            { to: "/admin/registro", label: "Registro paciente" },
            { to: "/admin/pacientes", label: "Pacientes" },
            { to: "/admin-panel", label: "Panel general" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`
              }
            >
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

      {/* Contenido */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
