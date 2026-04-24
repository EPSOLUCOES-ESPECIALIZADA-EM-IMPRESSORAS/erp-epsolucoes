/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        // Try to parse Firestore JSON error
        const firestoreError = JSON.parse(this.state.error?.message || "");
        if (firestoreError.error) {
          errorMessage = `Erro de Banco de Dados: ${firestoreError.error}`;
          if (firestoreError.error.includes("insufficient permissions")) {
            errorMessage = "Você não tem permissão para realizar esta operação ou acessar estes dados.";
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <Card className="max-w-md w-full border-red-100 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Ops! Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-slate-600 text-sm leading-relaxed">
                {errorMessage}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Recarregar Página
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
