import React from 'react';
import { writeLog } from '../services/firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    writeLog({ type: 'error', message: String(error), info: JSON.stringify(info) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong.</h1>
          <p className="text-gray-700 mb-2">An unexpected error occurred. Please refresh the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 