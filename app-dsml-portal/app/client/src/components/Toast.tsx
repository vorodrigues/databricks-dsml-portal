import { useEffect } from "react";
import { IconCheckCircle, IconClose } from "../shell/icons";

const TOAST_MS = 6000;

// Success notification at the top right, closed automatically or by the user.
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <IconCheckCircle className="toast__icon" />
      <span className="toast__text">{message}</span>
      <button className="icon-btn toast__close" aria-label="Close" onClick={onClose}>
        <IconClose />
      </button>
    </div>
  );
}
