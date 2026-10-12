import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

//Initialize Sentry
import { initSentry } from './telemetry/sentry';
initSentry();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
