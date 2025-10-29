import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { Warning } from '@mui/icons-material';

const ConfirmationModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = "Confirmar Acción", 
  message = "¿Estás seguro de que quieres realizar esta acción?", 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  type = "warning" // warning, danger, info
}) => {
  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'var(--error)';
      case 'info':
        return 'var(--accent-primary)';
      default:
        return 'var(--warning)';
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'var(--error)';
      case 'info':
        return 'var(--accent-primary)';
      default:
        return 'var(--warning)';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 32px var(--shadow)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        fontFamily: 'Michroma',
        fontSize: '1.2rem',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '20px 24px 16px'
      }}>
        <Warning sx={{ color: getIconColor(), fontSize: '1.5rem' }} />
        {title}
      </DialogTitle>
      
      <DialogContent sx={{ 
        padding: '20px 24px',
        fontFamily: 'Michroma'
      }}>
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'var(--text-primary)',
            fontSize: '1rem',
            lineHeight: 1.5,
            fontFamily: 'Michroma'
          }}
        >
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ 
        padding: '16px 24px 20px',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            fontFamily: 'Michroma',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '14px',
            padding: '8px 20px',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            '&:hover': {
              borderColor: 'var(--text-muted)',
              backgroundColor: 'var(--bg-secondary)'
            }
          }}
        >
          {cancelText}
        </Button>
        
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            fontFamily: 'Michroma',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '14px',
            padding: '8px 20px',
            backgroundColor: getConfirmButtonColor(),
            color: 'white',
            '&:hover': {
              backgroundColor: getConfirmButtonColor(),
              opacity: 0.9
            }
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
