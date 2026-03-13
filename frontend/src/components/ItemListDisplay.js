import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const ItemListDisplay = ({ items, deleteItem, updateItem }) => {
  // editMode: 현재 편집 중인 항목의 no (null이면 편집 모드 없음)
  const [editMode, setEditMode] = useState(null);
  const [editKey, setEditKey] = useState("");
  const [editMember, setEditMember] = useState("");

  const handleEdit = (item) => {
    setEditMode(item.no);
    setEditKey(item.key);
    // member가 null/undefined인 경우 빈 문자열로 초기화
    setEditMember(item.member || "");
  };

  const handleSave = () => {
    updateItem(editMode, editKey, editMember);
    setEditMode(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleSave();
    if (event.key === "Escape") setEditMode(null);
  };

  // 사용자 배정 여부 판단
  // null, '사용자없음', 빈 문자열 → 미사용(미배정) 상태
  const isAssigned = (member) =>
    member && member !== "사용자없음" && member !== "";

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <table className="w-full border-separate border-spacing-y-1.5">
        <thead>
          <tr className="bg-slate-800/40">
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 text-center w-20 first:rounded-l-lg">
              번호
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 text-left">
              라이선스 키
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 text-center">
              사용자
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 text-right pr-8 last:rounded-r-lg">
              관리
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const assigned = isAssigned(item.member);
            // isEditing: 현재 행이 편집 모드인지 여부
            const isEditing = editMode === item.no;

            return (
              <tr
                key={item.no}
                className={`group transition-all duration-200 ${
                  isEditing ? "translate-x-0.5" : ""
                }`}
              >
                {/* 번호 셀: 편집 모드일 때 인디고 배경/테두리로 강조 */}
                <td
                  className={`px-4 py-3.5 first:rounded-l-xl border-y border-l transition-all duration-200 ${
                    isEditing
                      ? "border-indigo-500/40 bg-indigo-900/20"
                      : "bg-slate-800/60 border-slate-700/50 group-hover:border-slate-600/70 group-hover:bg-slate-800"
                  }`}
                >
                  <div className="flex justify-center">
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                        isEditing
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-700 text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {item.no.toString().padStart(3, "0")}
                    </span>
                  </div>
                </td>

                {/* 라이선스 키 셀: 배정된 키는 취소선 + 흐린 색으로 표시 */}
                <td
                  className={`px-4 py-3.5 border-y transition-all duration-200 ${
                    isEditing
                      ? "border-indigo-500/40 bg-indigo-900/20"
                      : "bg-slate-800/60 border-slate-700/50 group-hover:border-slate-600/70 group-hover:bg-slate-800"
                  }`}
                >
                  <div className="flex flex-col">
                    <span
                      className={`font-mono font-semibold text-sm leading-none tracking-wide transition-all ${
                        assigned && !isEditing
                          ? "text-slate-600 line-through"
                          : "text-slate-200"
                      }`}
                    >
                      {item.key}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[10px] font-medium tracking-wide ${
                          assigned ? "text-slate-600" : "text-indigo-400"
                        }`}
                      >
                        {item.version}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 사용자 셀: 편집 모드 → 입력칸, 일반 모드 → 상태 배지 */}
                <td
                  className={`px-4 py-3.5 border-y transition-all duration-200 text-center ${
                    isEditing
                      ? "border-indigo-500/40 bg-indigo-900/20"
                      : "bg-slate-800/60 border-slate-700/50 group-hover:border-slate-600/70 group-hover:bg-slate-800"
                  }`}
                >
                  {isEditing ? (
                    <div className="relative inline-block">
                      <input
                        type="text"
                        value={editMember}
                        onChange={(e) => setEditMember(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="사용자명"
                        className="w-36 px-3 py-1.5 text-xs font-medium bg-slate-700 text-slate-200 border-2 border-indigo-500 rounded-lg outline-none shadow-sm placeholder:text-slate-600"
                        autoFocus
                      />
                    </div>
                  ) : (
                    // 미사용: 에메랄드(초록) 배지 + pulse 애니메이션
                    // 사용 중: 회색 배지
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                        assigned
                          ? "bg-slate-700/50 text-slate-500 border-slate-700"
                          : "bg-emerald-900/20 text-emerald-400 border-emerald-800/50"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          assigned ? "bg-slate-600" : "bg-emerald-500 animate-pulse"
                        }`}
                      ></span>
                      {assigned ? item.member : "미사용"}
                    </span>
                  )}
                </td>

                {/* 관리 버튼 셀
                    편집 모드: 저장(체크) / 취소(X)
                    일반 모드: 수정(연필) / 삭제(휴지통)
                    삭제 버튼은 배정된 키(사용 중)일 경우 비활성화 */}
                <td
                  className={`px-4 py-3.5 last:rounded-r-xl border-y border-r transition-all duration-200 text-right pr-6 ${
                    isEditing
                      ? "border-indigo-500/40 bg-indigo-900/20"
                      : "bg-slate-800/60 border-slate-700/50 group-hover:border-slate-600/70 group-hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-90"
                        >
                          <CheckIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          onClick={() => setEditMode(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition-all"
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-slate-600 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-all"
                          title="수정"
                        >
                          <EditRoundedIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          disabled={assigned}
                          onClick={() => deleteItem(item.no)}
                          className={`p-2 rounded-lg transition-all ${
                            assigned
                              ? "text-slate-700 cursor-not-allowed"
                              : "text-slate-600 hover:text-red-400 hover:bg-red-900/20"
                          }`}
                          title="삭제"
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 빈 상태 UI */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-700/60 bg-gradient-to-b from-slate-800/20 to-transparent">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
            <span className="text-slate-600 text-lg font-mono font-bold select-none">—</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">등록된 라이선스가 없습니다.</p>
          <p className="text-slate-600 text-xs mt-1.5">위 폼에서 라이선스를 등록해주세요.</p>
        </div>
      )}
    </div>
  );
};

export default ItemListDisplay;
