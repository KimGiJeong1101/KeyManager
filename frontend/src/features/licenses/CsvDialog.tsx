import React, { ChangeEvent, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { buildExportUrl, getErrorMessage, importItems } from "../../api/items";
import { ExportFilter, ImportRowInput, ImportRowResult } from "../../types/item";
import { decodeCsvBytes, IMPORT_TEMPLATE_CSV, mapCsvToImportRows, parseCsv } from "../../lib/csv";
import { getCategoryMeta } from "../../lib/categories";
import { cn } from "../../lib/utils";

interface CsvDialogProps {
  open: boolean;
  onClose: () => void;
  // 현재 목록에 걸린 필터 (내보내기 "현재 목록" 기준) + 그 건수
  currentFilter: ExportFilter;
  currentCount: number;
  isFiltering: boolean;
  // 가져오기로 등록된 뒤 목록/통계를 다시 불러오도록 부모에게 알린다
  onImported: () => void;
}

interface Preview {
  fileName: string;
  rows: ImportRowInput[];
  lineNumbers: number[];
  results: ImportRowResult[];
}

// 브라우저가 파일을 내려받게 한다 (서버 URL 또는 클라이언트에서 만든 Blob)
const triggerDownload = (href: string, fileName?: string) => {
  const a = document.createElement("a");
  a.href = href;
  if (fileName) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// CSV 내보내기 / 가져오기 모달.
// 가져오기는 2단계: 파일 선택 → 서버 검증(dryRun) 미리보기 → "N건 등록" 확인 후 실제 등록.
const CsvDialog: React.FC<CsvDialogProps> = ({
  open,
  onClose,
  currentFilter,
  currentCount,
  isFiltering,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const okCount = preview?.results.filter((r) => r.status === "ok").length ?? 0;
  const errorCount = (preview?.results.length ?? 0) - okCount;
  const busy = isChecking || isImporting;

  const reset = () => {
    setPreview(null);
    setParseError(null);
    setShowErrorsOnly(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }));
    triggerDownload(url, "license_import_template.csv");
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setParseError(null);
    setShowErrorsOnly(false);
    setIsChecking(true);
    try {
      const { rows, lineNumbers } = mapCsvToImportRows(parseCsv(decodeCsvBytes(await file.arrayBuffer())));
      const response = await importItems(rows, true);
      setPreview({ fileName: file.name, rows, lineNumbers, results: response.results });
    } catch (err) {
      // 파일 형식 문제(필수 열 없음 등)는 Error.message, 서버 검증 실패(행 수 초과 등)는 응답 메시지
      setParseError(
        err instanceof Error && !("isAxiosError" in err) ? err.message : getErrorMessage(err, "파일을 확인하지 못했습니다."),
      );
    } finally {
      setIsChecking(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!preview || okCount === 0 || isImporting) return;
    setIsImporting(true);
    try {
      const response = await importItems(preview.rows, false);
      toast.success(
        `${response.inserted}건이 등록되었습니다.` + (errorCount > 0 ? ` (오류 ${errorCount}건은 제외)` : ""),
        { icon: <Upload size={18} className="text-emerald-500" /> },
      );
      onImported();
      reset();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "등록 중 오류가 발생했습니다. 아무것도 등록되지 않았습니다."));
    } finally {
      setIsImporting(false);
    }
  };

  // 오류 메시지. 파일 안 중복이면 "엑셀 몇 행과 같은지"를 붙인다.
  const errorText = (r: ImportRowResult) =>
    r.duplicateOf !== undefined && preview
      ? `${r.error} (${preview.lineNumbers[r.duplicateOf]}행과 같음)`
      : r.error;

  const renderResult = (r: ImportRowResult) =>
    r.status === "ok" ? (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={13} /> 등록
      </span>
    ) : (
      <span className="text-red-600 dark:text-red-400">{errorText(r)}</span>
    );

  const visibleResults = preview
    ? preview.results.filter((r) => !showErrorsOnly || r.status === "error")
    : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 flex-shrink-0 dark:bg-emerald-400/10">
              <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <DialogTitle>CSV 내보내기 / 가져오기</DialogTitle>
              <DialogDescription>엑셀에서 열고 편집할 수 있는 CSV 파일로 주고받습니다.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── 내보내기 ── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground">내보내기</h3>
            <div className="flex flex-wrap gap-2">
              {isFiltering && (
                <Button variant="outline" size="sm" onClick={() => triggerDownload(buildExportUrl(currentFilter))}>
                  <Download size={14} />
                  현재 목록 ({currentCount}건)
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerDownload(buildExportUrl({ category: "allassets" }))}
              >
                <Download size={14} />
                전체 목록
              </Button>
            </div>
            {isFiltering && (
              <p className="text-[11px] text-muted-foreground">"현재 목록"은 지금 걸린 탭·상태·검색 조건을 그대로 적용합니다.</p>
            )}
          </section>

          <div className="border-t border-dashed border-border" />

          {/* ── 가져오기 ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-foreground">가져오기 (일괄 등록)</h3>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-[11px] font-medium text-blue-600 hover:underline dark:text-cyan-400"
              >
                양식 내려받기
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              필수 열: <b>라이선스 키, 카테고리, 버전</b> · 선택: <b>사용자, 메모</b>. 키는 하이픈이 없어도 되고, 카테고리는
              Windows / MS Office / 한컴오피스로 적어도 됩니다. 내보낸 파일을 그대로 가져올 수도 있습니다.
            </p>

            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

            {!preview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 transition-colors disabled:opacity-60 dark:border-white/10 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-400/[0.04] dark:hover:text-cyan-300"
              >
                <FileUp size={22} />
                <span className="text-sm font-medium">{isChecking ? "파일 확인 중..." : "CSV 파일 선택"}</span>
              </button>
            )}

            {parseError && (
              <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={14} className="flex-shrink-0 mt-px" />
                {parseError}
              </p>
            )}

            {preview && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-medium text-foreground truncate max-w-[16rem]" title={preview.fileName}>
                    {preview.fileName}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">등록 가능 {okCount}건</span>
                  {errorCount > 0 && (
                    <>
                      <span className="text-red-600 dark:text-red-400 font-semibold">오류 {errorCount}건 (제외됨)</span>
                      <label className="flex items-center gap-1 text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showErrorsOnly}
                          onChange={(e) => setShowErrorsOnly(e.target.checked)}
                        />
                        오류만 보기
                      </label>
                    </>
                  )}
                </div>

                <div className="max-h-[40vh] overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-right w-10 font-medium">행</th>
                        <th className="px-2 py-2 text-left font-medium">라이선스 키</th>
                        <th className="px-2 py-2 text-left font-medium hidden sm:table-cell">카테고리 / 버전</th>
                        <th className="px-2 py-2 text-left font-medium hidden sm:table-cell">사용자</th>
                        <th className="px-2 py-2 text-left font-medium hidden sm:table-cell">결과</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleResults.map((r) => {
                        const input = preview.rows[r.index];
                        const ok = r.status === "ok";
                        return (
                          <tr key={r.index} className={cn(!ok && "bg-red-50/60 dark:bg-red-400/[0.06]")}>
                            <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">
                              {preview.lineNumbers[r.index]}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="font-mono whitespace-nowrap text-foreground">
                                {ok ? r.key : input.key || <span className="text-muted-foreground">(비어 있음)</span>}
                              </div>
                              {/* 좁은 화면: 결과 열 대신 키 아래에 표시 */}
                              <div className="sm:hidden mt-0.5">{renderResult(r)}</div>
                            </td>
                            <td className="px-2 py-1.5 hidden sm:table-cell text-muted-foreground whitespace-nowrap">
                              {ok ? `${getCategoryMeta(r.category).label} · ${r.version}` : `${input.category} · ${input.version}`}
                            </td>
                            <td className="px-2 py-1.5 hidden sm:table-cell text-muted-foreground whitespace-nowrap">
                              {(ok ? r.member : input.member) || "-"}
                            </td>
                            <td className="px-2 py-1.5 hidden sm:table-cell min-w-[12rem]">{renderResult(r)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                    다른 파일 선택
                  </Button>
                  <Button onClick={handleImport} disabled={okCount === 0 || busy}>
                    <Upload size={15} />
                    {isImporting ? "등록 중..." : `${okCount}건 등록`}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvDialog;
