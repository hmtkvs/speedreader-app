import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ErrorHandler } from './utils/errorHandler';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-red-500">Something went wrong</h2>
        <pre className="text-sm bg-gray-900 p-4 rounded mb-4 overflow-auto">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="w-full py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const errorHandler = ErrorHandler.getInstance();

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        errorHandler.handleError(error, {
          componentStack: info.componentStack
        });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}