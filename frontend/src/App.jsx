import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Events from './pages/Events';
import DeviceDetail from './pages/DeviceDetail';
import Discovery from './pages/Discovery';
import Billing from './pages/Billing';
import { healthCheck } from './api';

function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await healthCheck();
        setConnected(true);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b,_#020617_60%)] text-white">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-400"></div>
          <p className="mt-4 text-slate-300">Loading monitoring console...</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#7f1d1d,_#020617_60%)] text-white">
        <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mb-4 text-5xl">Network core offline</div>
          <h1 className="mb-2 text-3xl font-black">Connection Error</h1>
          <p className="mb-4 text-slate-300">Cannot connect to backend server at http://localhost:5000.</p>
          <p className="text-sm text-slate-400">Start the backend with python app.py and reload the page.</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[linear-gradient(180deg,_#e2e8f0_0%,_#f8fafc_35%,_#eff6ff_100%)] text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-950/95 text-white backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-emerald-300">PRTG Network Monitor</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Network Management System</h1>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <div className={`h-3 w-3 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
              <span className="text-sm text-slate-200">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2 py-3 text-sm font-semibold">
              <Link to="/" className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-900 hover:text-white">Dashboard</Link>
              <Link to="/devices" className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-900 hover:text-white">Devices</Link>
              <Link to="/events" className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-900 hover:text-white">Events</Link>
              <Link to="/discovery" className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-900 hover:text-white">Discovery</Link>
              <Link to="/billing" className="rounded-full px-4 py-2 text-slate-700 hover:bg-slate-900 hover:text-white">Reports</Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/devices/:id" element={<DeviceDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/billing" element={<Billing />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
