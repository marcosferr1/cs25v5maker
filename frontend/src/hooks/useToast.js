import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showError = useCallback((message) => {
    addToast(message, 'error', 6000);
  }, [addToast]);

  const showSuccess = useCallback((message) => {
    addToast(message, 'success', 4000);
  }, [addToast]);

  const showInfo = useCallback((message) => {
    addToast(message, 'info', 5000);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showInfo
  };
};
