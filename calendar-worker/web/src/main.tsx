import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installConsoleLogCapture } from './utils/console-log-capture';

installConsoleLogCapture();

// Ensure the root element exists and has proper content
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Remove the fallback content before rendering React
const fallbackContent = rootElement.querySelector('.loading-container');
if (fallbackContent) {
  fallbackContent.remove();
}

// Create React root and render
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
