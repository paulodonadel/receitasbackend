import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';
import ForgotPassword from '../pages/public/ForgotPassword';
import ResetPassword from '../pages/public/ResetPassword';
import PatientDashboard from '../pages/patient/Dashboard';
import AdminDashboard from '../pages/admin/Dashboard';
import RequestPrescription from '../pages/patient/RequestPrescription';
import PrescriptionStatus from '../pages/patient/PrescriptionStatus';
import PrescriptionDetail from '../pages/patient/PrescriptionDetail';
import RepeatPrescription from '../pages/patient/RepeatPrescription';
import SetReminder from '../pages/patient/SetReminder';
import Reminders from '../pages/patient/Reminders';
import ManagePrescriptions from '../pages/admin/ManagePrescriptions';
import Reports from '../pages/admin/Reports';
import Profile from '../pages/patient/Profile';
import AdminProfile from '../pages/admin/Profile';
import NotFound from '../components/NotFound';
import ProtectedRoute from '../hooks/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import Home from '../pages/public/Home';
import Patients from '../pages/admin/Patients';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={
        user
          ? (user.role === 'admin'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/patient/dashboard" replace />
            )
          : <Home />
      } />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Rotas de paciente */}
      <Route path="/patient" element={<ProtectedRoute allowedRoles={['patient']} />}>
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="request-prescription" element={<RequestPrescription />} />
        <Route path="status" element={<PrescriptionStatus />} />
        <Route path="prescriptions" element={<PrescriptionStatus />} />
        <Route path="prescription/:id" element={<PrescriptionDetail />} />
        <Route path="repeat-prescription/:id" element={<RepeatPrescription />} />
        <Route path="set-reminder/:id" element={<SetReminder />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Rotas de admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="prescriptions" element={<ManagePrescriptions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="patients" element={<Patients />} />
      </Route>

      {/* Redirecionamento para corrigir URLs incorretas */}
      <Route path="/request-prescription" element={<Navigate to="/patient/request-prescription" replace />} />
      <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />
      
      {/* Página 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
