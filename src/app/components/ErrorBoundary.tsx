/**
 * ==============================================================================
 * REACT ERROR BOUNDARY (ErrorBoundary.tsx)
 * ==============================================================================
 * This component catches JavaScript runtime errors in its child component tree,
 * logs the errors, and displays a fallback recovery UI instead of crashing the
 * entire application into a blank white screen.
 *
 * Why is an ErrorBoundary needed?
 * - If one complex component fails to render (e.g., an unexpected null value
 *   inside a chart or product list), without an ErrorBoundary React would unmount
 *   the entire app tree.
 * - With this ErrorBoundary, only that specific broken section displays a friendly
 *   error card with a "Try Again" button, leaving the rest of the page usable.
 * ==============================================================================
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router';

// Props passed to ErrorBoundary
interface Props {
  children: ReactNode;         // The wrapped components
  fallbackTitle?: string;      // Optional custom error heading
}

// Internal state tracking error condition
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  /**
   * Static lifecycle invoked after an error has been thrown by a descendant component.
   * Updates state so the next render will show the fallback UI.
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method to log error details to the browser console or monitoring service.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    // If an error was caught, render the recovery card
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] p-8 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-red-100 shadow-sm m-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">
            {this.props.fallbackTitle || 'Component Encountered an Issue'}
          </h2>
          <p className="text-xs text-gray-500 max-w-md mb-6 font-mono bg-gray-50 p-3 rounded-xl border border-gray-100">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2.5 bg-[#a14b58] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#863b48] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              to={isAdminRoute ? '/admin' : '/'}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-all"
            >
              <Home className="w-4 h-4" />
              {isAdminRoute ? 'Reload Admin Dashboard' : 'Return Home'}
            </Link>
          </div>
        </div>
      );
    }

    // When there is no error, render child components normally
    return this.props.children;
  }
}
