import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Prevents uncaught React render/lifecycle errors from leaving an empty blank root.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected rendering failure",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Phenora ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#f7f7f5] text-[#111] dark:bg-[#0c0c0b] dark:text-[#f3f3ee]">
        <div className="max-w-md w-full rounded-xl border border-[#e5e5e0] dark:border-[#2a2a26] bg-white dark:bg-[#151513] p-6 shadow-sm space-y-3">
          <h1 className="text-base font-semibold tracking-tight">
            {this.props.fallbackTitle || "Phenora encountered a display error"}
          </h1>
          <p className="text-xs text-[#55554f] dark:text-[#a8a89f] leading-relaxed">
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3.5 py-2 rounded-lg bg-[#111] text-white dark:bg-[#f3f3ee] dark:text-[#0c0c0b] text-xs font-medium cursor-pointer"
          >
            Reload Phenora
          </button>
        </div>
      </div>
    );
  }
}
