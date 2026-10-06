import React from 'react';
import ReactDOM from 'react-dom/client';
import { SocialDispatcher } from './components/SocialDispatcher';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <SocialDispatcher />
    </React.StrictMode>
  );
}
