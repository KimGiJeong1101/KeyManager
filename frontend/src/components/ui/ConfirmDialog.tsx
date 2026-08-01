import React from "react";
import { createPortal } from "react-dom";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import { useModalBehavior } from "../../hooks/useModalBehavior";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// window.confirm()을 대체하는 확인 모달
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "확인",
  onConfirm,
  onCancel,
}) => {
  const { containerRef, handleKeyDown, handleOverlayClick } = useModalBehavior(open, onCancel);

  if (!open) return null;

  // body에 직접 포탈로 렌더링한다. 조상 요소에 backdrop-filter(다크 모드 유리 효과) 같은
  // CSS가 붙으면 그 요소가 fixed 자손의 컨테이닝 블록이 되어 뷰포트 기준 중앙 정렬이 깨지기 때문.
  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={handleKeyDown}
      onClick={handleOverlayClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/20 p-6 dark:bg-slate-900 dark:border-white/10 dark:shadow-black/60"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 flex-shrink-0 dark:bg-red-400/10">
            <WarningRoundedIcon sx={{ fontSize: 20 }} className="text-red-500 dark:text-red-400" />
          </span>
          <h3 id="confirm-dialog-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        </div>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed dark:text-slate-400">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 h-9 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all dark:text-slate-300 dark:hover:bg-white/10"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-4 h-9 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all active:scale-95 dark:bg-red-500 dark:hover:bg-red-400"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
