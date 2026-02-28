import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const ItemListDisplay = ({ items, deleteItem, updateItem }) => {
  const [editMode, setEditMode] = useState(null);
  const [editKey, setEditKey] = useState("");
  const [editMember, setEditMember] = useState("");

  const handleEdit = (item) => {
    setEditMode(item.no);
    setEditKey(item.key);
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

  const isAssigned = (member) =>
    member && member !== "사용자없음" && member !== "";

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <table className="w-full border-separate border-spacing-y-3">
        <thead>
          <tr className="text-slate-400">
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-center w-24">
              Index
            </th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-left">
              License Identifier
            </th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-center">
              Status / Assignee
            </th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-right pr-10">
              Management
            </th>
          </tr>
        </thead>

        <tbody className="before:leading-[0.1rem] before:block">
          {items.map((item) => {
            const assigned = isAssigned(item.member);
            const isEditing = editMode === item.no;

            return (
              <tr
                key={item.no}
                className={`group transition-all duration-300 ${
                  isEditing ? "translate-x-1" : ""
                }`}
              >
                {/* INDEX COLUMN */}
                <td
                  className={`px-6 py-5 bg-white first:rounded-l-2xl border-y border-l transition-all duration-300 ${
                    isEditing
                      ? "border-indigo-500 bg-indigo-50/30"
                      : "border-slate-100 group-hover:border-slate-200 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <div className="flex justify-center">
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${
                        isEditing
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      {item.no.toString().padStart(3, "0")}
                    </span>
                  </div>
                </td>

                {/* LICENSE KEY COLUMN */}
                <td
                  className={`px-6 py-5 bg-white border-y transition-all duration-300 ${
                    isEditing
                      ? "border-indigo-500 bg-indigo-50/30"
                      : "border-slate-100 group-hover:border-slate-200 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span
                      className={`font-mono font-bold tracking-tight text-[17px] leading-none transition-all ${
                        assigned && !isEditing
                          ? "text-slate-300 line-through"
                          : "text-slate-700"
                      }`}
                    >
                      {item.key}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                          assigned
                            ? "bg-slate-50 text-slate-300"
                            : "bg-indigo-50 text-indigo-500"
                        }`}
                      >
                        {item.version}
                      </span>
                    </div>
                  </div>
                </td>

                {/* ASSIGNEE COLUMN */}
                <td
                  className={`px-6 py-5 bg-white border-y transition-all duration-300 text-center ${
                    isEditing
                      ? "border-indigo-500 bg-indigo-50/30"
                      : "border-slate-100 group-hover:border-slate-200 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  {isEditing ? (
                    <div className="relative inline-block scale-95 origin-center">
                      <input
                        type="text"
                        value={editMember}
                        onChange={(e) => setEditMember(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Assignee name"
                        className="w-40 px-4 py-2 text-xs font-bold bg-white border-2 border-indigo-500 rounded-xl outline-none shadow-xl shadow-indigo-500/10 uppercase"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all border ${
                        assigned
                          ? "bg-slate-50 text-slate-400 border-slate-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100 ring-4 ring-emerald-500/5"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full mr-2 ${assigned ? "bg-slate-300" : "bg-emerald-500 animate-pulse"}`}
                      ></span>
                      {assigned ? item.member.toUpperCase() : "AVAILABLE ASSET"}
                    </span>
                  )}
                </td>

                {/* ACTIONS COLUMN */}
                <td
                  className={`px-6 py-5 bg-white last:rounded-r-2xl border-y border-r transition-all duration-300 text-right pr-8 ${
                    isEditing
                      ? "border-indigo-500 bg-indigo-50/30"
                      : "border-slate-100 group-hover:border-slate-200 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-90"
                        >
                          <CheckIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button
                          onClick={() => setEditMode(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <EditRoundedIcon sx={{ fontSize: 20 }} />
                        </button>
                        <button
                          disabled={assigned}
                          onClick={() => deleteItem(item.no)}
                          className={`p-2 rounded-lg transition-all ${
                            assigned
                              ? "text-slate-100 cursor-not-allowed opacity-30"
                              : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                          }`}
                          title="Delete"
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 22 }} />
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

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-50/30 rounded-[2.5rem] border-2 border-dashed border-slate-100">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <CloseIcon className="text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-semibold tracking-tight">
            No assets found in the database.
          </p>
        </div>
      )}
    </div>
  );
};

export default ItemListDisplay;
