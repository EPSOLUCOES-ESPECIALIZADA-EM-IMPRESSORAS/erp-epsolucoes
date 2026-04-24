/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import Layout from './components/Layout';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loginWithGoogle } from './lib/firebase';
import { Button } from './components/ui/button';
import { Printer } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Orders = lazy(() => import('./pages/Orders'));
const Search = lazy(() => import('./pages/Search'));
const Settings = lazy(() => import('./pages/Settings'));
const Logs = lazy(() => import('./pages/Logs'));
const Tracking = lazy(() => import('./pages/Tracking'));

const PageLoader = () => (
  <div className="min-h-[240px] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
            <Printer className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ERP EPSOLUÇÕES</h1>
          <p className="text-slate-500 mt-2">Gestão de Assistência Técnica</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => loginWithGoogle()}
            className="w-full h-12 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 gap-3 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </Button>
          <p className="text-[10px] text-slate-400">
            Ao entrar, você concorda com os termos de uso e política de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/track/:token" component={Tracking} />

        <Route>
          {!user ? (
            <Login />
          ) : (
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/clients" component={Clients} />
                <Route path="/equipment" component={Equipment} />
                <Route path="/orders" component={Orders} />
                <Route path="/search" component={Search} />
                <Route path="/settings" component={Settings} />
                <Route path="/logs" component={Logs} />
                <Route>404 - Página não encontrada</Route>
              </Switch>
            </Layout>
          )}
        </Route>
      </Switch>
    </Suspense>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster position="top-right" />
        </TooltipProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
