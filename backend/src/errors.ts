// 공통 에러 응답 / 에러 처리 미들웨어.
// 모든 에러 응답은 JSON { error: "..." } 형태로 통일한다 → 프론트(getErrorMessage)가 항상 메시지를 꺼낼 수 있고,
// Express 기본 에러 페이지(HTML + 스택 트레이스 + 서버 경로)가 외부에 노출되지 않는다.
import { ErrorRequestHandler, RequestHandler } from "express";
import { ApiErrorBody } from "./types";

export const SERVER_ERROR: ApiErrorBody = {
  error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

// URL의 :no / :id 파라미터는 양의 정수 문자열만 허용
export const isValidNo = (value: string): boolean => /^\d+$/.test(value);

// 정의되지 않은 경로 (Express 기본값은 HTML "Cannot GET /..." 페이지)
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "요청한 API를 찾을 수 없습니다." });
};

// 라우트 밖에서 난 에러 (주로 express.json()의 본문 파싱 실패/크기 초과) + 라우트에서 놓친 예외
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  // body-parser가 붙여주는 type으로 구분 (https://github.com/expressjs/body-parser#errors)
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "요청 본문이 올바른 JSON 형식이 아닙니다." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "요청이 너무 큽니다. (최대 1MB)" });
  }

  console.error("처리되지 않은 에러:", err);
  res.status(500).json(SERVER_ERROR);
};
