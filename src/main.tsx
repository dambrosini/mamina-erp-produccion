import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import 'reset.css';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Registrar Motor PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('PWA Error:', error);
    });
  });
}
