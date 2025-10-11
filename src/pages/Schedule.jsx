import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

const Schedule = () => {
  const [form, setForm] = useState({ name: '', email: '', date: '', time: '', reason: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`✅ Cita agendada para ${form.name} el ${form.date} a las ${form.time}`);
    setForm({ name: '', email: '', date: '', time: '', reason: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-indigo-100 to-emerald-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 p-6">
      <ThemeToggle />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700 transition-all"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-700 dark:text-indigo-300">📅 Agendar una Cita</h2>

        <input name="name" type="text" placeholder="Tu nombre" value={form.name} onChange={handleChange}
               className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />

        <input name="email" type="email" placeholder="Correo electrónico" value={form.email} onChange={handleChange}
               className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />

        <input name="date" type="date" value={form.date} onChange={handleChange}
               className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />

        <input name="time" type="time" value={form.time} onChange={handleChange}
               className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />

        <textarea name="reason" placeholder="Motivo de la cita" value={form.reason} onChange={handleChange} rows="3"
                  className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none" />

        <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded transition">
          Confirmar cita
        </button>
      </form>
    </div>
  );
};

export default Schedule;
