// src/layout/Layout.jsx
import { Outlet, useLocation } from 'react-router-dom';
// ✅ CORRECTED PATH: Go up one level (..) then into components/
import Header from '../components/Header';
// ✅ CORRECTED PATH: Go up one level (..) then into components/
import ThemeToggle from '../components/ThemeToggle';

const Layout = () => {
  const location = useLocation();

  // Logic to show the main Header on login and create-user pages
  const showMainHeader = location.pathname === '/login' || location.pathname === '/crear-usuario';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-teal-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center">

      {/* Conditionally render the main Header */}
      {showMainHeader && <Header />}

      {/* Main content area */}
      {/* Added padding-top to ensure content isn't hidden behind the fixed Header */}
      <main className="flex-grow w-full flex items-center justify-center p-4 pt-20"> {/* pt-20 adds space for the header */}
        <Outlet /> {/* Renders the actual page component (Login, CreateUser, etc.) */}
      </main>

      {/* Optional: Add a theme toggle outside the header if needed globally */}
      {/* <div className="fixed bottom-4 right-4 z-50">
           <ThemeToggle />
         </div>
      */}
    </div>
  );
};

export default Layout;