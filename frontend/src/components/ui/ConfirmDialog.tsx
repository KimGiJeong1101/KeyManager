import React from "react";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  // isConfirming: 확인 요청이 진행 중인 동안 버튼을 비활성화해 중복 클릭을 막는다.
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// window.confirm()을 대체하는 확인 모달
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "확인",
  isConfirming = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isConfirming && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 flex-shrink-0 dark:bg-red-400/10">
            <TriangleAlert size={20} className="text-red-500 dark:text-red-400" />
          </span>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>{message}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isConfirming}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isConfirming} autoFocus>
            {isConfirming ? "처리 중..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
