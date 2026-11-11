import './attach-viewer-popup.scss';

import React, { useEffect } from 'react';
import { translate } from 'react-jhipster';

export interface AttachViewerPopupProps {
  /** A data URL (for example `data:application/pdf;base64,...`). */
  base64File: string;
  onClose: () => void;
}

/** Full-screen viewer for a PDF or image held in memory. Closes on the × button or the Escape key. */
export const AttachViewerPopup = ({ base64File, onClose }: AttachViewerPopupProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="attachViewer-popup" role="dialog" aria-modal="true">
      <div className="pop-content">
        <button type="button" className="close" aria-label={translate('entity.action.close') ?? 'Close'} onClick={onClose} />
        <object className="object-view" data={base64File} aria-label="document" />
      </div>
    </div>
  );
};

export default AttachViewerPopup;
