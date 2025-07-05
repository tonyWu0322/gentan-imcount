import React, { createContext, useState, useContext, FC, ReactNode } from 'react';
import { Modal } from '../components/Modal';

type ModalContent = {
  title: string;
  content: ReactNode;
  onConfirm?: () => void;
};

interface ModalContextType {
  showAlert: (title: string, content: ReactNode) => void;
  showConfirm: (title: string, content: ReactNode, onConfirm: () => void) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalContent | null>(null);

  const handleClose = () => {
    setModalState(null);
  };

  const handleConfirm = () => {
    if (modalState && modalState.onConfirm) {
      modalState.onConfirm();
    }
    handleClose();
  };

  const showAlert = (title: string, content: ReactNode) => {
    setModalState({ title, content });
  };

  const showConfirm = (title: string, content: ReactNode, onConfirm: () => void) => {
    setModalState({ title, content, onConfirm });
  };

  const getFooter = () => {
    if (!modalState) return null;

    if (modalState.onConfirm) {
      // This is a confirmation dialog
      return (
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
          >
            确认
          </button>
        </>
      );
    }

    // This is an alert dialog
    return (
      <button
        onClick={handleClose}
        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
      >
        好的
      </button>
    );
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        isOpen={!!modalState}
        onClose={handleClose}
        title={modalState?.title || ''}
        footer={getFooter()}
      >
        {modalState?.content}
      </Modal>
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}; 