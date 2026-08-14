import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence.
 *
 * Without a boundary, one render-time exception unmounts the whole tree and the
 * user is left staring at a blank white page with no way back.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Replace with a reporting service (Sentry et al.) when one is available.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.assign("/");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center app-surface px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-[#11131a]">
          <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-gray-400">
            The page hit an unexpected error. Reloading usually clears it.
          </p>
          {import.meta.env.DEV && (
            <pre className="mb-6 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-rose-600 dark:bg-slate-900 dark:text-rose-400">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98]"
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
