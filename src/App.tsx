import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { Reunioes } from './pages/Reunioes';
import { Shows } from './pages/Shows';
import { ShowDetails } from './pages/ShowDetails';
import { Integrantes } from './pages/Integrantes';
import { ReuniaoDetails } from './pages/ReuniaoDetails';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/clientes" element={<Layout><Clientes /></Layout>} />
      <Route path="/reunioes" element={<Layout><Reunioes /></Layout>} />
      <Route path="/reunioes/:id" element={<Layout><ReuniaoDetails /></Layout>} />
      <Route path="/shows" element={<Layout><Shows /></Layout>} />
      <Route path="/shows/:id" element={<Layout><ShowDetails /></Layout>} />
      <Route path="/integrantes" element={<Layout><Integrantes /></Layout>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </ErrorBoundary>
  );
}
