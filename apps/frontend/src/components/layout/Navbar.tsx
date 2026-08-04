import { useState } from 'react';
import { Link, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { Heart, Menu, X, User, LogOut, LayoutDashboard, ShoppingCart, MessageCircle } from 'lucide-react';
import type { User as UserType } from '../../types';

interface NavbarProps {
  user: UserType | null;
  logout: () => void;
  openLogin: () => void;
  cartCount?: number;
}

export function Navbar({ user, logout, openLogin, cartCount = 0 }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', auth: true },
    { to: '/', label: 'Beranda' },
    { to: '/konsultasi', label: 'Konsultasi' },
    { to: '/bmi', label: 'Hitung BMI' },
    { to: '/produk-herbalife', label: 'Produk' },
    { to: '/riwayat', label: 'Riwayat Saya' },
    { to: '/lokasi', label: 'Lokasi' },
  ];

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const visibleLinks = navLinks.filter(l => {
    if ('auth' in l && l.auth && !user) return false;
    if (isAdmin) return false;
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold text-foreground leading-none tracking-tight">NC MULIA</div>
              <div className="text-[9px] text-brand-primary font-medium tracking-widest mt-0.5">NUTRISI & KESEHATAN</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleLinks.map(link => (
              <RouterNavLink
                key={link.to}
                to={link.to}
                className={[
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive(link.to)
                    ? 'bg-brand-primary-soft text-brand-primary'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary',
                ].join(' ')}
              >
                {link.label}
              </RouterNavLink>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {!isAdmin && (
            <Link
              to="/keranjang"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-foreground-muted hover:text-brand-primary hover:bg-brand-primary-soft transition-all"
              title="Keranjang"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-2 pl-3 border-l border-border">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary-soft flex items-center justify-center text-brand-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-foreground leading-none">{user.name}</div>
                    <div className="text-[10px] text-foreground-subtle mt-0.5">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-subtle hover:text-danger hover:bg-danger-soft transition-all"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-primary-hover active:bg-brand-primary-active transition-all shadow-sm"
              >
                Masuk
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-all"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1 animate-fade-in">
            {visibleLinks.map(link => (
              <RouterNavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={[
                  'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive(link.to)
                    ? 'bg-brand-primary-soft text-brand-primary'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary',
                ].join(' ')}
              >
                {link.label}
              </RouterNavLink>
            ))}
            {!isAdmin && (
            <RouterNavLink
              to="/keranjang"
              onClick={() => setMobileOpen(false)}
              className={[
                'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all',
                isActive('/keranjang')
                  ? 'bg-brand-primary-soft text-brand-primary'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Keranjang
              </span>
              {cartCount > 0 && (
                <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </RouterNavLink>
            )}
            <div className="pt-3 border-t border-border">
              {user ? (
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary-soft flex items-center justify-center text-brand-primary">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-foreground-subtle">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-soft transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileOpen(false); openLogin(); }}
                  className="mx-4 w-full py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-primary-hover transition-all"
                >
                  Masuk
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
