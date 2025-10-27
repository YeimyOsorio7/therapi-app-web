import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute, AdminRoute } from "./routes/Guards";

// Layouts
import AdminLayout from "./layout/AdminLayout.jsx";

// 🔓 Rutas públicas
import Inicio from "./pages/Inicio.jsx";
import AuthLogin from "./pages/AuthLogin.jsx";
import Registro from "./pages/Registro.jsx";

// 🔒 Rutas privadas para usuario autenticado
import Chat from "./components/ChatBot.jsx";
import Schedule from "./pages/Schedule.jsx";
import AgendarCita from "./pages/AgendarCita.jsx";
import Recursos from "./pages/Recursos.jsx";

// 🔒 Rutas privadas para admin/psicóloga
import Citas from "./pages/Citas.jsx";
import Conversaciones from "./pages/Conversaciones.jsx";
import NotasClinicas from "./pages/NotasClinicas.jsx";
import Estadisticas from "./pages/Estadisticas.jsx";
import RegistroPaciente from "./pages/RegistroPaciente.jsx";
import VerPacientes from "./pages/VerPacientes.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ==== RUTAS PÚBLICAS ==== */}
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/registro" element={<Registro />} />

          {/* ==== RUTAS PRIVADAS (requieren sesión válida) ==== */}
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />

          <Route
            path="/schedule"
            element={
              <PrivateRoute>
                <Schedule />
              </PrivateRoute>
            }
          />

          <Route
            path="/agendar-cita"
            element={
              <PrivateRoute>
                <AgendarCita />
              </PrivateRoute>
            }
          />

          <Route
            path="/recursos"
            element={
              <PrivateRoute>
                <Recursos />
              </PrivateRoute>
            }
          />

          {/* ==== ÁREA ADMIN (psicóloga / admin:true) ==== */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route
              path="citas"
              element={
                <AdminRoute>
                  <Citas />
                </AdminRoute>
              }
            />
            <Route
              path="conversaciones"
              element={
                <AdminRoute>
                  <Conversaciones />
                </AdminRoute>
              }
            />
            <Route
              path="notas"
              element={
                <AdminRoute>
                  <NotasClinicas />
                </AdminRoute>
              }
            />
            <Route
              path="estadisticas"
              element={
                <AdminRoute>
                  <Estadisticas />
                </AdminRoute>
              }
            />
            <Route
              path="registro"
              element={
                <AdminRoute>
                  <RegistroPaciente />
                </AdminRoute>
              }
            />
            <Route
              path="pacientes"
              element={
                <AdminRoute>
                  <VerPacientes />
                </AdminRoute>
              }
            />
          </Route>

          {/* ==== Fallback ==== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
