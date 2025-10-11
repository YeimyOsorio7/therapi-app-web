import { Outlet } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-teal-100
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
                    text-gray-900 dark:text-white transition-colors">
      <ThemeToggle />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
