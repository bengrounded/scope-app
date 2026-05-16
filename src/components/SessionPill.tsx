"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

interface SessionInfo {
  email: string;
  fullName?: string | null;
}

export default function SessionPill() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sb = getBrowserSupabase();
    let mounted = true;

    sb.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user?.email) {
        setSession({
          email: data.user.email,
          fullName:
            (data.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      if (sess?.user?.email) {
        setSession({
          email: sess.user.email,
          fullName:
            (sess.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      } else {
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    // Render a placeholder so the header doesn't reflow on hydration.
    return <div className="w-8 h-8 rounded-full bg-slate-100" aria-hidden />;
  }

  const initial = (session.fullName || session.email).charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold hover:bg-indigo-700"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-40 text-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-100">
              {session.fullName && (
                <div className="font-medium">{session.fullName}</div>
              )}
              <div className="text-xs text-slate-500 truncate">
                {session.email}
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-rose-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
