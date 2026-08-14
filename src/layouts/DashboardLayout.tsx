import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Header from "../components/Dashboard/Header";
import Sidebar from "../components/Dashboard/Sidebar";
import { useIsMobile } from "../hooks/useMediaQuery";

const SIDEBAR_STATE_KEY = "sidebar-open";

function readStoredSidebarState(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STATE_KEY) !== "false";
  } catch {
    return true;
  }
}

export default function DashboardLayout() {
  const isMobile = useIsMobile();

  // On desktop the collapsed/expanded choice is the user's and is remembered.
  // On mobile the sidebar is a drawer that always starts closed.
  const [desktopOpen, setDesktopOpen] = useState(readStoredSidebarState);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isOpen = isMobile ? drawerOpen : desktopOpen;

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setDrawerOpen((open) => !open);
      return;
    }
    setDesktopOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(SIDEBAR_STATE_KEY, String(next));
      } catch {
        // Preference simply is not persisted if storage is unavailable.
      }
      return next;
    });
  }, [isMobile]);

  // Navigating closes the drawer. Handled as an event from the sidebar rather
  // than as a route effect, so no state is set during a render pass.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Lock body scroll behind the drawer so the page underneath cannot be
  // scrolled by touch while the overlay is up.
  useEffect(() => {
    if (!isMobile || !drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, drawerOpen]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    // h-dvh, not h-screen: on mobile browsers the dynamic viewport unit accounts
    // for the collapsing address bar, so the composer is not pushed off-screen.
    <div className="flex h-dvh overflow-hidden font-sans app-surface text-slate-900 dark:text-gray-100">
      <Sidebar
        isOpen={isOpen}
        toggle={toggleSidebar}
        isMobile={isMobile}
        onNavigate={closeDrawer}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The wordmark lives in the sidebar while it is open and moves to the
            header when it collapses, so it is never on screen twice. */}
        <Header toggleSidebar={toggleSidebar} isMobile={isMobile} showBrand={!isOpen} />

        {/* The page owns its own scrolling and background; this container only
            provides the box. It used to force a dark gradient here, which left
            the whole content area dark even in light mode. */}
        <main className="relative flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
