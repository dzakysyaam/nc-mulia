import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModals } from './components/layout/AuthModals';
import { CartProvider } from './contexts/CartContext';
import { useCart } from './contexts/CartContext';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import BmiPage from './pages/BmiPage';
import ConsultationPage from './pages/ConsultationPage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import HistoryPage from './pages/HistoryPage';
import LocationPage from './pages/LocationPage';
import { FloatingChat } from './components/ui/FloatingChat';
import PaymentPage from './pages/PaymentPage';
import MembershipPage from './pages/MembershipPage';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminPayments from './pages/admin/AdminPayments';
import AdminConsultations from './pages/admin/AdminConsultations';
import AdminBmiRecords from './pages/admin/AdminBmiRecords';
import AdminChatPage from './pages/admin/AdminChatPage';
import AdminLocations from './pages/admin/AdminLocations';
import AdminRoles from './pages/admin/AdminRoles';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';
import { api, type User } from './lib/api';

function AdminRouteGuard({ user, loading, children }: { user: User | null; loading: boolean; children: React.ReactNode }) {
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin' && user.role !== 'super_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function UserRouteGuard({ user, loading, children }: { user: User | null; loading: boolean; children: React.ReactNode }) {
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NavbarWithCart({ user, logout, openLogin }: { user: User | null; logout: () => void; openLogin: () => void }) {
  const { cartCount } = useCart();
  return <Navbar user={user} logout={logout} openLogin={openLogin} cartCount={cartCount} />;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    api.me().then(res => {
      if (res.success && res.data) setUser(res.data);
      else setUser(null);
    }).catch(() => { setUser(null); })
      .finally(() => { setAuthLoading(false); });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const res = await api.login({ email: loginForm.email, password: loginForm.password });
      if (res.success && res.data) {
        setUser(res.data);
        setIsLoginOpen(false);
        setLoginForm({ email: '', password: '' });
        // Redirect admin/super_admin to /admin
        if (res.data.role === 'admin' || res.data.role === 'super_admin') {
          navigate('/admin');
        }
      } else {
        setAuthError(res.message || 'Login gagal.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const res = await api.register({
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone || undefined,
        password: registerForm.password,
      });
      if (res.success) {
        setIsRegisterOpen(false);
        setRegisterForm({ name: '', email: '', phone: '', password: '' });
        setIsLoginOpen(true);
        setLoginForm((f) => ({ ...f, email: registerForm.email, password: '' }));
        setAuthError('');
      } else {
        setAuthError(res.message || 'Registrasi gagal.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {isAdminRoute ? (
        <Routes>
          <Route path="/admin" element={<AdminRouteGuard user={user} loading={authLoading}><AdminOverview user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/users" element={<AdminRouteGuard user={user} loading={authLoading}><AdminUsers user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/products" element={<AdminRouteGuard user={user} loading={authLoading}><AdminProducts user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/transactions" element={<AdminRouteGuard user={user} loading={authLoading}><AdminTransactions user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/payments" element={<AdminRouteGuard user={user} loading={authLoading}><AdminPayments user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/consultations" element={<AdminRouteGuard user={user} loading={authLoading}><AdminConsultations user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/bmi-records" element={<AdminRouteGuard user={user} loading={authLoading}><AdminBmiRecords user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/chat" element={<AdminRouteGuard user={user} loading={authLoading}><AdminChatPage user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/locations" element={<AdminRouteGuard user={user} loading={authLoading}><AdminLocations user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/roles" element={<AdminRouteGuard user={user} loading={authLoading}><AdminRoles user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/audit" element={<AdminRouteGuard user={user} loading={authLoading}><AdminAuditLog user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="/admin/settings" element={<AdminRouteGuard user={user} loading={authLoading}><AdminSettings user={user!} onLogout={logout} /></AdminRouteGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <CartProvider user={user ?? null}>
          <NavbarWithCart user={user ?? null} logout={logout} openLogin={() => setIsLoginOpen(true)} />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<UserRouteGuard user={user} loading={authLoading}><DashboardPage user={user!} /></UserRouteGuard>} />
            <Route path="/konsultasi" element={<ConsultationPage user={user ?? null} />} />
            <Route path="/bmi" element={<BmiPage user={user ?? null} />} />
            <Route path="/produk-herbalife" element={<ProductsPage user={user} />} />
            <Route path="/keranjang" element={<CartPage openLogin={() => setIsLoginOpen(true)} />} />
            <Route path="/pembayaran" element={<UserRouteGuard user={user} loading={authLoading}><PaymentPage /></UserRouteGuard>} />
            <Route path="/riwayat" element={<HistoryPage user={user ?? null} />} />
            <Route path="/lokasi" element={<LocationPage />} />
            <Route path="/membership" element={<UserRouteGuard user={user} loading={authLoading}><MembershipPage user={user} /></UserRouteGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
          <FloatingChat user={user ?? null} />
          <AuthModals
            isLoginOpen={isLoginOpen}
            setIsLoginOpen={setIsLoginOpen}
            isRegisterOpen={isRegisterOpen}
            setIsRegisterOpen={setIsRegisterOpen}
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            registerForm={registerForm}
            setRegisterForm={setRegisterForm}
            handleLogin={handleLogin}
            handleRegister={handleRegister}
            isLoading={isAuthLoading}
            error={authError}
          />
        </CartProvider>
      )}
    </>
  );
}

export default App;
