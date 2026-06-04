import { Component } from "react";

/**
 * Catches render errors so the app shows a fallback instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const message = error?.message ?? String(error);
    console.error("[ErrorBoundary]", message, errorInfo?.componentStack ?? errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          lang="ar"
          className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center gap-4 bg-white px-6 py-12 text-center font-sans text-slate-900"
        >
          <p className="text-base font-bold text-slate-900">
            حدث خطأ غير متوقع، يرجى تحديث الصفحة
          </p>
          <p className="text-sm text-slate-500">
            إذا استمرت المشكلة، تواصل مع الدعم الفني.
          </p>
          <button
            type="button"
            onClick={this.handleRefresh}
            className="md-btn-primary min-h-[44px] px-6"
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
