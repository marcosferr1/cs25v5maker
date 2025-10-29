import React from 'react';

const ThemeToggle = ({ theme, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className="theme-toggle"
      title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeToggle;
