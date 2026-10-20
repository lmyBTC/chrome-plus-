import React from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsPanel } from '../../components/SettingsPanel';
import '../../index.css';

const OptionsApp: React.FC = () => {
  return (
    <div className="w-full min-h-screen py-10 bg-dark-surface text-dark-primary flex justify-center items-start">
      <SettingsPanel />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
