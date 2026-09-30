# k-sub — Seoul Subway Exit Guide

Next.js (App Router) + Tailwind + Supabase로 `subway_exits`의 역명·출구 시설을 **한국어 + 영어**로 보여 줍니다 (관광객용).

## 준비

1. 이 폴더(`k-sub`)에서 의존성을 설치합니다.

```bash
cd k-sub
npm install
```

2. `.env.local`을 만듭니다 (이미 gitignore 됨).

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co/
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

3. Supabase SQL Editor에서 anon 읽기 권한이 없으면 아래를 실행합니다.

```sql
GRANT SELECT ON public.subway_exits TO anon;
```

## 실행

```bash
npm run dev -- -p 43127
```

브라우저에서 [http://127.0.0.1:43127](http://127.0.0.1:43127) 을 엽니다.
