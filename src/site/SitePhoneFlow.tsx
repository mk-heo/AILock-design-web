import {
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AilockButton,
  PhoneFrame,
  ReasonComposer,
} from "../components/ailock";
import { DesignIcon } from "../design/icons";
import { sitePhoneApps, type SitePhoneApp, type SitePhoneAppId } from "./siteData";

export type SiteAilockRoute = "home" | "records" | "restrictions" | "settings";

type SitePhoneSurface = "phoneHome" | "ailock" | "externalApp" | "lockPrompt";

export type SiteAilockRenderProps = {
  onboarded: boolean;
  restartOnboarding: () => void;
  route: SiteAilockRoute;
  routeOverlayOpen: boolean;
  setOnboarded: Dispatch<SetStateAction<boolean>>;
  setRoute: Dispatch<SetStateAction<SiteAilockRoute>>;
  setRouteOverlayOpen: Dispatch<SetStateAction<boolean>>;
};

const surfaceLabels: Record<SitePhoneSurface, string> = {
  phoneHome: "휴대폰 홈",
  ailock: "AILock",
  externalApp: "외부 앱",
  lockPrompt: "차단 팝업",
};

const routeLabels: Record<SiteAilockRoute, string> = {
  home: "홈",
  records: "기록",
  restrictions: "제한",
  settings: "설정",
};

function formatRemainingTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분 ${remainingSeconds}초 남음`;
  if (minutes > 0) return `${minutes}분 ${remainingSeconds}초 남음`;
  return `${remainingSeconds}초 남음`;
}

function SiteAppIcon({ app }: { app: Pick<SitePhoneApp, "color" | "letter"> }) {
  return (
    <span className="app-icon" style={{ "--app-icon-color": app.color } as CSSProperties}>
      <span>{app.letter}</span>
    </span>
  );
}

function SitePhoneHomeMock({
  activeAppId,
  onOpenApp,
}: {
  activeAppId?: SitePhoneAppId | null;
  onOpenApp: (app: SitePhoneApp) => void;
}) {
  return (
    <main className="site-phone-home">
      <div className="site-phone-home-grid" aria-label={"휴대폰 앱"}>
        {sitePhoneApps.map((app) => (
          <button
            aria-label={`${app.name} 열기`}
            className={`site-phone-home-app ${activeAppId === app.id ? "active" : ""} ${app.locked ? "locked" : ""}`}
            key={app.id}
            onClick={() => onOpenApp(app)}
            type="button"
          >
            <SiteAppIcon app={app} />
            <span>{app.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

function SiteExternalAppMock({
  app,
  onReturnHome,
}: {
  app: SitePhoneApp;
  onReturnHome: () => void;
}) {
  return (
    <div className="site-external-app">
      <div className="site-external-app-bar">
        <SiteAppIcon app={app} />
        <span>
          <strong>{app.name}</strong>
          <small>{"제한 없음"}</small>
        </span>
      </div>
      <div className="site-external-app-body" />
      <div className="app-bottom-action">
        <AilockButton onClick={onReturnHome} variant="secondary">
          {"휴대폰 홈"}
        </AilockButton>
      </div>
    </div>
  );
}

function SiteFlowPanel({
  activeApp,
  onboarded,
  onOpenApp,
  onReset,
  onReturnHome,
  route,
  surface,
}: {
  activeApp: SitePhoneApp | null;
  onboarded: boolean;
  onOpenApp: (app: SitePhoneApp) => void;
  onReset: () => void;
  onReturnHome: () => void;
  route: SiteAilockRoute;
  surface: SitePhoneSurface;
}) {
  const lockedApps = sitePhoneApps.filter((app) => app.locked);
  const screenLabel =
    activeApp && surface !== "phoneHome" ? `${surfaceLabels[surface]} · ${activeApp.name}` : surfaceLabels[surface];
  const routeLabel = surface === "ailock" && onboarded ? routeLabels[route] : "없음";
  const onboardingLabel = onboarded ? "완료" : "미완료";

  return (
    <aside className="site-flow-panel" aria-label="Phone flow controls">
      <div className="site-flow-panel-header">
        <span className="site-panel-icon">
          <DesignIcon name="layers" size={18} />
        </span>
        <div>
          <span>{"흐름 상태"}</span>
          <strong>{screenLabel}</strong>
        </div>
        <span className={`site-flow-state-pill ${onboarded ? "complete" : ""}`}>{onboardingLabel}</span>
      </div>

      <div className="site-flow-status-strip" aria-label={"현재 흐름"}>
        <SiteFlowMetric label={"현재 화면"} value={screenLabel} />
        <SiteFlowMetric label={"온보딩"} value={onboardingLabel} />
        <SiteFlowMetric label={"앱 라우트"} value={routeLabel} />
      </div>

      <div className="site-flow-lock-strip" aria-label={"제한 앱"}>
        <span className="site-flow-strip-label">{`제한 앱 ${lockedApps.length}개`}</span>
        {lockedApps.map((app) => (
          <SiteFlowLockPill app={app} key={app.id} />
        ))}
      </div>

      <div className="site-flow-app-strip" aria-label={"앱 실행"}>
        <span className="site-flow-strip-label">{"앱 실행"}</span>
        {sitePhoneApps.map((app) => (
          <SiteFlowAppChip active={activeApp?.id === app.id} app={app} key={app.id} onOpenApp={onOpenApp} />
        ))}
      </div>

      <div className="site-flow-panel-actions">
        <AilockButton full={false} onClick={onReturnHome} size="small" variant="secondary">
          {"홈으로"}
        </AilockButton>
        <AilockButton
          full={false}
          icon={<DesignIcon name="history" size={18} />}
          onClick={onReset}
          size="small"
          variant="secondary"
        >
          {"설정 리셋"}
        </AilockButton>
      </div>
    </aside>
  );
}

function SiteFlowMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="site-flow-metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function SiteFlowLockPill({ app }: { app: SitePhoneApp }) {
  const remainingSeconds = app.remainingSeconds ?? 0;
  const limitSeconds = app.limitSeconds ?? remainingSeconds;
  const progress = limitSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / limitSeconds)) : 0;

  return (
    <span className="site-flow-lock-pill" style={{ "--lock-progress": `${Math.round(progress * 100)}%` } as CSSProperties}>
      <SiteAppIcon app={app} />
      <span>
        <strong>{app.name}</strong>
        <small>{formatRemainingTime(remainingSeconds)}</small>
      </span>
    </span>
  );
}

function SiteFlowAppChip({
  active,
  app,
  onOpenApp,
}: {
  active: boolean;
  app: SitePhoneApp;
  onOpenApp: (app: SitePhoneApp) => void;
}) {
  return (
    <button
      className={`site-flow-app-chip ${active ? "active" : ""} ${app.locked ? "locked" : ""}`}
      onClick={() => onOpenApp(app)}
      type="button"
    >
      <SiteAppIcon app={app} />
      <span>{app.name}</span>
    </button>
  );
}

function SitePhoneGestureLayer({
  children,
  onBack,
  onHome,
}: {
  children: ReactNode;
  onBack: () => void;
  onHome: () => void;
}) {
  const homeStartYRef = useRef<number | null>(null);
  const backStartRef = useRef<{ x: number; y: number } | null>(null);

  const finishHomeGesture = (event: PointerEvent<HTMLButtonElement>) => {
    if (homeStartYRef.current === null) return;
    if (homeStartYRef.current - event.clientY > 18) onHome();
    homeStartYRef.current = null;
  };

  const finishBackGesture = (event: PointerEvent<HTMLButtonElement>) => {
    const start = backStartRef.current;
    if (!start) return;
    const movedX = event.clientX - start.x;
    const movedY = Math.abs(event.clientY - start.y);
    if (movedX > 42 && movedY < 96) onBack();
    backStartRef.current = null;
  };

  return (
    <div className="site-phone-gesture-shell">
      {children}
      <button
        aria-label={"뒤로가기"}
        className="site-phone-back-zone"
        onClick={onBack}
        onPointerCancel={() => {
          backStartRef.current = null;
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          backStartRef.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={finishBackGesture}
        title={"뒤로가기"}
        type="button"
      >
        <span />
      </button>
      <button
        aria-label={"홈으로"}
        className="site-phone-home-indicator"
        onClick={onHome}
        onPointerCancel={() => {
          homeStartYRef.current = null;
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          homeStartYRef.current = event.clientY;
        }}
        onPointerUp={finishHomeGesture}
        title={"홈으로"}
        type="button"
      >
        <span />
      </button>
    </div>
  );
}

export function SitePhoneFlow({
  renderAilockApp,
}: {
  renderAilockApp: (props: SiteAilockRenderProps) => ReactNode;
}) {
  const [surface, setSurface] = useState<SitePhoneSurface>("phoneHome");
  const [activeAppId, setActiveAppId] = useState<SitePhoneAppId | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [route, setRoute] = useState<SiteAilockRoute>("home");
  const [routeOverlayOpen, setRouteOverlayOpen] = useState(false);
  const [reasonSession, setReasonSession] = useState(0);
  const activeApp = activeAppId ? sitePhoneApps.find((app) => app.id === activeAppId) ?? null : null;

  const openApp = (app: SitePhoneApp) => {
    setActiveAppId(app.id);
    setRouteOverlayOpen(false);

    if (app.id === "ailock") {
      setSurface("ailock");
      return;
    }

    if (app.locked) {
      setReasonSession((value) => value + 1);
      setSurface("lockPrompt");
      return;
    }

    setSurface("externalApp");
  };

  const returnHome = () => {
    setActiveAppId(null);
    setRouteOverlayOpen(false);
    setSurface("phoneHome");
  };

  const resetFlow = () => {
    setActiveAppId(null);
    setOnboarded(false);
    setRoute("home");
    setRouteOverlayOpen(false);
    setReasonSession((value) => value + 1);
    setSurface("phoneHome");
  };

  const restartOnboarding = () => {
    setOnboarded(false);
    setRoute("home");
    setRouteOverlayOpen(false);
    setSurface("ailock");
  };

  const handleBack = () => {
    if (surface === "ailock") {
      if (routeOverlayOpen) {
        setRouteOverlayOpen(false);
        return;
      }

      if (onboarded && route !== "home") {
        setRoute("home");
        return;
      }
    }

    returnHome();
  };

  let phoneContent: ReactNode = <SitePhoneHomeMock activeAppId={activeAppId} onOpenApp={openApp} />;

  if (surface === "ailock") {
    phoneContent = renderAilockApp({
      onboarded,
      restartOnboarding,
      route,
      routeOverlayOpen,
      setOnboarded,
      setRoute,
      setRouteOverlayOpen,
    });
  } else if (surface === "externalApp" && activeApp) {
    phoneContent = <SiteExternalAppMock app={activeApp} onReturnHome={returnHome} />;
  } else if (surface === "lockPrompt" && activeApp) {
    phoneContent = (
      <div className="site-phone-lock">
        <SitePhoneHomeMock activeAppId={activeAppId} onOpenApp={openApp} />
        <div className="site-phone-lock-overlay">
          <ReasonComposer
            appName={activeApp.name}
            key={`${activeApp.id}-${reasonSession}`}
            onAllow={() => setSurface("externalApp")}
            onExit={returnHome}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="site-phone-flow">
      <PhoneFrame mode="screen">
        <SitePhoneGestureLayer onBack={handleBack} onHome={returnHome}>
          {phoneContent}
        </SitePhoneGestureLayer>
      </PhoneFrame>
      <SiteFlowPanel
        activeApp={activeApp}
        onboarded={onboarded}
        onOpenApp={openApp}
        onReset={resetFlow}
        onReturnHome={returnHome}
        route={route}
        surface={surface}
      />
    </div>
  );
}
