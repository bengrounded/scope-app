import LoginClient from "./LoginClient";

export const metadata = { title: "Sign in — Scope" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Scope</h1>
        <p className="text-sm text-slate-600 mb-6">
          Sign in with your Grounded Packaging Google account.
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
