import { Component, ErrorInfo, ReactNode } from "react";
import ErrorBox from "./ErrorBox";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBox />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
