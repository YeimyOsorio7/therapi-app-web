// src/pages/Inicio.jsx
import Header from "../components/Header";
import { Link } from "react-router-dom";

export default function Inicio() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Encabezado fijo y responsive */}
      <Header />

      {/* Añadimos padding-top porque el header es fixed */}
      <main className="flex-1 pt-24 md:pt-28 bg-gradient-to-br from-sky-100 via-purple-100 to-teal-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Título alineado a la izquierda */}
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-indigo-700 dark:text-indigo-300">
            THERAPY-BOOT
          </h1>
        </div>

        <section className="max-w-5xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300">
              IA para apoyo emocional y acompañamiento psicológico
            </h2>
            <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
              Esta plataforma integra un asistente virtual impulsado por inteligencia artificial
              para brindar orientación emocional inicial y herramientas de autocuidado. Además,
              facilita la gestión de citas, notas clínicas, recursos y estadísticas para la psicóloga.
            </p>
            
          </div>

          <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">¿Cómo funciona?</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
              <li>El chatbot ofrece apoyo emocional inicial y psicoeducación.</li>
              <li>La psicóloga gestiona citas, notas, recursos y pacientes en el panel privado.</li>
              <li>Los usuarios pueden agendar citas y recibir material de apoyo.</li>
              <li>Interfaz clara con modo claro/oscuro agradable.</li>
            </ul>
            
          </div>
        </section>
      </main>
    </div>
  );
}
