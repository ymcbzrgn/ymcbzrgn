/**
 * Main Entry Point
 * Ubuntu×XP Desktop Portfolio
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { DeviceProvider } from './os/contexts/DeviceContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DeviceProvider>
      <App />
    </DeviceProvider>
  </React.StrictMode>
);
