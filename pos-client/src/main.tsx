import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { writeLog } from './services/firebase';

window.onerror = function (message, source, lineno, colno, error) {
  writeLog({
    type: 'error',
    message: String(message),
    source,
    lineno,
    colno,
    error: error ? String(error) : undefined,
  });
};

window.onunhandledrejection = function (event) {
  writeLog({
    type: 'error',
    message: 'Unhandled promise rejection',
    error: event.reason ? String(event.reason) : undefined,
  });
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);

try {
  root.render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback render
  root.render(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Application Error</h1>
      <p>Please refresh the page.</p>
      <button onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );
}
