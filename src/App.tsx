import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CupProvider } from './context/CupContext';
import { Layout } from './components/Layout';
import { CupLoader } from './components/CupLoader';
import { SavingIndicator } from './components/SavingIndicator';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/MatchesPage';
import { StandingsPage } from './pages/StandingsPage';
import { ShopPage } from './pages/ShopPage';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminTeams } from './pages/admin/AdminTeams';
import { AdminSchedule } from './pages/admin/AdminSchedule';
import { AdminResults } from './pages/admin/AdminResults';
import { AdminShop } from './pages/admin/AdminShop';
import { AdminSponsors } from './pages/admin/AdminSponsors';
import { AdminSettings } from './pages/admin/AdminSettings';

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <AuthProvider>
      <CupProvider>
        <BrowserRouter basename={basename}>
          <SavingIndicator />
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              element={
                <CupLoader>
                  <Layout />
                </CupLoader>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="kamper" element={<MatchesPage />} />
              <Route path="tabell" element={<StandingsPage />} />
              <Route path="kiosk" element={<ShopPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="lag" element={<AdminTeams />} />
                <Route path="kamper" element={<AdminSchedule />} />
                <Route path="resultater" element={<AdminResults />} />
                <Route path="kiosk" element={<AdminShop />} />
                <Route path="sponsorer" element={<AdminSponsors />} />
                <Route path="innstillinger" element={<AdminSettings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CupProvider>
    </AuthProvider>
  );
}
