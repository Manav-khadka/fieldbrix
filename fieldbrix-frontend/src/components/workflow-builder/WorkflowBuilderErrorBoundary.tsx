import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class WorkflowBuilderErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Workflow builder crashed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fb-page">
          <div className="fb-error">
            <strong>The workflow studio couldn't be opened.</strong>
            <p style={{ margin: "6px 0 0", fontSize: "12px" }}>{this.state.error.message}</p>
          </div>
          <button
            type="button"
            className="fb-btn fb-btn--primary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
