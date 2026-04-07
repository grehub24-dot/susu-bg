import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <main className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h1 className="text-3xl font-semibold tracking-tight">Susu-BG</h1>
        <p className="mt-2 text-sm text-zinc-600">Daily savings and wallet management for Ghana.</p>
        <div className="mt-8 grid gap-3">
          <Link className="rounded-xl bg-[#2d3436] px-4 py-3 text-center text-white" href="/login">
            Login
          </Link>
          <Link className="rounded-xl bg-[#e8b4b8] px-4 py-3 text-center text-[#2d3436]" href="/register">
            Register
          </Link>
          <Link className="rounded-xl border border-zinc-200 px-4 py-3 text-center" href="/dashboard">
            Open Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
