// src/pages/Inicio.jsx
import Header from "../components/Header";
import { Clock, Shield, Gift } from "lucide-react"; // ✅ Íconos

export default function Inicio() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-indigo-50 to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <Header />

      <main className="flex-1 pt-24 md:pt-28">
        <section className="max-w-6xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          
          {/* Columna izquierda */}
          <div>
            <p className="text-lg sm:text-xl font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-3">
              PLATAFORMA DE APOYO PSICOLÓGICO
            </p>

            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900 dark:text-white">
              IA para apoyo emocional y
              <span className="block bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                acompañamiento psicológico
              </span>
            </h1>

            <p className="mt-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Therapy-Bot es un espacio digital impulsado por inteligencia artificial 
              que brinda orientación emocional inicial y herramientas de autocuidado. 
              Permite a los usuarios conversar con un asistente virtual, recibir 
              mensajes de motivación.
            </p>

            <p className="mt-4 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Su diseño accesible y su disponibilidad constante hacen que sea una 
              herramienta confiable para quienes buscan apoyo emocional de manera 
              anónima, segura y gratuita.
            </p>
          </div>

          {/* Columna derecha */}
          <div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                ¿Cómo funciona?
              </h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300 text-base">
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-500"></span>
                  <span>Registrate para acceder al chatbot</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-500"></span>
                  <span>Conversa con el chatbot para recibir orientación emocional inicial.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span>Agendar citas para tener una atención personalizada</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-teal-500"></span>
                  <span>Recibe acompañamiento virtual de manera anónima y segura.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-violet-500"></span>
                  <span>Disponible las 24 horas, los 7 días de la semana.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* --- Franja inferior con íconos --- */}
        <section className="mt-16 border-t border-white/40 dark:border-gray-800/60">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {/* Bloque 1 */}
            <div className="flex flex-col items-center space-y-2">
              <Clock className="h-10 w-10 text-sky-600 dark:text-sky-400" />
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">24/7</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponible en todo momento</p>
            </div>

            {/* Bloque 2 */}
            <div className="flex flex-col items-center space-y-2">
              <Shield className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">Confidencial</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tu información siempre protegida</p>
            </div>

            {/* Bloque 3 */}
            <div className="flex flex-col items-center space-y-2">
              <Gift className="h-10 w-10 text-teal-600 dark:text-teal-400" />
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">Gratuito</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accesible para todos los usuarios</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
