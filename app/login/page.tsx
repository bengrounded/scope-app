import LoginClient from "./LoginClient";
import TackLogo from "@/components/TackLogo";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <TackLogo size={32} radius={7} />
          <h1 className="text-2xl font-bold tracking-tight">scope</h1>
          <span className="text-xs text-slate-400 ml-1">
            by <span className="text-slate-700 font-semibold">tack</span>
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-6 mt-2">
          Sign in with your work Google account.
        </p>
        <LoginClient
          nextPath={searchParams.next ?? "/"}
          initialError={searchParams.error}
        />
        <p className="text-xs text-slate-500 mt-6 text-center">
          Access is restricted to @groundedpackaging.co.
        </p>
      </div>
    </main>
  );
}
