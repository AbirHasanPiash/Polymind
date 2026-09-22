import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import CommandPalette from "../components/layout/CommandPalette";
import Header from "../components/layout/Header";
import { HeaderSlotContext } from "../components/layout/header-slot";
import MobileTabBar from "../components/layout/MobileTabBar";
import { isChatRoute, pageTitle } from "../components/layout/nav";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/auth-context";
import { useChatReset } from "../context/chat-reset-context";
import { useHotkey } from "../hooks/useHotkeys";
import { useIsMobile } from "../hooks/useMediaQuery";
import { readString, writeString } from "../lib/storage";

const SIDEBAR_STATE_KEY = "sidebar-open";

export default function DashboardLayout() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerReset } = useChatReset();

  // On desktop the collapsed/expanded choice is the user's and is remembered.
  // On mobile the sidebar is a drawer that always starts closed.
  const [desktopOpen, setDesktopOpen] = useState(() => readString(SIDEBAR_STATE_KEY) !== "false");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The top bar's action slot; pages render into it through HeaderPortal.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  const isOpen = isMobile ? drawerOpen : desktopOpen;

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setDrawerOpen((open) => !open);
      return;
    }
    setDesktopOpen((open) => {
      writeString(SIDEBAR_STATE_KEY, String(!open));
      return !open;
    });
  }, [isMobile]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openPalette = useCallback(() => {
    setDrawerOpen(false);
    setPaletteOpen(true);
  }, []);

  useHotkey("mod+k", (event) => {
    event.preventDefault();
    setPaletteOpen((open) => !open);
  }, { allowInInputs: true });

  useHotkey(
    "mod+shift+o",
    (event) => {
      event.preventDefault();
      triggerReset();
      navigate("/dashboard");
    },
    { allowInInputs: true },
  );

  // Lock body scroll behind the drawer.
  useEffect(() => {
    if (!isMobile || !drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const showTabBar = isMobile && !isChatRoute(pathname);

  // The chat page names the tab after the conversation; every other page is
  // named here.
  useEffect(() => {
    if (!isChatRoute(pathname)) document.title = `${pageTitle(pathname)} · Polymind`;
  }, [pathname]);

  return (
    // h-dvh, not h-screen: on mobile browsers the dynamic viewport unit accounts
    // for the collapsing address bar, so the composer is not pushed off-screen.
    <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
      <Sidebar isOpen={isOpen} toggle={toggleSidebar} isMobile={isMobile} onNavigate={closeDrawer} onOpenPalette={openPalette} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header toggleSidebar={toggleSidebar} isMobile={isMobile} onSlotRef={setHeaderSlot} />
        <main className={showTabBar ? "relative flex-1 overflow-hidden pb-14" : "relative flex-1 overflow-hidden"}>
          <HeaderSlotContext.Provider value={headerSlot}>
            <Outlet />
          </HeaderSlotContext.Provider>
        </main>
      </div>

      {showTabBar && <MobileTabBar onOpenMenu={toggleSidebar} />}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} isAdmin={Boolean(user?.is_superuser)} />
    </div>
  );
}
