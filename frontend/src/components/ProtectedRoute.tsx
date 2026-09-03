// Route guards — session-aware gating for the app shell and auth pages.
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Skeleton, SkeletonCard } from "./ui";

/** App routes: wait for the session probe, then redirect anonymous users to /login. */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-10 md:px-10">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-3/5" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard className="md:col-span-2" />
          <SkeletonCard />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children ?? <Outlet />;
}

/** Auth pages: bounce logged-in users straight to the workspace. */
export function PublicRoute({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-sage" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
