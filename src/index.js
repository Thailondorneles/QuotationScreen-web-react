import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { aplicarParametros } from './config/parametrosAplicacao';

const root = ReactDOM.createRoot(document.getElementById('root'));
aplicarParametros([]);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
