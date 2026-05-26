# 토스 미니앱용 공통 API 백엔드 서버 (Shared AI Proxy Workers)

이 프로젝트는 토스 웹뷰 미니앱(Apps in Toss WebView)의 다양한 LLM(Gemini / OpenAI) 기능을 중개(Proxy)해주는 공통 백엔드 서버입니다.
**Cloudflare Workers**와 초경량 웹 프레임워크인 **Hono**를 기반으로 작동합니다.

---

## 주요 기능

1. **글로벌 CORS 연동**: 토스 앱 내부 웹뷰 및 배포 환경(Pages)에서 호출 시 차단당하지 않도록 CORS 허용(`*`) 설정이 되어 있습니다.
2. **보안 검증 (`X-App-Secret-Key`)**: 무단 트래픽 도용을 방지하기 위해 프론트엔드가 요청 헤더에 지정된 비밀키(`X-App-Secret-Key`)를 포함해야만 통신할 수 있도록 잠금 처리가 가능합니다.
3. **다중 에이전트 확장 라우트**:
   - `/api/dream` : 마법사 리트리버의 꿈해몽 (현재 꿈해몽 프로젝트용)
   - `/api/tarot` : 고양이 리더의 타로점 (미래 프로젝트용)
   - `/api/fortune` : 장수거북 도사의 사주 운세 (미래 프로젝트용)
   - `/api/health` : 서버 작동 및 환경변수 설정 여부 상태체크용

---

## 로컬 개발 및 실행 방법

1. 의존성 설치:
   ```bash
   npm install
   ```

2. 환경변수 파일 생성:
   - 복사본 생성: `.env.example` 파일을 복사하여 `.dev.vars` 파일을 만듭니다. (Cloudflare 로컬 환경에서는 `.env` 대신 `.dev.vars`를 사용합니다.)
   - 내부의 `GEMINI_API_KEY`, `APP_SECRET_KEY` 등을 설정합니다.

3. 로컬 서버 시작:
   ```bash
   npm run dev
   ```
   - 기본적으로 `http://localhost:8787`에서 서버가 실행됩니다.
   - 브라우저나 API 테스터로 `http://localhost:8787/api/health`에 접속해서 응답이 잘 오는지 확인합니다.

---

## Cloudflare 배포 방법

Wrangler CLI를 사용해 하나의 명령어로 즉시 배포할 수 있습니다.

1. Cloudflare 로그인 (최초 1회):
   ```bash
   npx wrangler login
   ```

2. 프로젝트 배포:
   ```bash
   npm run deploy
   ```
   - 배포가 완료되면 터미널에 실서버 주소(예: `https://toss-common-api.<subdomain>.workers.dev`)가 출력됩니다.

3. 실서버 비밀 환경변수 등록 (중요):
   - **방법 1 (웹 대시보드)**: Cloudflare Dashboard > Workers & Pages > `toss-common-api` 선택 > Settings > Variables에서 `GEMINI_API_KEY`와 `APP_SECRET_KEY`를 등록하고 **Encrypt(암호화)** 및 저장합니다.
   - **방법 2 (터미널)**: 아래 명령어를 이용해 등록합니다.
     ```bash
     npx wrangler secret put GEMINI_API_KEY
     npx wrangler secret put APP_SECRET_KEY
     ```

---

## 프론트엔드 연결 설정

백엔드가 배포되면 기존 미니앱의 프론트엔드 코드(예: `DreamPage.tsx`)의 fetch 호출을 다음과 같이 구성합니다.

```typescript
// 1. 요청 시 헤더에 보안 키를 실어 보냅니다.
const response = await fetch("https://toss-common-api.<your-subdomain>.workers.dev/api/dream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-App-Secret-Key": "your_app_secret_key_here" // 백엔드와 약속된 비밀키
  },
  body: JSON.stringify({ dream: dreamText }),
});
```
