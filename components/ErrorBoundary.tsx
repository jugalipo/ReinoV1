import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ha ocurrido un error inesperado.";
      let errorDetails = "";

      if (this.state.error) {
        try {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError && parsedError.error) {
            errorMessage = "Error de sincronización con la base de datos.";
            errorDetails = parsedError.error;
          } else {
            errorDetails = this.state.error.message;
          }
        } catch (e) {
          errorDetails = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4">
          <div className="bg-stone-900 border border-red-900/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-red-500 mb-4">¡Ups! Algo salió mal</h2>
            <p className="text-stone-300 mb-4">{errorMessage}</p>
            {errorDetails && (
              <div className="bg-stone-950 rounded-xl p-4 overflow-x-auto border border-stone-800">
                <pre className="text-stone-400 text-sm whitespace-pre-wrap font-mono">{errorDetails}</pre>
              </div>
            )}
            <button
              className="mt-6 w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-bold transition-colors"
              onClick={() => window.location.reload()}
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
