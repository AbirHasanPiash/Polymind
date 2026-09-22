import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Last line of defence: one render-time exception must not blank the page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
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
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="surface-card w-full max-w-md rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-fg">Something went wrong</h1>
          <p className="mb-6 text-sm leading-relaxed text-fg-muted">
            The page hit an unexpected error. Reloading usually clears it.
          </p>
          {import.meta.env.DEV && (
            <pre className="mb-6 max-h-40 overflow-auto rounded-lg bg-surface-2 p-3 text-left text-xs text-danger">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg hover:bg-accent-strong"
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
