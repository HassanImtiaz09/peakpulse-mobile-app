import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { captureError } from "@/lib/sentry";
// Error boundary is a class component - no UI color imports needed

interface Props {
  children: ReactNode;
  fallbackScreen?: string;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): Partial<State> { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { captureError(error, { componentStack: errorInfo.componentStack ?? "unknown", fallbackScreen: this.props.fallbackScreen ?? "root" }); }
  handleRetry = () => { this.setState({ hasError: false, error: null }); };
  render() { return this.state.hasError ? null : this.props.children; }
}

/** Alias for backward compatibility with screens that import ScreenErrorBoundary */
export const ScreenErrorBoundary = ErrorBoundary;
