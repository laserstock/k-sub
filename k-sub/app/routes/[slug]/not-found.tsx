import Link from "next/link";

export default function RouteNotFound() {
  return (
    <main className="min-h-full flex-1 bg-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-14">
        <div className="rounded-xl bg-white px-5 py-8 shadow-md shadow-zinc-200/80">
          <h1 className="text-2xl font-bold text-zinc-900">Invalid route</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Use a slug like{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
              jonggak-to-seoul-station
            </code>
            .
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            올바른 경로 형식이 아닙니다. 홈에서 다시 검색해 주세요.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
