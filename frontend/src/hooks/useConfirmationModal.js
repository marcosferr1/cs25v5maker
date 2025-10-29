import { useState } from 'react';

export const useConfirmationModal = () => {
  const [modalState, setModalState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning',
    onConfirm: null
  });

  const showConfirmation = ({
    title = 'Confirmar Acción',
    message = '¿Estás seguro de que quieres realizar esta acción?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    onConfirm
  }) => {
    setModalState({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm
    });
  };

  const hideConfirmation = () => {
    setModalState(prev => ({
      ...prev,
      open: false
    }));
  };

  const handleConfirm = () => {
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
    hideConfirmation();
  };

  return {
    modalState,
    showConfirmation,
    hideConfirmation,
    handleConfirm
  };
};
