import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CloseIcon from "@mui/icons-material/Close";
import { ToastMessage, ToastType } from "../../types/ui";

const TOAST_DURATION = 3500;
const TICK_INTERVAL = 100;

interface ToastStyle {
  icon: ReactNode;
  border: string;
  accent: string;
}

const TOAST_STYLE: Record<ToastType, ToastStyle> = {
  success: {
    icon: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} className="text-emerald-500 dark:text-emerald-400" />,
    border: "border-emerald-200 dark:border-emerald-400/20",
    accent: "bg-emerald-500 dark:bg-emerald-400",
  },
  error: {
    icon: <ErrorRoundedIcon sx={{ fontSize: 18 }} className="text-red-500 dark:text-red-400" />,
    border: "border-red-200 dark:border-red-400/20",
    accent: "bg-red-500 dark:bg-red-400",
  },
  // 삭제 완료처럼 "축하할 성공"은 아니지만 실패도 아닌 액션에 사용하는 중립 톤
  neutral: {
    icon: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} className="text-slate-400 dark:text-slate-500" />,
    border: "border-slate-200 dark:border-white/10",
    accent: "bg-slate-400 dark:bg-slate-600",
  },
};

// alert()를 대체하는 토스트 알림 훅
// 자동 소멸 타이머는 ToastItem이 직접 관리한다 (hover 시 일시정지가 필요하기 때문).
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // icon: 액션(등록/수정/삭제)을 구분해서 보여주고 싶을 때 전달하는 커스텀 아이콘.
  // 생략하면 type(success/error/neutral) 기본 아이콘이 쓰인다.
  const showToast = useCallback(
    (type: ToastType, message: string, icon?: ReactNode) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message, icon }]);
    },
    [],
  );

  return { toasts, showToast, dismissToast };
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}

// 개별 토스트: 남은 시간을 하단 진행바로 표시하고, 마우스를 올리면 타이머를 멈춘다.
const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [remaining, setRemaining] = useState(TOAST_DURATION);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= TICK_INTERVAL) {
          onDismiss(toast.id);
          return 0;
        }
        return prev - TICK_INTERVAL;
      });
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [paused, toast.id, onDismiss]);

  const style = TOAST_STYLE[toast.type] || TOAST_STYLE.error;
  const progress = (remaining / TOAST_DURATION) * 100;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`relative flex items-start gap-3 pl-4 pr-3 pt-3 pb-3.5 rounded-xl border bg-white shadow-xl shadow-slate-300/40 overflow-hidden dark:bg-slate-900 dark:shadow-black/50 dark:backdrop-blur-xl ${style.border}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`} />
      {toast.icon || style.icon}
      <p className="flex-1 text-sm font-medium text-slate-800 leading-snug pt-0.5 dark:text-slate-200">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="알림 닫기"
        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors dark:text-slate-500 dark:hover:text-slate-300"
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </button>
      {/* 하단 진행바: 남은 표시 시간. hover 중에는 정지된 상태로 유지 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-white/10">
        <div
          className={`h-full ${style.accent} transition-[width] duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  // body에 직접 포탈로 렌더링한다. 조상 요소에 backdrop-filter(다크 모드 유리 효과) 같은
  // CSS가 붙으면 그 요소가 fixed 자손의 컨테이닝 블록이 되어 뷰포트 기준 위치가 깨지기 때문.
  return createPortal(
    <div
      className="fixed z-50 bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
};
