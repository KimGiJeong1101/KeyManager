import React from "react";
import ItemList from "./components/ItemList";

const App = () => {
  return (
    /* - selection: 브랜드 아이덴티티를 살린 블루 테마 셀렉션
       - font-sans: 기본 폰트의 가독성을 높이는 안티앨리어싱 적용
    */
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-700 font-sans">
      {/* 고도화된 배경 레이어: 메쉬 그라데이션과 정밀한 그리드 */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* 미세한 도트/그리드 패턴 */}
        <div className="absolute inset-0 bg-[url('https://play.tailwindcss.com/img/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-25"></div>

        {/* 동적인 분위기를 만드는 소프트 글로우 (Blur) */}
        <div className="absolute -top-[10%] -right-[5%] w-[40rem] h-[40rem] bg-gradient-to-br from-blue-100/40 to-indigo-100/30 rounded-full blur-[120px] animate-pulse duration-[10s]"></div>
        <div className="absolute top-[20%] -left-[10%] w-[30rem] h-[30rem] bg-gradient-to-tr from-sky-100/30 to-slate-100/20 rounded-full blur-[100px]"></div>
      </div>

      <main className="relative z-10 pt-20 pb-24 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* 상단 헤더 영역: 정보 계층 구조 최적화 */}
          <header className="relative mb-16 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/60 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase">
                Enterprise Vault Active
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-[900] tracking-tight text-slate-900 sm:text-6xl">
                License{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Inventory
                </span>
              </h1>

              <p className="max-w-2xl text-lg text-slate-500 leading-relaxed font-medium">
                기업 소유의 소프트웨어 라이선스 자산을{" "}
                <span className="text-slate-800 font-semibold text-nowrap">
                  중앙 집중식으로 관리
                </span>
                하세요.
                <br className="hidden md:block" />
                보안 인증 키 배포 및 실시간 활성화 상태를 안전하게
                모니터링합니다.
              </p>
            </div>

            {/* 헤더 하단 장식선 */}
            <div className="absolute -bottom-6 left-0 w-24 h-1.5 bg-indigo-600 rounded-full"></div>
          </header>

          {/* 메인 리스트 섹션: 카드 형태의 컴포넌트가 들어올 자리에 여백 확보 */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
            <div className="rounded-3xl border border-slate-200/60 bg-white/50 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              {/* ItemList 컴포넌트 호출 */}
              <ItemList />
            </div>
          </section>
        </div>
      </main>

      {/* 푸터 영역: 미니멀하고 정갈한 마무리 */}
      <footer className="relative z-10 pb-12">
        <div className="max-w-6xl mx-auto px-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
          <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-bold text-slate-400 tracking-[0.25em] uppercase">
              Secure Asset Management • v2.1.0
            </p>
            <p className="text-[10px] font-medium text-slate-400">
              © 2026 Admin Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
