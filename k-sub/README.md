# k-sub — Seoul Subway Exit Guide

From(출발역) + To(도착 역/랜드마크) 검색으로 출구 안내 페이지로 이동합니다.  
To 필드에는 `출구시설_EN` 랜드마크도 포함됩니다.

## 로컬 실행

```bash
cd k-sub
npm install
# .env.local 에 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
npm run dev -- -p 43127
```

## Vercel 배포
저장소 **Root Directory를 `k-sub`로** 설정하세요.  
환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
자세한 초보 가이드: Context `docs/deploy-vercel.md`
