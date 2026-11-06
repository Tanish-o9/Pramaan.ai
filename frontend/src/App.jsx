import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ToastContainer, { toast } from './components/Toast';
import PinChangeModal from './components/PinChangeModal';
import Landing from './screens/Landing';
import FacultyAuth from './screens/FacultyAuth';
import FacultyDashboard from './screens/FacultyDashboard';
import StudentAuth from './screens/StudentAuth';
import StudentDashboard from './screens/StudentDashboard';
import KioskScreen from './screens/KioskScreen';
import { api } from './api';

export default function App() {
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);
  const [user, setUser] = useState(() => {
    try {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });
  const [mustChangePin, setMustChangePin] = useState(false);

  // Sync session with backend HTTP-only cookies on boot
  useEffect(() => {
    api.authMe()
      .then((res) => {
        if (res.profile) {
          setUser(res.profile);
          setRole(res.role);
          localStorage.setItem('role', res.role);
          localStorage.setItem('user', JSON.stringify(res.profile));
        }
      })
      .catch(() => {
        // If not logged in, clear local state
        if (!user) {
          setUser(null);
          setRole(null);
        }
      });

    const onAuthExpired = () => {
      toast('Session expired. Please log in again.', 'error');
      handleLogout();
    };
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  useEffect(() => {
    const join = new URLSearchParams(window.location.search).get('join-code');
    if (join && !role) setRole('student');
  }, []);

  const handleRole = (r) => {
    setRole(r);
    localStorage.setItem('role', r);
  };

  const handleAuth = (u, r, opts = {}) => {
    setUser(u);
    setRole(r);
    localStorage.setItem('role', r);
    localStorage.setItem('user', JSON.stringify(u));
    if (opts.mustChangePin) {
      setMustChangePin(true);
    }
  };

  const handleLogout = async () => {
    try {
      await api.authLogout();
    } catch {}
    setUser(null);
    setRole(null);
    setMustChangePin(false);
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    toast('Logged out successfully', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <ToastContainer />
      {role !== 'kiosk' && (
        <Header 
          user={user} 
          role={role} 
          onLogout={handleLogout} 
          onBackToHome={() => !user && setRole(null)} 
          onOpenKiosk={() => handleRole('kiosk')}
        />
      )}
      
      <main className="flex-1 flex flex-col">
        {role === 'kiosk' && (
          <KioskScreen onExit={() => setRole(user ? (role === 'teacher' ? 'teacher' : 'student') : null)} />
        )}
        {!role && <Landing onSelectRole={handleRole} onOpenKiosk={() => handleRole('kiosk')} />}
        {role === 'teacher' && !user && <FacultyAuth onAuthSuccess={handleAuth} />}
        {role === 'teacher' && user && <FacultyDashboard teacher={user} onOpenKiosk={() => handleRole('kiosk')} />}
        {role === 'student' && !user && <StudentAuth onAuthSuccess={handleAuth} />}
        {role === 'student' && user && (
          <>
            <StudentDashboard student={user} onUpdateStudent={(up) => setUser({ ...user, ...up })} />
            {mustChangePin && (
              <PinChangeModal
                student={user}
                onSuccess={() => {
                  setMustChangePin(false);
                  toast('PIN changed successfully! Your profile is secured.', 'success');
                }}
              />
            )}
          </>
        )}
      </main>
      
      {role !== 'kiosk' && <Footer />}
    </div>
  );
}
