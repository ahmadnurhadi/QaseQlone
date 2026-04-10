import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { signInWithGoogle, signOut } from '../lib/firebase';
import { LayoutDashboard, FolderKanban, PlayCircle, BarChart3, Settings, LogOut, ChevronRight, Plus, Search, Filter } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FolderKanban, label: 'Repositories', path: '/projects' },
    { icon: PlayCircle, label: 'Test Runs', path: '/runs' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">Q</div>
          <span>QaseClone</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === item.path 
                ? "bg-primary/10 text-primary" 
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
              {user?.email?.[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={() => signOut()} className="text-slate-400 hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export const Header: React.FC<{ title: string; breadcrumbs?: { label: string; path: string }[] }> = ({ title, breadcrumbs }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {breadcrumbs && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={bc.path}>
                <Link to={bc.path} className="hover:text-primary">{bc.label}</Link>
                <ChevronRight className="w-3 h-3" />
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent rounded-md text-sm focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
          />
        </div>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
