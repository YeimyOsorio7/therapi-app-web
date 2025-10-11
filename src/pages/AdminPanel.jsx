// src/pages/AdminPanel.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const AdminPanel = () => {
  const navigate = useNavigate();

  // Proteger acceso: solo para la psicóloga (auth interno)
  useEffect(() => {
    const isAdmin = localStorage.getItem("auth") === "true";
    const user = localStorage.getItem("currentUser");
    if (!isAdmin || user !== "psicologa") navigate("/login");
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  const linkBase =
    "flex items-center gap-3 px-3 py-2 rounded text-gray-800 hover:bg-gray-100 transition dark:text-gray-100 dark:hover:bg-gray-700";

  const linkActive =
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200";

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Menú lateral */}
      <aside className="w-80 max-w-[320px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
        <h2 className="text-2xl font-bold text-sky-600 dark:text-sky-300 flex items-center gap-2 mb-4">
          <span>🧠</span> Psicóloga
        </h2>

        <nav className="flex flex-col gap-2">
          <NavLink to="/admin/citas"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>🗓️</span> Citas
          </NavLink>

          <NavLink to="/admin/conversaciones"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>💬</span> Conversaciones
          </NavLink>

          <NavLink to="/admin/notas"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>📝</span> Notas clínicas
          </NavLink>

          <NavLink to="/admin/estadisticas"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>📊</span> Estadísticas
          </NavLink>

          <NavLink to="/admin/recursos"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>📁</span> Recursos
          </NavLink>

          <NavLink to="/admin/registro"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>🧾</span> Registro
          </NavLink>

          <NavLink to="/admin/pacientes"
                   className={({isActive}) => `${linkBase} ${isActive ? linkActive : ""}`}>
            <span>👩‍⚕️</span> Pacientes
          </NavLink>
        </nav>

        <button
          onClick={logout}
          className="mt-auto bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-3 rounded shadow transition flex items-center justify-center gap-2"
        >
          🧱 Cerrar sesión
        </button>
      </aside>

      {/* Área de trabajo vacía (puedes poner un mensaje de bienvenida) */}
      <main className="flex-1 p-6 text-gray-700 dark:text-gray-200">
        <div className="h-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <p className="text-sm">
            Selecciona una opción del menú para comenzar.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;

