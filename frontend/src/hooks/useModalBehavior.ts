import { KeyboardEvent, RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalBehavior {
  containerRef: RefObject<HTMLDivElement>;
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleOverlayClick: () => void;
}

// 모달류(ConfirmDialog, RegisterModal)가 공통으로 필요로 하는 동작을 모은 훅.
// - 모달이 열려있는 동안 배경 스크롤 잠금
// - Tab/Shift+Tab이 모달 밖(뒤에 가려진 배경 요소)으로 빠져나가지 않도록 포커스 가두기
// - Escape 키로 닫기
export const useModalBehavior = (
  open: boolean,
  onClose: () => void,
): ModalBehavior => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab" || !containerRef.current) return;

    const focusable = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // 배경(오버레이) 클릭 시 닫기. 모달 카드 안쪽 클릭은 이 핸들러까지 전파되지 않아야 하므로
  // 카드 쪽에는 onClick={(e) => e.stopPropagation()}를 함께 붙여준다.
  const handleOverlayClick = () => onClose();

  return { containerRef, handleKeyDown, handleOverlayClick };
};
