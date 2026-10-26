// app.ts
// Express 앱 조립: 공통 미들웨어 → 기능별 라우터 → 404 / 에러 처리.
// 서버 기동(listen)/종료 처리는 server.ts가 담당한다. 이렇게 나눠 두면 통합 테스트(src/__integration__)가
// 포트를 열지 않고 supertest로 app을 바로 호출할 수 있다.
//
// 라우터 (routes/)
//   meta    : GET /health, GET /categories
//   items   : GET /items, POST /items, PUT /items/:no, DELETE /items/:no
//   stats   : GET /items/category-stats, GET /items/version-stats
//   csv     : GET /items/export, POST /items/import
//   trash   : GET /items/deleted, POST /items/:no/restore, POST /items/:no/purge
//   history : GET /items/:no/history, GET /items/purged, GET /items/purged/:id/history
import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./errors";
import metaRouter from "./routes/meta";
import itemsRouter from "./routes/items";
import statsRouter from "./routes/stats";
import csvRouter from "./routes/csv";
import trashRouter from "./routes/trash";
import historyRouter from "./routes/history";

const app = express();

app.use(cors());
// CSV 가져오기(최대 1000행)를 받을 수 있도록 기본값(100kb)보다 넉넉하게 둔다.
app.use(express.json({ limit: "1mb" }));

app.use(metaRouter);
app.use(itemsRouter);
app.use(statsRouter);
app.use(csvRouter);
app.use(trashRouter);
app.use(historyRouter);

// 정의되지 않은 경로 / 처리되지 않은 에러도 JSON { error }로 응답 (Express 기본 HTML 에러 페이지 대신)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
