import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen">
          <div className="error-boundary-content">
            <div className="error-icon">💥</div>
            <h1>🗡️ DAGGER Error</h1>
            <h2>Something went wrong in the cognitive enhancement matrix</h2>
            
            <div className="error-details">
              <p>An unexpected error occurred while rendering the interface.</p>
              <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                <summary>Technical Details (Click to expand)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            </div>

            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                🔄 Reload DAGGER
              </button>
              
              <button 
                onClick={() => {
                  // Clear localStorage to reset state
                  localStorage.clear();
                  window.location.reload();
                }}
                className="reset-button"
              >
                🧹 Clear Data & Reload
              </button>
            </div>

            <div className="error-help">
              <h3>Troubleshooting Steps:</h3>
              <ol>
                <li>Try reloading the page with the button above</li>
                <li>Check that the proxy server is running: <code>npm run dev:proxy</code></li>
                <li>Clear browser cache and local storage</li>
                <li>Check browser console for additional error details</li>
              </ol>
            </div>

            <div className="error-footer">
              <p>If the problem persists, this error information can help with debugging.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;