import { useEffect, useRef } from 'react';

// A single global array that tracks all the onClose functions for active modals.
const globalModalStack: (() => void)[] = [];

/**
 * useModalHistory
 * 
 * Manages the browser history stack for modals so that the physical "Back" button
 * closes only the top-most modal, rather than all of them simultaneously.
 * 
 * @param isOpen boolean - whether this modal is currently open.
 * @param onClose function - the function to call when the modal should close.
 */
export const useModalHistory = (isOpen: boolean, onClose: () => void, modalId?: string) => {
  const onCloseRef = useRef(onClose);
  
  // Keep the ref up to date without triggering effects
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Push the state explicitly for this modal depth
    window.history.pushState({ modalOpen: true, modalId }, '');

    // Create a stable reference for the stack
    const closeHandler = () => {
       onCloseRef.current();
    };

    // Add this modal's handler to the top of the stack
    globalModalStack.push(closeHandler);

    const handlePopState = () => {
      // Check if this particular modal is the top layer
      if (globalModalStack[globalModalStack.length - 1] === closeHandler) {
        // Pop it off the stack
        globalModalStack.pop();
        // Fire its close event
        closeHandler();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // Cleanup: if the user closed the modal via a button (not the back button),
      // we remove its handler from the stack.
      const index = globalModalStack.indexOf(closeHandler);
      if (index > -1) {
        globalModalStack.splice(index, 1);
      }
    };
  }, [isOpen]); // Only react to isOpen changes
};
