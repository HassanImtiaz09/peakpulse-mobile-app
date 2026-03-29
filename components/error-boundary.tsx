/**
 * ErrorBoundary — Catches runtime errors and shows a recovery UI.
 * 
 * Wrap individual screens or the entire app:
 *   <ErrorBoundary fallbackScreen="dashboard">
 *     <DashboardContent />
 *   </ErrorBoundary>
 */
import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI } from "@/constants/ui-colors";

interface Props {
  children: ReactNode;
  /** Screen name for error reporting context */
  fallbackScreen?: string;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Called when error occurs (for logging/analytics) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.fallbackScreen ?? "unknown"}:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="warning" size={40} color={UI.gold} />
          </View>
          <Text style={styles.title}>Something Went Wrong</Text>
          <Text style={styles.message}>
            {this.props.fallbackScreen
              ? `The ${this.props.fallbackScreen} screen encountered an error.`
              : "An unexpected error occurred."}
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.devError} numberOfLines={4}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <MaterialIcons name="refresh" size={18} color={UI.bg} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: UI.fg,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    color: UI.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  devError: {
    color: UI.red,
    fontSize: 11,
    fontFamily: "monospace",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryText: {
    color: UI.bg,
    fontSize: 15,
    fontWeight: "700",
  },
});
