import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("System Initializing...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("System Online.");
} catch (error) {
  console.error("Critical System Failure:", error);
  rootElement.innerHTML = `
    <div style="
      height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: #ef4444; 
      background: #020408; 
      font-family: monospace; 
      text-align: center;
      flex-direction: column;
    ">
      <h1 style="font-size: 2rem; margin-bottom: 1rem;">System Initialization Failed</h1>
      <p style="opacity: 0.7; max-width: 600px;">${error}</p>
    </div>`;
}
