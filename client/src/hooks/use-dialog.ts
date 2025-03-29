import { useState } from 'react';
import { UseDialogReturn } from '../types/hooks';

export function useDialog(): UseDialogReturn {
  const [isOpen, setIsOpen] = useState(false);

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return {
    isOpen,
    onOpen,
    onClose,
  };
} 