"use client";

import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** Top-right account status: who is playing, with a way to sign in or out. */
export function AuthBar() {
  const { user, loading, logout } = useAuth();

  return (
    <div className="absolute right-5 top-5 z-20 flex items-center gap-2 sm:right-8 sm:top-7">
      {loading ? null : user ? (
        <>
          <span className="flex items-center gap-1.5 text-ui text-ink-muted">
            <UserRound className="h-4 w-4 text-gold" strokeWidth={1.8} aria-hidden />
            <span className="max-w-[10rem] truncate">{user.display_name}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </>
      ) : (
        <>
          <span className="hidden text-ui text-ink-subtle sm:inline">Playing as guest</span>
          <Link href="/login">
            <Button variant="outline" size="sm">
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
