"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { sanitizeErrorMessage } from "@/lib/safe-error";

type Props = {
  children: ReactNode;
  /** Optional widget type for test id */
  widgetType?: string;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

/**
 * Isolates a single widget: render errors do not crash the board.
 * Shows a friendly card; never stack traces or sensitive strings.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: sanitizeErrorMessage(error, "此小部件暂时无法显示"),
    };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    // Log only sanitized message — never token/stack to console in production path
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[WidgetErrorBoundary]",
        this.props.widgetType ?? "widget",
        sanitizeErrorMessage(error),
      );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 p-4 text-center"
          data-testid="widget-error-boundary"
          data-widget-type={this.props.widgetType}
          data-state="error"
        >
          <div className="text-sm text-zinc-400">
            {this.props.fallbackTitle ?? "加载失败"}
          </div>
          <div className="text-xs text-zinc-500">{this.state.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
