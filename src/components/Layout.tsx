import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Music, 
  UserCircle, 
  Menu,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/reunioes', icon: CalendarDays, label: 'Reuniões' },
    { to: '/shows', icon: Music, label: 'Shows' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/integrantes', icon: UserCircle, label: 'Integrantes' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 p-6 fixed h-full bg-white z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <img 
            src="https://res.cloudinary.com/dvq0tmbil/image/upload/v1768574843/Logo_HS_Metal_3D_cor_fundo_transparente_fnahvs.png" 
            alt="Logo" 
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-xl font-bold tracking-tight">Banda HS</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.to} 
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to} 
            />
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <img 
            src="https://res.cloudinary.com/dvq0tmbil/image/upload/v1768574843/Logo_HS_Metal_3D_cor_fundo_transparente_fnahvs.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold tracking-tight">Banda HS</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-40 pt-20 px-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl text-lg font-semibold transition-all",
                  location.pathname === item.to 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <item.icon size={24} className={location.pathname === item.to ? "text-white" : "text-slate-400"} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-10 pt-20 lg:pt-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
