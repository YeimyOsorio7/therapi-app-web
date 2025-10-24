import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute, AdminRoute } from "./routes/Guards";

// Páginas públicas
import Inicio from "./pages/Inicio.jsx";
import App from "./App.jsx";                      // ChatBot (según tu código)
import Schedule from "./pages/Schedule.jsx";
import Layout from "./layout/Layout.jsx";

// Auth
import AuthLogin from "./pages/AuthLogin.jsx";
import Registro from "./pages/Registro.jsx";

// Admin
import AdminLayout from "./layout/AdminLayout.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Citas from "./pages/Citas.jsx";
import Conversaciones from "./pages/Conversaciones.jsx";
import NotasClinicas from "./pages/NotasClinicas.jsx";
import Estadisticas from "./pages/Estadisticas.jsx";
import RegistroPaciente from "./pages/RegistroPaciente.jsx";
import VerPacientes from "./pages/VerPacientes.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas con Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Inicio />} />

            {/* ✅ RUTA CORREGIDA AQUÍ */}
            <Route path="/agendar-cita" element={<Schedule />} />
            {/* Antes era: <Route path="/cita" element={<Schedule />} /> */}

            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <App /> {/* Asumo que App contiene tu ChatBot */}
                </PrivateRoute>
              }
            />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<AuthLogin />} />
          {/* Asegúrate que la ruta de Registro sea '/registro' si ChatBot usa '/crear-usuario' */}
          <Route path="/registro" element={<Registro />} />
          {/* O si usas '/crear-usuario' en ChatBot, cambia esta línea: */}
          {/* <Route path="/crear-usuario" element={<Registro />} /> */}


          {/* Panel admin (interno) */}
          <Route
            path="/admin-panel"
            element={ <AdminRoute> <AdminPanel /> </AdminRoute> }
          />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="citas" element={ <AdminRoute> <Citas /> </AdminRoute> } />
            <Route path="conversaciones" element={ <AdminRoute> <Conversaciones /> </AdminRoute> } />
            <Route path="notas" element={ <AdminRoute> <NotasClinicas /> </AdminRoute> } />
            <Route path="estadisticas" element={ <AdminRoute> <Estadisticas /> </AdminRoute> } />
            <Route path="registro" element={ <AdminRoute> <RegistroPaciente /> </AdminRoute> } />
            <Route path="pacientes" element={ <AdminRoute> <VerPacientes /> </AdminRoute> } />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);