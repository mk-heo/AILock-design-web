import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AilockButton,
  AilockList,
  ContentSectionLabel,
  DailyUsageGraph,
  FloatingBottomNav,
  defaultDailyUsageData,
  defaultWeeklyUsageData,
  getUsageGraphTotalLabel,
  IconButton,
  Mascot,
  OnboardingPrompt,
  OnboardingProgress,
  PermissionCard,
  RowDivider,
  Section,
  ScreenSection,
  SegmentedControl,
  SpeechBubble,
  TimeWheelPicker,
  type TimeWheelValue,
  UsageBar,
  WeeklyUsageGraph,
} from "../components/ailock";
import {
  defaultLockTimer,
  recordUsageApps,
  type DemoUsageApp,
} from "../design/demoData";
import { permissionRows } from "../design/sampleData";
import { DesignIcon } from "../design/icons";
import { SitePhoneFlow, type SiteAilockRenderProps, type SiteAilockRoute } from "../site/SitePhoneFlow";

type AppRoute = SiteAilockRoute;
type LockableApp = DemoUsageApp;
type LockedApp = {
  app: LockableApp;
  durationSeconds: number;
  startedAt: number;
};
type LimitOverlay = "picker" | "timer" | null;

const onboardingLabels = ["Welcome", "개인정보", "권한", "완료"];
const HEADER_COLLAPSE_DISTANCE = 121;
const recordPeriodLabels = {
  hours: "하루",
  minutes: "주간",
} as const;
const onboardingPrompts = ["안녕, 만나서 반가워", "너의 이름은 뭐야?", "", "좋아, 준비됐어"] as const;

function getDefaultLockTimer(): TimeWheelValue {
  return { ...defaultLockTimer };
}

function getLockDurationSeconds(value: TimeWheelValue) {
  return (value.hours * 60 + value.minutes) * 60;
}

function createLockedApp(app: LockableApp, timer: TimeWheelValue, startedAt = Date.now()): LockedApp {
  return {
    app,
    durationSeconds: getLockDurationSeconds(timer),
    startedAt,
  };
}

function createInitialLockedApps() {
  const startedAt = Date.now();
  return [
    createLockedApp(recordUsageApps[0], { hours: 1, minutes: 22 }, startedAt),
    createLockedApp(recordUsageApps[1], { hours: 0, minutes: 55 }, startedAt),
    createLockedApp(recordUsageApps[2], { hours: 0, minutes: 38 }, startedAt),
  ];
}

function formatLockDuration(value: TimeWheelValue) {
  const totalMinutes = value.hours * 60 + value.minutes;
  if (totalMinutes <= 0) return "0분";
  if (value.hours <= 0) return `${value.minutes}분`;
  if (value.minutes <= 0) return `${value.hours}시간`;
  return `${value.hours}시간 ${value.minutes}분`;
}

function getRemainingLockSeconds(lockedApp: LockedApp, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - lockedApp.startedAt) / 1000));
  return Math.max(lockedApp.durationSeconds - elapsedSeconds, 0);
}

function formatRemainingLockTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분 ${remainingSeconds}초 남음`;
  if (minutes > 0) return `${minutes}분 ${remainingSeconds}초 남음`;
  return `${remainingSeconds}초 남음`;
}
function AppHeader({
  title,
  subtitle,
  trailing,
  onBack,
  hideBack = false,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
}) {
  return (
    <header className="app-header">
      <div className="app-header-bar">
        {hideBack ? (
          <span aria-hidden className="header-button-placeholder" />
        ) : (
          <IconButton direction="left" icon="arrowForward" label="Back" onClick={onBack} variant="header" />
        )}
        <h2>{title}</h2>
        <div className="app-header-trailing">{trailing ?? <span aria-hidden className="header-button-placeholder" />}</div>
      </div>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  );
}

function CollapsingAppScreen({
  title,
  subtitle,
  trailing,
  onBack,
  hideBack = false,
  mode = "top-level",
  bodyClassName,
  bottomAction,
  children,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  mode?: "top-level" | "detail";
  bodyClassName?: string;
  bottomAction?: ReactNode;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const topbarRef = useRef<HTMLDivElement>(null);
  const largeHeaderRef = useRef<HTMLDivElement>(null);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const isTopLevel = mode === "top-level";
  const isStatic = mode === "detail";
  const collapsedTitleOpacity = isStatic ? 1 : Math.min(1, Math.max(0, (clampedProgress - 0.18) / 0.58));
  const largeTitleOpacity = isStatic ? 0 : Math.max(0, 1 - clampedProgress * 1.18);
  const largeSubtitleOpacity = isStatic ? 0 : Math.max(0, 1 - clampedProgress * 1.9);
  const headerStyle = {
    "--header-divider-opacity": `${isStatic ? 1 : clampedProgress}`,
    "--collapsed-title-opacity": `${collapsedTitleOpacity}`,
    "--collapsed-title-y": `${isStatic ? 0 : (1 - collapsedTitleOpacity) * 6}px`,
    "--large-title-opacity": `${largeTitleOpacity}`,
    "--large-title-scale": `${isStatic ? 1 : 1 - clampedProgress * 0.18}`,
    "--large-title-y": isStatic ? "0px" : `${clampedProgress * -54}px`,
    "--large-subtitle-opacity": `${largeSubtitleOpacity}`,
    "--large-subtitle-y": `${isStatic ? 0 : (1 - largeSubtitleOpacity) * -12}px`,
  } as CSSProperties;
  const collapsedTitleStyle = {
    opacity: collapsedTitleOpacity,
    transform: `translateY(${isStatic ? 0 : (1 - collapsedTitleOpacity) * 6}px)`,
  } as CSSProperties;

  return (
    <div className={isStatic ? "app-route-screen detail-route-screen" : "app-route-screen"}>
      <div
        className={isStatic ? "app-detail-screen" : "header-scroll-demo app-collapsing-scroll"}
        onScroll={(event) => {
          if (!isStatic) {
            const measuredCollapseDistance =
              (largeHeaderRef.current?.offsetHeight ?? 0) - (topbarRef.current?.offsetHeight ?? 0);
            setProgress(Math.min(event.currentTarget.scrollTop / Math.max(measuredCollapseDistance, HEADER_COLLAPSE_DISTANCE), 1));
          }
        }}
        style={headerStyle}
      >
        <div className={`screen-header-topbar app-screen-header-topbar ${isTopLevel ? "top-level" : ""}`} ref={topbarRef}>
          {isTopLevel ? (
            <>
              <h2 className="screen-header-collapsed-title" style={collapsedTitleStyle}>{title}</h2>
              <div className="screen-header-trailing app-header-trailing">{trailing ?? <span aria-hidden className="header-button-placeholder" />}</div>
            </>
          ) : (
            <>
              {hideBack ? <span aria-hidden className="header-button-placeholder" /> : <IconButton direction="left" icon="arrowForward" label="Back" onClick={onBack} variant="header" />}
              <h2 className="screen-header-collapsed-title" style={collapsedTitleStyle}>{title}</h2>
              <div className="screen-header-trailing app-header-trailing">{trailing ?? <span aria-hidden className="header-button-placeholder" />}</div>
            </>
          )}
        </div>
        {!isStatic ? (
          <div className={`screen-header-large app-screen-header-large ${isTopLevel ? "top-level" : ""}`} ref={largeHeaderRef}>
            <div className="screen-header-copy">
              <h1 className="screen-header-large-title">{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>
        ) : null}
        <main className={`app-screen-body app-collapsing-body ${bodyClassName ?? ""}`}>{children}</main>
        {bottomAction ? <div className="app-bottom-action route-bottom-action">{bottomAction}</div> : null}
      </div>
    </div>
  );
}

function AppIconMark({ app }: { app: Pick<LockableApp, "color" | "letter"> }) {
  return (
    <span className="app-icon" style={{ "--app-icon-color": app.color } as CSSProperties}>
      <span>{app.letter}</span>
    </span>
  );
}

function ScreenListButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <button className="screen-list-button" onClick={onClick} type="button">
      <span className="screen-list-icon">{icon}</span>
      <span className="screen-list-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="row-trailing">
        <DesignIcon className="row-chevron" name="arrowForward" size={19} />
      </span>
    </button>
  );
}

function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("홍길동");
  const [permissionState, setPermissionState] = useState(() => permissionRows.map((row) => row.granted));
  const prompt = onboardingPrompts[step] ?? onboardingPrompts[0];
  const promptOnly = step === 0 || step === onboardingLabels.length - 1;
  const next = () => {
    if (step >= onboardingLabels.length - 1) {
      onDone();
      return;
    }
    setStep((value) => value + 1);
  };

  return (
    <div className="app-prototype-screen onboarding-screen">
      <header className="figma-onboarding-header">
        {step > 0 ? (
          <IconButton direction="left" icon="arrowForward" label="Back" onClick={() => setStep((value) => Math.max(0, value - 1))} variant="header" />
        ) : <span className="header-button-placeholder" />}
      </header>
      <OnboardingProgress step={step + 1} total={onboardingLabels.length} />
      <main className="app-screen-body onboarding-body">
        {step === 1 ? (
          <div className="onboarding-page-copy">
            <h1>이름 입력</h1>
            <p>당신의 이름이 궁금해요.</p>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="onboarding-page-copy">
            <h1>권한 설정</h1>
            <p>잠금과 기록을 위해 필요한 권한을 켜주세요.</p>
          </div>
        ) : null}
        {step === 3 ? <p className="onboarding-complete-copy">설정이 끝났어요. 이제 시작할 수 있어요.</p> : null}
        <div className="onboarding-content-slot">
          <div className={promptOnly ? "onboarding-flow prompt-only" : "onboarding-flow"}>
            {step !== 2 ? (
              <OnboardingPrompt
                layout={promptOnly ? "stack" : "row"}
                message={prompt}
                mood={step === onboardingLabels.length - 1 ? "success" : "idle"}
              />
            ) : null}

            {step === 1 ? (
              <div className="onboarding-form">
                <input aria-label="이름" className="figma-name-input" onChange={(event) => setName(event.target.value)} placeholder="이름을 입력해주세요" value={name} />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="onboarding-list-step">
                <AilockList>
                  {permissionRows.map((row, index) => (
                    <div key={row.title}>
                      <PermissionCard
                        granted={permissionState[index]}
                        onToggle={() =>
                          setPermissionState((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)))
                        }
                        row={row}
                      />
                      {index !== permissionRows.length - 1 ? <RowDivider /> : null}
                    </div>
                  ))}
                </AilockList>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <div className="app-bottom-action">
        <AilockButton onClick={next}>{step === onboardingLabels.length - 1 ? "시작하기" : "다음"}</AilockButton>
      </div>
    </div>
  );
}
function HomeScreen() {
  return (
    <main className="home-screen">
      <div className="home-symbol-stage">
        <SpeechBubble>{"오늘은 어떤 앱을 열어볼까?"}</SpeechBubble>
        <Mascot size="lg" />
      </div>
    </main>
  );
}
function RecordsScreen() {
  const [period, setPeriod] = useState<"hours" | "minutes">("hours");
  const isDaily = period === "hours";
  const graphData = isDaily ? defaultDailyUsageData : defaultWeeklyUsageData;
  const graphTotalLabel = getUsageGraphTotalLabel(graphData);
  return (
    <CollapsingAppScreen
      bodyClassName="records-body"
      hideBack
      subtitle={"하루, 주간을 선택하여 볼 수 있어요."}
      title={"기록"}
      trailing={<SegmentedControl labels={recordPeriodLabels} onChange={setPeriod} value={period} />}
    >
      <div className="records-date-switcher">
        <div className="icon-field-demo records-date-control">
          <IconButton direction="left" icon="arrowForward" label="Previous day" variant="field" />
          <strong>{isDaily ? "6월 20일" : "6월 20일 - 6월 27일"}</strong>
          <IconButton icon="arrowForward" label="Next day" variant="field" />
        </div>
      </div>
      <ScreenSection>
        <ContentSectionLabel
          title={isDaily ? "하루 그래프" : "일주일 그래프"}
          trailing={<span className="section-meta">{graphTotalLabel}</span>}
        />
        {isDaily ? <DailyUsageGraph data={graphData} /> : <WeeklyUsageGraph data={graphData} />}
      </ScreenSection>
      <ScreenSection>
        <ContentSectionLabel title={"앱 사용 기록"} />
        <AilockList>
          {recordUsageApps.slice(0, 3).map((app, index) => (
            <div key={app.name}>
              <UsageBar app={app} boost={!isDaily ? 0.08 : 0} />
              {index !== 2 ? <RowDivider /> : null}
            </div>
          ))}
        </AilockList>
      </ScreenSection>
    </CollapsingAppScreen>
  );
}
function LockedAppRow({ lockedApp, now }: { lockedApp: LockedApp; now: number }) {
  const remainingSeconds = getRemainingLockSeconds(lockedApp, now);
  const progress = lockedApp.durationSeconds > 0 ? remainingSeconds / lockedApp.durationSeconds : 0;
  const lockUsageApp = {
    color: lockedApp.app.color,
    letter: lockedApp.app.letter,
    name: lockedApp.app.name,
    progress,
    time: formatRemainingLockTime(remainingSeconds),
  };

  return <UsageBar app={lockUsageApp} />;
}

function LockPickerAppRow({
  app,
  disabled,
  expanded,
  onClick,
}: {
  app: LockableApp;
  disabled?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-expanded={disabled ? undefined : expanded}
      className={`lock-picker-row ${disabled ? "locked" : ""} ${expanded ? "expanded" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <AppIconMark app={app} />
      <span className="app-list-copy">
        <strong>{app.name}</strong>
        <small>{disabled ? "이미 잠금 앱" : `오늘 ${app.time} 사용`}</small>
      </span>
      <span className="row-trailing">
        {disabled ? null : <DesignIcon className="row-chevron" name="arrowForward" size={19} />}
      </span>
    </button>
  );
}
function LimitsScreen({ onOverlayChange }: { onOverlayChange?: (open: boolean) => void }) {
  const [overlay, setOverlay] = useState<LimitOverlay>(null);
  const [lockedApps, setLockedApps] = useState<LockedApp[]>(() => createInitialLockedApps());
  const [selectedPickerAppName, setSelectedPickerAppName] = useState<string | null>(null);
  const [lockTimerTime, setLockTimerTime] = useState<TimeWheelValue>(() => getDefaultLockTimer());
  const [now, setNow] = useState(() => Date.now());
  const selectedPickerApp = useMemo(
    () => recordUsageApps.find((app) => app.name === selectedPickerAppName) ?? null,
    [selectedPickerAppName],
  );
  const selectedLockDuration = formatLockDuration(lockTimerTime);
  const canStartLock = selectedPickerApp !== null && getLockDurationSeconds(lockTimerTime) > 0;

  useEffect(() => {
    if (lockedApps.length === 0) return undefined;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedApps.length]);

  const closeOverlay = () => {
    setOverlay(null);
    setSelectedPickerAppName(null);
    onOverlayChange?.(false);
  };

  const openPicker = () => {
    setSelectedPickerAppName(null);
    setLockTimerTime(getDefaultLockTimer());
    setOverlay("picker");
    onOverlayChange?.(true);
  };

  const selectPickerApp = (app: LockableApp) => {
    setSelectedPickerAppName(app.name);
    setLockTimerTime(getDefaultLockTimer());
    setOverlay("timer");
  };

  const startLock = () => {
    if (!selectedPickerApp || !canStartLock) return;
    setLockedApps((current) =>
      current.some((item) => item.app.name === selectedPickerApp.name)
        ? current
        : [...current, createLockedApp(selectedPickerApp, lockTimerTime)],
    );
    setNow(Date.now());
    closeOverlay();
  };

  return (
    <div className="app-route-screen">
      <CollapsingAppScreen
        bodyClassName="limits-body"
        hideBack
        subtitle={"앱 사용 시간을 정하여 잠금 흐름을 관리해요."}
        title={"제한"}
        trailing={<IconButton icon="plus" label="Add app" onClick={openPicker} variant="header" />}
      >
        {lockedApps.length > 0 ? (
          <section className="limit-section">
            <ContentSectionLabel title={"활성 제한"} />
            <AilockList>
              {lockedApps.map((lockedApp, index) => (
                <div key={lockedApp.app.name}>
                  <LockedAppRow lockedApp={lockedApp} now={now} />
                  {index !== lockedApps.length - 1 ? <RowDivider /> : null}
                </div>
              ))}
            </AilockList>
          </section>
        ) : null}

        {lockedApps.length === 0 ? (
          <div className="empty-limit-state">
            <Mascot />
            <p>{"아직 잠금 앱이 없어. 오른쪽 위 + 버튼으로 앱을 추가해."}</p>
          </div>
        ) : null}
      </CollapsingAppScreen>

      {overlay === "picker" ? (
        <div className="screen-overlay-panel">
          <CollapsingAppScreen
            bodyClassName="lock-picker-body"
            mode="detail"
            onBack={closeOverlay}
            title={"앱 선택"}
          >
            <ScreenSection>
              <label className="figma-app-search">
                <DesignIcon name="search" size={19} />
                <input aria-label="앱 이름 검색" placeholder="앱 이름 검색" />
              </label>
              <AilockList>
                {recordUsageApps.slice(0, 3).map((app, index) => {
                  return (
                    <div className="lock-picker-item" key={app.name}>
                      <LockPickerAppRow app={app} onClick={() => selectPickerApp(app)} />
                      {index !== 2 ? <RowDivider /> : null}
                    </div>
                  );
                })}
              </AilockList>
            </ScreenSection>
          </CollapsingAppScreen>
        </div>
      ) : null}

      {overlay === "timer" && selectedPickerApp ? (
        <div className="screen-overlay-panel">
          <CollapsingAppScreen
            bottomAction={<AilockButton onClick={startLock}>잠금 시작</AilockButton>}
            bodyClassName="figma-timer-body"
            mode="detail"
            onBack={() => setOverlay("picker")}
            title={selectedPickerApp.name}
          >
            <ScreenSection>
              <ContentSectionLabel title="사용 기록" />
              <WeeklyUsageGraph data={defaultWeeklyUsageData} />
            </ScreenSection>
            <ScreenSection>
              <ContentSectionLabel title="잠금 타이머" trailing={<span className="section-meta">{selectedLockDuration}</span>} />
              <TimeWheelPicker onChange={setLockTimerTime} value={lockTimerTime} />
            </ScreenSection>
          </CollapsingAppScreen>
        </div>
      ) : null}
    </div>
  );
}
function SettingsScreen({ onRestartOnboarding }: { onRestartOnboarding: () => void }) {
  return (
    <CollapsingAppScreen
      bodyClassName="settings-body"
      hideBack
      subtitle={"프로필, 권한, 온보딩을 다시 확인해요."}
      title={"설정"}
      trailing={<IconButton icon="heart" label="Like" variant="header" />}
    >
      <AilockList>
        <ScreenListButton icon={<DesignIcon name="settings" size={21} />} subtitle={"이름을 수정해요."} title={"프로필 편집"} />
        <RowDivider />
        <ScreenListButton icon={<DesignIcon name="accessibility" size={21} />} subtitle={"사용 기록, 접근성, 오버레이 권한을 확인해요."} title={"권한 관리"} />
        <RowDivider />
        <ScreenListButton icon={<DesignIcon name="history" size={21} />} onClick={onRestartOnboarding} subtitle={"처음 안내 흐름을 다시 볼 수 있어요."} title={"온보딩 다시 보기"} />
      </AilockList>
    </CollapsingAppScreen>
  );
}
function AilockPhoneApp({
  onRestartOnboarding,
  onRouteChange,
  onRouteOverlayChange,
  route,
  routeOverlayOpen,
}: {
  onRestartOnboarding: () => void;
  onRouteChange: (route: AppRoute) => void;
  onRouteOverlayChange: (open: boolean) => void;
  route: AppRoute;
  routeOverlayOpen: boolean;
}) {
  return (
    <div className={`app-prototype-screen ${routeOverlayOpen ? "route-overlay-open" : ""}`}>
      <div className="app-route-host">
        {route === "home" ? <HomeScreen /> : null}
        {route === "records" ? <RecordsScreen /> : null}
        {route === "restrictions" ? <LimitsScreen onOverlayChange={onRouteOverlayChange} /> : null}
        {route === "settings" ? <SettingsScreen onRestartOnboarding={onRestartOnboarding} /> : null}
      </div>
      <div className="prototype-bottom-nav">
        <FloatingBottomNav
          currentRoute={route}
          onRouteChange={(nextRoute) => {
            onRouteOverlayChange(false);
            onRouteChange(nextRoute);
          }}
        />
      </div>
    </div>
  );
}

function renderAilockPhoneApp({
  onboarded,
  restartOnboarding,
  route,
  routeOverlayOpen,
  setOnboarded,
  setRoute,
  setRouteOverlayOpen,
}: SiteAilockRenderProps) {
  if (!onboarded) {
    return (
      <OnboardingScreen
        onDone={() => {
          setOnboarded(true);
          setRoute("home");
        }}
      />
    );
  }

  return (
    <AilockPhoneApp
      onRestartOnboarding={restartOnboarding}
      onRouteChange={setRoute}
      onRouteOverlayChange={setRouteOverlayOpen}
      route={route}
      routeOverlayOpen={routeOverlayOpen}
    />
  );
}
export function ScreensPage() {
  return (
    <div className="component-layout">
      <div className="component-main component-catalog">
        <Section
          title="Phone Flow Prototype"
          note={"휴대폰 홈과 AILock 앱 흐름을 웹사이트용 프로토타입 컴포넌트로 분리한 화면"}
        >
          <SitePhoneFlow renderAilockApp={renderAilockPhoneApp} />
        </Section>
      </div>
    </div>
  );
}
