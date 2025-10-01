import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './components/RoleSelection';
import Interview from './components/Interview';
import Results from './components/Results';
import './App.css';

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    console.error('🚨 ERROR BOUNDARY TRIGGERED:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 COMPONENT ERROR DETAILS:', {
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo,
      timestamp: new Date().toISOString()
    });
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred. Please refresh the page and try again.</p>
          <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '12px', marginTop: '20px' }}>
            <summary>Error Details (for debugging)</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  console.log('🚀 APP COMPONENT LOADED:', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>Job Interview Bot</h1>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<RoleSelection />} />
              <Route path="/interview/:role" element={<Interview />} />
              <Route path="/results" element={<Results />} />
              <Route path="*" element={
                <div className="error">
                  <h2>404 - Page Not Found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                  <button onClick={() => window.location.href = '/'} className="btn btn-primary">
                    Go Home
                  </button>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;