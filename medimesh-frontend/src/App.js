import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import ForumPage from './pages/ForumPage';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch { return null; }
}

function ProtectedRoute({ children, roles }) {
  const user = getUser();
  const token = localStorage.getItem('token');
  if (!token || !user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
  return children;
}

function DashboardRouter() {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  switch (user.role) {
    case 'admin': return <AdminDashboard />;
    case 'doctor': return <DoctorDashboard />;
    case 'patient': return <PatientDashboard />;
    default: return <Navigate to="/login" />;
  }
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
        <Route path="/forum" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
