
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from "../services/api";

const [signUp, setSignUp] = useState({ username: "", password: "" });
const [loadingSignUp, setLoadingSignUp] = useState(false);
const [msg, setMsg] = useState("");

async function onCreateAccount(e) {
  e.preventDefault();
  setMsg("");
  setLoadingSignUp(true);
  try {
    const resp = await createUser(signUp);
    setMsg("Usuario creado correctamente.");
    // TODO: redirigir si quieres
    // navigate("/login")
  } catch (err) {
    setMsg(`Error al crear usuario: ${err.message}`);
  } finally {
    setLoadingSignUp(false);
  }
}

const Login = () => {
  const [form, setForm] = useState({ user: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();

    // Validación de campos vacíos
    if (!form.user.trim() || !form.password.trim()) {
      setError('❌ Por favor, completa todos los campos');
      return;
    }

    console.log(form.user, form.password);
    // Simulación de autenticación
    if (form.user === 'psicologa' && form.password === '1234') {
      localStorage.setItem('auth', 'true');
      navigate('/admin/citas');
    } else {
      navigate('/src/components/ChatBot.jsx')
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-4 border border-gray-300 dark:border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center text-sky-600 dark:text-sky-300 mb-6">🔐 Acceso Psicóloga</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario
            </label>
            <input
              id="user"
              name="user"
              type="text"
              placeholder="Ingresa tu usuario"
              value={form.user}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 
                ${error && !form.user.trim() 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200'
                } 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                focus:outline-none focus:ring-2 focus:ring-opacity-50`}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={form.password}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 
                ${error && !form.password.trim() 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200'
                } 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                focus:outline-none focus:ring-2 focus:ring-opacity-50`}
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                   text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 
                   transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 
                   focus:ring-sky-500 focus:ring-opacity-50"
          disabled={!form.user.trim() || !form.password.trim()}
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
};

export default Login;
