import { useState, useRef } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LogOut, Menu, X, Store, ChevronRight, Upload, ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { navItems } from '@/config/navItems';

export default function Layout() {
  const { user, logout } = useAuth();
  const { logoBase64, setLogo } = useStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin',
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (typeof result === 'string') {
        setLogo(result);
      }
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoClick = () => {
    if (user?.role !== 'admin') return;
    logoInputRef.current?.click();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = user?.role === 'admin' ? 'Administrador' : 'Cajero';

  return (
    <div className="min-h-screen bg-white flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-white border-r border-gold-200
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gold-200">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={handleLogoClick}
            title={user?.role === 'admin' ? 'Subir logo (clic)' : ''}
          >
            {logoBase64 ? (
              <img src={logoBase64} alt="Logo" className="h-10 w-auto rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 bg-gold-400 rounded-lg flex items-center justify-center shadow-gold-sm relative">
                <Store className="w-5 h-5 text-white" />
                {user?.role === 'admin' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gold-200">
                    <Upload className="w-3 h-3 text-gold-500" />
                  </div>
                )}
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight">ERP & Punto</h1>
              <p className="text-xs text-gold-500">de Venta</p>
              {user?.role === 'admin' && (
                <p className="text-[10px] text-gray-300 group-hover:text-gold-400 transition-colors flex items-center gap-0.5 mt-0.5">
                  <ImageIcon className="w-2.5 h-2.5" />
                  {logoBase64 ? 'Cambiar logo' : 'Subir logo'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png, image/jpeg, image/svg+xml, image/webp"
          onChange={handleLogoUpload}
          className="hidden"
        />

        {/* User info */}
        <div className="px-6 py-4 border-b border-gold-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-100 rounded-full flex items-center justify-center">
              <span className="text-gold-500 font-semibold text-sm uppercase">
                {user?.username.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{user?.username}</p>
              <span className="inline-block text-xs text-gold-400 font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive
                    ? 'bg-gold-400 text-white shadow-gold-sm'
                    : 'text-gray-600 hover:bg-gold-50 hover:text-gold-500'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gold-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gold-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gold-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold text-gray-700">ERP & Punto de Venta</span>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
