import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider, useData } from './contexts/DataContext';
import Dashboard from './pages/Dashboard';
import Cartoes from './pages/Cartoes';
import Dinheiro from './pages/Dinheiro';
import Clientes from './pages/Clientes';
import Operacoes from './pages/Operacoes';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';
import Admin from './pages/Admin';
import AdminRoute from './components/AdminRoute';

function DataErrorBanner() {
  const { error, refresh } = useData();
  if (!error) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 16px',
      background: 'rgba(239, 68, 68, 0.08)',
      borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
    }}>
      <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--danger)' }} />
      <span style={{ fontSize: '13px', color: '#f87171', flex: 1 }}>
        Erro ao carregar dados: {error}
      </span>
      <button
        onClick={refresh}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
          fontWeight: 600, background: 'var(--danger)', color: '#fff',
          border: 'none', cursor: 'pointer',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
      </button>
    </div>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DataProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <DataErrorBanner />
          <main
            className="flex-1 overflow-y-auto p-4 lg:p-6"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cartoes" element={<Cartoes />} />
              <Route path="/dinheiro" element={<Dinheiro />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/operacoes" element={<Operacoes />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
