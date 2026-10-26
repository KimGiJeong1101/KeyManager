import React, { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import SelectField from "../../components/ui/SelectField";
import { Item, UpdateItemPayload } from "../../types/item";
import { SelectOption } from "../../types/ui";
import { getCategoryMeta } from "../../lib/categories";

const MAX_MEMO_LENGTH = 500;

interface EditItemDialogProps {
  // 편집 대상. null이면 닫힘.
  item: Item | null;
  // 백엔드(GET /categories)의 category → version 화이트리스트
  versionOptions: Record<string, string[]>;
  // 성공 시 true (모달 닫힘), 실패 시 false (입력값 유지한 채 모달 유지)
  onSave: (no: number, payload: UpdateItemPayload) => Promise<boolean>;
  onClose: () => void;
}

// 라이선스 정보 수정 모달: 사용자 / 카테고리·버전 / 메모.
// 키 값은 실물 키 그 자체라 수정 대상이 아니다 (오타는 삭제 후 재등록 — 중복 검증을 다시 거치도록).
const EditItemDialog: React.FC<EditItemDialogProps> = ({ item, versionOptions, onSave, onClose }) => {
  const [member, setMember] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 열릴 때마다 현재 값으로 채운다
  useEffect(() => {
    if (!item) return;
    setMember(item.member ?? "");
    setCategory(item.category ?? "");
    setVersion(item.version ?? "");
    setMemo(item.memo ?? "");
  }, [item]);

  // 과거에 등록된 키는 화이트리스트에 없는 카테고리/버전일 수 있다 → 현재 값도 선택지에 넣어 그대로 보이게 한다.
  // (서버는 카테고리/버전이 "바뀔 때만" 화이트리스트를 검사하므로, 그대로 두고 다른 필드만 고치는 것은 가능)
  const categoryOptions: SelectOption[] = useMemo(() => {
    const keys = Object.keys(versionOptions);
    if (item?.category && !keys.includes(item.category)) keys.push(item.category);
    return keys.map((c) => ({ value: c, label: getCategoryMeta(c).label }));
  }, [versionOptions, item]);

  const versionChoices: SelectOption[] = useMemo(() => {
    const list = [...(versionOptions[category] ?? [])];
    if (item && category === item.category && item.version && !list.includes(item.version)) {
      list.push(item.version);
    }
    return list.map((v) => ({ value: v, label: v }));
  }, [versionOptions, category, item]);

  if (!item) {
    return <Dialog open={false} />;
  }

  const trimmedMember = member.trim();
  const trimmedMemo = memo.trim();
  const changed =
    trimmedMember !== (item.member ?? "") ||
    category !== item.category ||
    version !== item.version ||
    trimmedMemo !== (item.memo ?? "");
  const canSave = changed && !!category && !!version && !isSaving;

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    // 카테고리가 바뀌면 이전 카테고리의 버전은 맞지 않으므로 다시 고르게 한다
    if (value !== category) setVersion("");
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const ok = await onSave(item.no, {
        key: item.key,
        member: trimmedMember,
        category,
        version,
        memo: trimmedMemo,
      });
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const submitOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) save();
  };

  // 메모는 여러 줄 입력이므로 Enter는 줄바꿈, Ctrl/⌘+Enter로 저장
  const submitOnCtrlEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 flex-shrink-0 dark:bg-cyan-400/10">
              <Pencil size={17} className="text-blue-600 dark:text-cyan-400" />
            </span>
            <div className="min-w-0">
              <DialogTitle>라이선스 정보 수정</DialogTitle>
              <DialogDescription className="font-mono truncate">{item.key}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-member">사용자</Label>
            <Input
              id="edit-member"
              value={member}
              onChange={(e) => setMember(e.target.value)}
              onKeyDown={submitOnEnter}
              placeholder="비워두면 배정 해제 (미사용)"
              maxLength={100}
              disabled={isSaving}
              autoFocus
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full space-y-1.5">
              <Label htmlFor="edit-category">카테고리</Label>
              <SelectField
                id="edit-category"
                aria-label="카테고리 선택"
                value={category}
                onChange={handleCategoryChange}
                options={categoryOptions}
                placeholder="카테고리 선택"
                disabled={isSaving}
              />
            </div>
            <div className="w-full space-y-1.5">
              <Label htmlFor="edit-version">버전</Label>
              <SelectField
                id="edit-version"
                aria-label="버전 선택"
                value={version}
                onChange={setVersion}
                options={versionChoices}
                placeholder="버전 선택"
                disabled={isSaving || !category}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="edit-memo">메모</Label>
              <span className="text-[10px] text-muted-foreground">
                {memo.length}/{MAX_MEMO_LENGTH}
              </span>
            </div>
            <textarea
              id="edit-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onKeyDown={submitOnCtrlEnter}
              maxLength={MAX_MEMO_LENGTH}
              rows={3}
              placeholder="PC명, 부서, 구매일, 구매처 등"
              disabled={isSaving}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-muted-foreground hidden sm:block">Enter 저장 · 메모 칸은 Ctrl+Enter</p>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                취소
              </Button>
              <Button onClick={save} disabled={!canSave} className="px-6">
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
