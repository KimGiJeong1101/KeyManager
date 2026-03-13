import React, { useEffect, useState } from "react";
import axios from "axios";
import ItemList from "./components/ItemList";

const App = () => {
  // null = 확인 중, true = 연결됨, false = 연결 실패
  const [isConnected, setIsConnected] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/health")
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, []);

  const connectionBadge = {
    null: {
      dot: "bg-slate-400",
      ping: null,
      text: "연결 확인 중...",
      textColor: "text-slate-400",
    },
    true: {
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
      text: "시스템 연결됨",
      textColor: "text-slate-400",
    },
    false: {
      dot: "bg-red-500",
      ping: "bg-red-400",
      text: "서버 연결 끊김",
      textColor: "text-red-400",
    },
  }[isConnected];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-400 to-purple-500" />

      <main className="pt-12 pb-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <header className="mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                {connectionBadge.ping && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connectionBadge.ping} opacity-75`}
                  ></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connectionBadge.dot}`}
                ></span>
              </span>
              <span
                className={`text-[10px] font-semibold tracking-widest uppercase ${connectionBadge.textColor}`}
              >
                {connectionBadge.text}
              </span>
            </div>

            <h1 className="text-[2.25rem] font-bold tracking-tight text-white leading-none">
              라이선스{" "}
              <span className="text-indigo-600">관리</span>
            </h1>

            <p className="text-sm text-slate-500">
              소프트웨어 라이선스 키를 등록하고 사용자 배포 현황을 관리합니다.
            </p>
          </header>

          {/* 메인 섹션 */}
          <section>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-slate-800/50">
              <ItemList />
            </div>
          </section>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="pb-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <div className="mt-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-600 tracking-wide">라이선스 관리 시스템 v2.1.0</p>
            <p className="text-[11px] text-slate-600">© 2026 Admin Studio</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
