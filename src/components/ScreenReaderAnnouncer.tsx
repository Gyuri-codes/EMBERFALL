import React from 'react';

interface ScreenReaderAnnouncerProps {
  message: string;
}

export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({ message }) => {
  return (
    <div 
      id="screen-reader-live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};
