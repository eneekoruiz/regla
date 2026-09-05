import { useEffect, useState } from 'react';

interface KeyboardState {
  isOpen: boolean;
  keyboardHeight: number;
  viewportHeight: number;
}
function readKeyboardState(): KeyboardState {
  if (typeof window === 'undefined') return { isOpen: false, keyboardHeight: 0, viewportHeight: 800 };
  const viewport = window.visualViewport;
  const element = document.activeElement;
  const editable = element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'file', 'button', 'submit', 'color'].includes(element.type)) || (element instanceof HTMLElement && element.isContentEditable);
  const height = viewport?.height ?? window.innerHeight;
  const difference = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
  const isOpen = Boolean(editable && viewport && viewport.scale <= 1 && difference > 150);
  return { isOpen, keyboardHeight: isOpen ? difference : 0, viewportHeight: height };
}
export function useKeyboardAvoidance(): KeyboardState {
  const [state, setState] = useState(readKeyboardState);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readKeyboardState();
        setState(previous => previous.isOpen === next.isOpen && previous.keyboardHeight === next.keyboardHeight && previous.viewportHeight === next.viewportHeight ? previous : next);
      });
    };
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    document.addEventListener('focusin', measure);
    document.addEventListener('focusout', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', measure);
      document.removeEventListener('focusout', measure);
    };
  }, []);
  return state;
}
