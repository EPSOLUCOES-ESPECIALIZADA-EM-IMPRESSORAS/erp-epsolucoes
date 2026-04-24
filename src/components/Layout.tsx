/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  Printer, 
  ClipboardList, 
  Search, 
  Settings, 
  History,
  LogOut,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from './FirebaseProvider';
import { logout } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Clientes', href: '/clients', icon: Users },
  { label: 'Equipamentos', href: '/equipment', icon: Printer },
  { label: 'Ordens de Serviço', href: '/orders', icon: ClipboardList },
  { label: 'Busca Global', href: '/search', icon: Search },
  { label: 'Configurações', href: '/settings', icon: Settings },
  { label: 'Log de Exclusões', href: '/logs', icon: History },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const { user } = useAuth();

  // Close mobile menu when location changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar Desktop */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden md:flex flex-col bg-surface border-r border-border shadow-sm transition-all duration-300 ease-in-out group z-50",
          isHovered ? "w-[260px]" : "w-[80px]"
        )}
      >
        <div className={cn("p-6 transition-all duration-300", isHovered ? "opacity-100" : "opacity-0 md:opacity-100 flex items-center justify-center p-4")}>
          <Link href="/">
            <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-3 cursor-pointer overflow-hidden whitespace-nowrap">
              <Printer className="w-6 h-6 shrink-0" />
              <span className={cn("transition-all duration-300", isHovered ? "w-auto opacity-100" : "w-0 opacity-0")}>ERP EPSOLUÇÕES</span>
            </h1>
          </Link>
          <p className={cn("text-xs text-text-muted mt-1 transition-all duration-300 overflow-hidden whitespace-nowrap", isHovered ? "w-auto opacity-100" : "w-0 opacity-0")}>
            Gestão de Assistência Técnica
          </p>
        </div>
        
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "sidebar-nav-item flex items-center gap-3 transition-all duration-300",
                    isActive && "sidebar-nav-item-active",
                    !isHovered && "justify-center p-2"
                  )}
                  title={!isHovered ? item.label : ""}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-text-muted")} />
                  <span className={cn(
                    "transition-all duration-300 overflow-hidden whitespace-nowrap text-sm",
                    isHovered ? "w-auto opacity-100" : "w-0 opacity-0"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className={cn(
            "flex items-center gap-3 mb-2 rounded-lg bg-slate-50 border border-border transition-all duration-300 overflow-hidden",
            isHovered ? "px-3 py-3" : "p-2 justify-center"
          )}>
            <Avatar className="h-8 w-8 border border-white shadow-sm shrink-0">
              <AvatarImage src={user?.photoURL || ''} />
              <AvatarFallback className="bg-blue-100 text-primary text-xs">
                {user?.displayName?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex-1 min-w-0 transition-all duration-300", isHovered ? "w-auto opacity-100" : "w-0 opacity-0")}>
              <p className="text-xs font-semibold text-text-main truncate">{user?.displayName}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => logout()}
            className={cn(
              "w-full gap-3 text-text-muted hover:text-red-600 hover:bg-red-50 transition-all duration-300 overflow-hidden",
              isHovered ? "justify-start px-4" : "justify-center p-2"
            )}
            title={!isHovered ? "Sair do Sistema" : ""}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={cn(
              "transition-all duration-300 overflow-hidden whitespace-nowrap",
              isHovered ? "w-auto opacity-100" : "w-0 opacity-0"
            )}>
              Sair do Sistema
            </span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border flex items-center justify-between px-4 z-50">
        <Link href="/">
          <h1 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2 cursor-pointer">
            <Printer className="w-5 h-5" />
            <span>EPSOLUÇÕES</span>
          </h1>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-6 h-6 text-text-main" />
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-surface z-[70] shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-border">
                <Link href="/" className="flex-1">
                  <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2 cursor-pointer">
                    <Printer className="w-6 h-6" />
                    <span>EPSOLUÇÕES</span>
                  </h1>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-text-main" />
                </Button>
              </div>
              <ScrollArea className="flex-1 px-4">
                <nav className="space-y-1 py-6">
                  {NAV_ITEMS.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "sidebar-nav-item",
                          isActive && "sidebar-nav-item-active"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-text-muted")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-slate-50 border border-border">
                  <Avatar className="h-8 w-8 border border-white shadow-sm">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback className="bg-blue-100 text-primary text-xs">
                      {user?.displayName?.charAt(0) || <UserIcon className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-main truncate">{user?.displayName}</p>
                    <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => logout()}
                  className="w-full justify-start gap-3 text-text-muted hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Sistema
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden pt-16 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
