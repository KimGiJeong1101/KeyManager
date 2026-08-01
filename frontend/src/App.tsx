import React, { useEffect, useState } from "react";
import ItemList from "./features/licenses/ItemList";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { checkHealth } from "./api/items";

const THEME_KEY = "km-theme";

type Theme = "dark" | "light";

interface ConnectionBadgeStyle {
  dot: string;
  ping: string | null;
  text: string;
  textColor: string;
}

const CONNECTION_BADGE_MAP: Record<"null" | "true" | "false", ConnectionBadgeStyle> = {
  null: {
    dot: "bg-slate-400",
    ping: null,
    text: "연결 확인 중...",
    textColor: "text-slate-500 dark:text-slate-400",
  },
  true: {
    dot: "bg-emerald-500",
    ping: "bg-emerald-400",
    text: "시스템 연결됨",
    textColor: "text-slate-500 dark:text-slate-400",
  },
  false: {
    dot: "bg-red-500",
    ping: "bg-red-400",
    text: "서버 연결 끊김",
    textColor: "text-red-500 dark:text-red-400",
  },
};

const App: React.FC = () => {
  // null = 확인 중, true = 연결됨, false = 연결 실패
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme) || "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const checkConnection = () => {
      checkHealth()
        .then(() => setIsConnected(true))
        .catch(() => setIsConnected(false));
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const connectionBadge =
    CONNECTION_BADGE_MAP[String(isConnected) as "null" | "true" | "false"];

  return (
    <div className="min-h-screen antialiased font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* 배경 글로우 (다크 모드 전용) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden hidden dark:block">
        <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-fuchsia-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[24rem] h-[24rem] bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 relative z-10" />

      <main className="relative z-10 pt-8 sm:pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <header className="mb-8 sm:mb-10">
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* 연결 상태 배지 */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 dark:shadow-none dark:backdrop-blur-xl">
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

              {/* 테마 토글 */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-90 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-cyan-400/30 dark:backdrop-blur-xl"
              >
                {theme === "dark" ? (
                  <LightModeRoundedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <DarkModeRoundedIcon sx={{ fontSize: 18 }} />
                )}
              </button>
            </div>

            {/* 타이틀 영역 */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* 아이콘 블록 */}
              <div className="flex-shrink-0 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-xl shadow-indigo-500/20 dark:shadow-indigo-500/40 dark:ring-1 dark:ring-white/10">
                <VpnKeyRoundedIcon className="text-white" sx={{ fontSize: 32 }} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-bold tracking-tight leading-none truncate">
                  <span className="text-slate-900 dark:text-slate-100">라이선스</span>{" "}
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent">
                    관리
                  </span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  소프트웨어 라이선스 키를 등록하고 사용자 배포 현황을 관리합니다.
                </p>
              </div>
            </div>
          </header>

          {/* 메인 섹션 */}
          <section>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden dark:border-white/10 dark:bg-slate-900/60 dark:backdrop-blur-xl dark:shadow-2xl dark:shadow-black/40">
              <ItemList />
            </div>
          </section>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="relative z-10 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10"></div>
          <div className="mt-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 tracking-wide">라이선스 관리 시스템 v2.1.0</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">© 2026 Admin Studio</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
