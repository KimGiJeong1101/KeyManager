import { ReactNode } from "react";

export type ToastType = "success" | "error" | "neutral";

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  icon?: ReactNode;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}
