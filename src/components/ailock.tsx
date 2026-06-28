import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { BrandMark, DesignIcon, type IconName } from "../design/icons";
import { apps, permissionRows } from "../design/sampleData";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AppSample = (typeof apps)[number];
type UsageApp = { color: string; letter: string; name: string; progress: number; time: string };
type PermissionSample = (typeof permissionRows)[number];
const HEADER_COLLAPSE_DISTANCE = 121;

const longHeaderDemoApps = Array.from({ length: 14 }, (_, index) => apps[index % apps.length]);
const defaultRecordChartValues = [34, 58, 44, 76, 52, 68, 39];
const defaultSegmentedLabels = {
  hours: "Hours",
  minutes: "Min",
} as const;

export type UsageGraphDatum = {
  label: string;
  minutes: number;
  shortLabel?: string;
};

const minutesPerHour = 60;
const secondsPerMinute = 60;
export const defaultDailyUsageData: UsageGraphDatum[] = [
  0, 1, 0, 0, 2, 6, 12, 18, 8, 4, 10, 16, 23, 35, 28, 14, 9, 18, 42, 56, 31, 12, 5, 2,
].map((minutes, hour) => ({
  label: `${hour}:00`,
  minutes,
}));
export const defaultWeeklyUsageData: UsageGraphDatum[] = [
  { label: "월요일", shortLabel: "월", minutes: 42 },
  { label: "화요일", shortLabel: "화", minutes: 66 },
  { label: "수요일", shortLabel: "수", minutes: 93 },
  { label: "목요일", shortLabel: "목", minutes: 118 },
  { label: "금요일", shortLabel: "금", minutes: 147 },
  { label: "토요일", shortLabel: "토", minutes: 84 },
  { label: "일요일", shortLabel: "일", minutes: 58 },
];
const dailyUsageAxisLabels = ["6", "12", "18"] as const;
const hangulStartCode = 0xac00;
const hangulEndCode = 0xd7a3;
const hangulJungCount = 21;
const hangulJongCount = 28;
const hangulTypingAnimationVersion = "ime-v4-snap";
const hangulTypingInitialDelayMs = 0;
const hangulTypingFrameMs = 28;
const hangulChoseong = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

function composeHangulSyllable(choseongIndex: number, jungseongIndex: number, jongseongIndex = 0) {
  return String.fromCharCode(hangulStartCode + (choseongIndex * hangulJungCount + jungseongIndex) * hangulJongCount + jongseongIndex);
}

function getHangulTypingFrames(text: string) {
  const frames: string[] = [];
  let committed = "";

  for (const character of Array.from(text)) {
    const code = character.charCodeAt(0);
    if (code >= hangulStartCode && code <= hangulEndCode) {
      const syllableIndex = code - hangulStartCode;
      const choseongIndex = Math.floor(syllableIndex / (hangulJungCount * hangulJongCount));
      const jungseongIndex = Math.floor((syllableIndex % (hangulJungCount * hangulJongCount)) / hangulJongCount);
      const jongseongIndex = syllableIndex % hangulJongCount;

      frames.push(committed + hangulChoseong[choseongIndex]);
      frames.push(committed + composeHangulSyllable(choseongIndex, jungseongIndex));
      if (jongseongIndex > 0) frames.push(committed + character);
      committed += character;
      continue;
    }

    committed += character;
    frames.push(committed);
  }

  return frames.length > 0 ? frames : [""];
}

function getWeeklyGraphMaxMinutes(data: UsageGraphDatum[]) {
  const maxMinutes = data.reduce((max, item) => Math.max(max, item.minutes), 0);
  const roundedHours = Math.ceil(maxMinutes / minutesPerHour);

  if (roundedHours <= 1) return minutesPerHour;

  return (roundedHours % 2 === 0 ? roundedHours : roundedHours + 1) * minutesPerHour;
}

function formatUsageDuration(minutes: number) {
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < minutesPerHour) return `${roundedMinutes}분`;

  const hours = Math.floor(roundedMinutes / minutesPerHour);
  const remainingMinutes = roundedMinutes % minutesPerHour;
  if (remainingMinutes === 0) return `${hours}시간`;

  return `${hours}시간 ${remainingMinutes}분`;
}

export function getUsageGraphTotalMinutes(data: UsageGraphDatum[]) {
  return data.reduce((total, item) => total + item.minutes, 0);
}

export function formatUsageTotalDuration(minutes: number) {
  const totalSeconds = Math.max(0, Math.round(minutes * secondsPerMinute));
  const hours = Math.floor(totalSeconds / (minutesPerHour * secondsPerMinute));
  const remainingSeconds = totalSeconds % (minutesPerHour * secondsPerMinute);
  const minutePart = Math.floor(remainingSeconds / secondsPerMinute);
  const secondPart = remainingSeconds % secondsPerMinute;

  return `${hours}시간 ${minutePart}분 ${secondPart}초`;
}

export function getUsageGraphTotalLabel(data: UsageGraphDatum[]) {
  return `총 ${formatUsageTotalDuration(getUsageGraphTotalMinutes(data))}`;
}

export function Section({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("lab-section", className)}>
      <div className="section-heading">
        <h2>{title}</h2>
        {note ? <p>{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StateMatrix({ children }: { children: ReactNode }) {
  return <div className="state-matrix">{children}</div>;
}

export function StateTile({ children }: { title: string; note?: string; interactive?: boolean; children: ReactNode }) {
  return (
    <div className="state-tile">
      <div className="state-tile-body">{children}</div>
    </div>
  );
}

export function SpecTable({
  rows,
}: {
  rows: Array<{ label: string; value: string; detail?: string }>;
}) {
  return (
    <div className="spec-table">
      {rows.map((row) => (
        <div className="spec-row" key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          {row.detail ? <em>{row.detail}</em> : null}
        </div>
      ))}
    </div>
  );
}

export function PhoneFrame({
  children,
  label,
  mode = "content",
}: {
  children: ReactNode;
  label?: string;
  mode?: "content" | "screen";
}) {
  return (
    <div className="phone-wrap">
      {label ? <div className="phone-label">{label}</div> : null}
      <div className={cx("phone-frame", mode === "screen" && "screen-frame")}>
        {mode === "screen" ? <DeviceStatusBar /> : null}
        <div className={cx("phone-content", mode === "screen" && "screen")}>{children}</div>
      </div>
    </div>
  );
}

function DeviceStatusBar() {
  return (
    <div className="device-status-bar" aria-hidden="true">
      <div className="device-status-ios">
        <span className="device-status-time">9:41</span>
        <span className="device-island" />
        <span className="device-status-icons">
          <DesignIcon className="device-status-icon cellular" name="signal" size={16} />
          <DesignIcon className="device-status-icon wifi" name="wifi" size={16} />
          <DesignIcon className="device-status-icon battery" name="battery" size={24} />
        </span>
      </div>
      <div className="device-status-android">
        <span className="device-status-time">9:41</span>
        <span className="device-status-icons">
          <DesignIcon className="device-status-icon cellular" name="signal" size={17} />
          <DesignIcon className="device-status-icon wifi" name="wifi" size={17} />
          <DesignIcon className="device-status-icon battery" name="battery" size={21} />
        </span>
      </div>
    </div>
  );
}

export function AilockButton({
  children,
  variant = "primary",
  disabled = false,
  icon,
  full = true,
  placement = "default",
  size = "default",
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  icon?: ReactNode;
  full?: boolean;
  placement?: "default" | "bottom";
  size?: "default" | "small";
  onClick?: () => void;
}) {
  return (
    <button
      className={cx("ailock-button", variant, size === "small" && "small", full && "full", placement === "bottom" && "bottom-cta-button")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon ? <span className="button-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export function AilockCard({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={cx("ailock-card", compact && "compact")}>{children}</div>;
}

export function AilockList({ children }: { children: ReactNode }) {
  return <div className="ailock-list">{children}</div>;
}

export function AilockAccordion({
  children,
  className,
  expanded,
  header,
}: {
  children?: ReactNode;
  className?: string;
  expanded?: boolean;
  header: ReactNode;
}) {
  return (
    <div className={cx("ailock-accordion", expanded && "expanded", className)}>
      <div className="ailock-accordion-header">{header}</div>
      {children ? (
        <div aria-hidden={!expanded} className="ailock-accordion-panel">
          <div className="ailock-accordion-panel-inner">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function RowDivider() {
  return <div className="row-divider" />;
}

export function SectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="section-title">
      <span>{title}</span>
      {trailing ? <div>{trailing}</div> : null}
    </div>
  );
}

export function ContentSectionLabel({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="content-section-label">
      <span>{title}</span>
      {trailing ? <div className="content-section-label-trailing">{trailing}</div> : null}
    </div>
  );
}

export function ScreenSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("screen-section", className)}>{children}</section>;
}

export function AilockTextField({
  label = "App name search",
  initialValue = "Instagram",
  icon = true,
  showLabel = true,
  onValueChange,
}: {
  label?: string;
  initialValue?: string;
  icon?: boolean;
  showLabel?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const clearValue = () => {
    setValue("");
    onValueChange?.("");
  };

  return (
    <label className="ailock-field">
      {showLabel ? <span>{label}</span> : null}
      <div className={cx("field-control", icon && "has-leading-icon", value.trim() && "state-ready", value.trim() && "has-clear")}>
        {icon ? (
          <span aria-hidden className="field-leading-icon">
            <DesignIcon name="search" size={20} />
          </span>
        ) : null}
        <input
          onChange={(event) => {
            setValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
          placeholder={label}
          value={value}
        />
        {icon && value.trim() ? (
          <button
            aria-label="Clear search"
            className="field-action-button"
            onClick={clearValue}
            type="button"
          >
            <DesignIcon name="close" size={20} />
          </button>
        ) : null}
      </div>
    </label>
  );
}

export function SegmentedControl({
  value,
  onChange,
  labels = defaultSegmentedLabels,
}: {
  value?: "hours" | "minutes";
  onChange?: (value: "hours" | "minutes") => void;
  labels?: {
    hours: string;
    minutes: string;
  };
}) {
  const [internalValue, setInternalValue] = useState<"hours" | "minutes">(value ?? "hours");
  const selected = value ?? internalValue;
  const select = (next: "hours" | "minutes") => {
    setInternalValue(next);
    onChange?.(next);
  };
  const activeIndex = selected === "minutes" ? 1 : 0;

  return (
    <div
      aria-label="Timer granularity"
      className="segmented-control"
      role="group"
      style={{ "--active-index": activeIndex } as CSSProperties}
    >
      <span aria-hidden className="segmented-control-indicator" />
      <button className={selected === "hours" ? "active" : undefined} onClick={() => select("hours")} type="button">
        {labels.hours}
      </button>
      <button className={selected === "minutes" ? "active" : undefined} onClick={() => select("minutes")} type="button">
        {labels.minutes}
      </button>
    </div>
  );
}

export type TimeWheelValue = {
  hours: number;
  minutes: number;
};

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function wrapTimePart(value: number, min: number, max: number, step: number) {
  const count = Math.floor((max - min) / step) + 1;
  const index = Math.round((value - min) / step);
  const wrappedIndex = ((index % count) + count) % count;
  return min + wrappedIndex * step;
}

const TIME_WHEEL_ITEM_HEIGHT = 32;
const TIME_WHEEL_ITEM_GAP = 12;
const TIME_WHEEL_ITEM_PITCH = TIME_WHEEL_ITEM_HEIGHT + TIME_WHEEL_ITEM_GAP;
const TIME_WHEEL_VIEWPORT_HEIGHT = 144;
const TIME_WHEEL_VISIBLE_RADIUS = 4;
const TIME_WHEEL_OFFSETS = Array.from({ length: TIME_WHEEL_VISIBLE_RADIUS * 2 + 1 }, (_, index) => {
  return index - TIME_WHEEL_VISIBLE_RADIUS;
});
const TIME_WHEEL_BASE_OFFSET =
  TIME_WHEEL_VIEWPORT_HEIGHT / 2 - (TIME_WHEEL_VISIBLE_RADIUS * TIME_WHEEL_ITEM_PITCH + TIME_WHEEL_ITEM_HEIGHT / 2);

function TimeWheelColumn({
  label,
  max,
  min = 0,
  onSelect,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min?: number;
  onSelect: (value: number) => void;
  step?: number;
  value: number;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const valueRef = useRef(value);
  const wheelRemainderRef = useRef(0);
  const applyScrollDeltaRef = useRef<(deltaY: number) => void>(() => undefined);
  const dragStateRef = useRef<{ lastY: number; pointerId: number } | null>(null);
  const mouseCleanupRef = useRef<(() => void) | undefined>(undefined);
  const lastPointerDownRef = useRef(0);
  const suppressClickRef = useRef(false);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const [motionOffset, setMotionOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
      }
      mouseCleanupRef.current?.();
    };
  }, []);

  const settleWheel = () => {
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
    }

    settleTimerRef.current = window.setTimeout(() => {
      wheelRemainderRef.current = 0;
      setMotionOffset(0);
    }, 140);
  };

  const changeBy = (direction: number) => {
    const nextValue = wrapTimePart(valueRef.current + direction * step, min, max, step);
    valueRef.current = nextValue;
    onSelectRef.current(nextValue);
  };

  const applyScrollDelta = (deltaY: number) => {
    if (Math.abs(deltaY) < 1) return;

    wheelRemainderRef.current += deltaY;
    const directionSteps = Math.trunc(wheelRemainderRef.current / TIME_WHEEL_ITEM_PITCH);

    if (directionSteps !== 0) {
      wheelRemainderRef.current -= directionSteps * TIME_WHEEL_ITEM_PITCH;
      changeBy(directionSteps);
    }

    setMotionOffset(-wheelRemainderRef.current);
    settleWheel();
  };
  applyScrollDeltaRef.current = applyScrollDelta;

  useEffect(() => {
    const element = columnRef.current;
    if (!element) return undefined;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyScrollDeltaRef.current(event.deltaY);
    };

    element.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleNativeWheel);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    lastPointerDownRef.current = Date.now();
    dragStateRef.current = { lastY: event.clientY, pointerId: event.pointerId };
    suppressClickRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaY = dragState.lastY - event.clientY;
    dragState.lastY = event.clientY;

    if (Math.abs(deltaY) > 0) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = true;
      applyScrollDelta(deltaY);
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (dragState?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
    settleWheel();
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (Date.now() - lastPointerDownRef.current < 500) return;

    let lastY = event.clientY;
    mouseCleanupRef.current?.();
    suppressClickRef.current = false;
    setIsDragging(true);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaY = lastY - moveEvent.clientY;
      lastY = moveEvent.clientY;

      if (Math.abs(deltaY) > 0) {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        suppressClickRef.current = true;
        applyScrollDelta(deltaY);
      }
    };

    const handleMouseUp = () => {
      mouseCleanupRef.current?.();
      mouseCleanupRef.current = undefined;
      setIsDragging(false);
      settleWheel();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    mouseCleanupRef.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
  };

  const values = TIME_WHEEL_OFFSETS.map((offset) => ({
    offset,
    value: wrapTimePart(value + offset * step, min, max, step),
  }));

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      changeBy(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      changeBy(-1);
    }
  };

  return (
    <div
      aria-label={label}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={value}
      className={cx("time-wheel-column", isDragging && "is-dragging")}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={columnRef}
      role="spinbutton"
      style={
        {
          "--wheel-base-offset": `${TIME_WHEEL_BASE_OFFSET}px`,
          "--wheel-offset": `${motionOffset}px`,
        } as CSSProperties
      }
      tabIndex={0}
    >
      <div className="time-wheel-stack">
        {values.map((item) => (
          <button
            className={cx(
              "time-wheel-item",
              item.offset === 0 && "active",
              Math.abs(item.offset) === 1 && "near",
              Math.abs(item.offset) === 2 && "far",
              Math.abs(item.offset) > 2 && "edge",
            )}
            aria-hidden={item.offset !== 0}
            key={`${label}-${item.offset}-${item.value}`}
            onClick={() => {
              if (suppressClickRef.current) return;
              wheelRemainderRef.current = 0;
              setMotionOffset(0);
              valueRef.current = item.value;
              onSelectRef.current(item.value);
            }}
            tabIndex={-1}
            type="button"
          >
            {padTimePart(item.value)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimeWheelPicker({
  hourMax = 12,
  minuteStep = 1,
  onChange,
  value,
}: {
  hourMax?: number;
  minuteStep?: number;
  onChange?: (value: TimeWheelValue) => void;
  value?: TimeWheelValue;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState<TimeWheelValue>(value ?? { hours: 2, minutes: 0 });
  const selected = value ?? internalValue;
  const select = (nextValue: TimeWheelValue) => {
    setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  useEffect(() => {
    const element = pickerRef.current;
    if (!element) return undefined;

    const blockOuterWheel = (event: globalThis.WheelEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".time-wheel-column")) return;

      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener("wheel", blockOuterWheel, { passive: false });
    return () => element.removeEventListener("wheel", blockOuterWheel);
  }, []);

  return (
    <div className="time-wheel-picker" ref={pickerRef}>
      <div className="time-wheel-label-row" aria-hidden>
        <span>{"시간"}</span>
        <span />
        <span>{"분"}</span>
      </div>
      <div className="time-wheel-body">
        <TimeWheelColumn
          label={"시간"}
          max={hourMax}
          onSelect={(hours) => select({ ...selected, hours })}
          value={selected.hours}
        />
        <span aria-hidden className="time-wheel-separator">:</span>
        <TimeWheelColumn
          label={"분"}
          max={60 - minuteStep}
          onSelect={(minutes) => select({ ...selected, minutes })}
          step={minuteStep}
          value={selected.minutes}
        />
      </div>
      <div aria-hidden className="time-wheel-bottom-spacer" />
    </div>
  );
}

function TimeWheelPickerPlayground() {
  const [value, setValue] = useState<TimeWheelValue>({ hours: 2, minutes: 0 });
  return (
    <div className="primitive-demo-stack time-wheel-demo-stack">
      <TimeWheelPicker onChange={setValue} value={value} />
      <p className="primitive-state-text">
        {padTimePart(value.hours)}:{padTimePart(value.minutes)}
      </p>
    </div>
  );
}

export function TimeWheelPickerStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <TimeWheelPickerPlayground />
      </StateTile>
      <StateTile title="Daily limit">
        <TimeWheelPicker value={{ hours: 2, minutes: 0 }} />
      </StateTile>
      <StateTile title="Lock timer">
        <TimeWheelPicker value={{ hours: 0, minutes: 25 }} />
      </StateTile>
    </StateMatrix>
  );
}

function AppIcon({ letter, color }: { letter: string; color: string }) {
  return (
    <span className="app-icon" style={{ "--app-icon-color": color } as React.CSSProperties}>
      <span>{letter}</span>
    </span>
  );
}

export function AppListItem({
  app,
  selected,
  selectedLabel = "Daily limit 2h",
  unselectedLabel = "Not configured",
  disabled = false,
  highlightSelected = false,
  onClick,
  showSelectionCheck = true,
}: {
  app: AppSample;
  selected?: boolean;
  selectedLabel?: string;
  unselectedLabel?: string;
  disabled?: boolean;
  highlightSelected?: boolean;
  onClick?: () => void;
  showSelectionCheck?: boolean;
}) {
  const isSelected = selected ?? app.selected;
  return (
    <button
      className={cx("app-list-item", isSelected && "selected", isSelected && highlightSelected && "highlight-selected")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <AppIcon color={app.color} letter={app.letter} />
      <span className="app-list-copy">
        <strong>{app.name}</strong>
        <small className={!isSelected ? "warning" : undefined}>
          {isSelected ? selectedLabel : unselectedLabel}
        </small>
      </span>
      <span className="row-trailing">
        {isSelected && showSelectionCheck ? <DesignIcon className="check-icon" name="check" size={22} /> : null}
      </span>
    </button>
  );
}

export function AppListGroup({
  query = "",
  onSelectionChange,
}: {
  query?: string;
  onSelectionChange?: (count: number) => void;
}) {
  const [selectedNames, setSelectedNames] = useState<Set<string>>(
    () => new Set(apps.filter((app) => app.selected).map((app) => app.name)),
  );
  const visibleApps = useMemo(
    () => apps.filter((app) => app.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );

  const toggle = (name: string) => {
    setSelectedNames((previous) => {
      const next = new Set(previous);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      onSelectionChange?.(next.size);
      return next;
    });
  };

  return (
    <AilockList>
      {visibleApps.length === 0 ? (
        <div className="empty-row">No apps found.</div>
      ) : (
        visibleApps.map((app, index) => (
          <div key={app.name}>
            <AppListItem app={app} onClick={() => toggle(app.name)} selected={selectedNames.has(app.name)} />
            {index !== visibleApps.length - 1 ? <RowDivider /> : null}
          </div>
        ))
      )}
    </AilockList>
  );
}

export function UsageBar({ app = apps[0], boost = 0 }: { app?: UsageApp; boost?: number }) {
  const progress = Math.min(app.progress + boost, 1);
  return (
    <div className="usage-row">
      <AppIcon color={app.color} letter={app.letter} />
      <div className="usage-body">
        <div className="usage-topline">
          <strong>{app.name}</strong>
          <span>{app.time}</span>
        </div>
        <UsageProgress value={progress} />
      </div>
    </div>
  );
}

export function UsageProgress({ value }: { value: number }) {
  const progress = Math.min(Math.max(value, 0), 1);
  return (
    <div className="progress-track" style={{ "--progress-value": `${progress * 100}%` } as CSSProperties}>
      <div className="progress-fill" />
    </div>
  );
}

function UsageTimeGraph({
  compact = false,
  data,
  label,
  variant,
}: {
  compact?: boolean;
  data: UsageGraphDatum[];
  label: string;
  variant: "daily" | "weekly";
}) {
  const maxMinutes = variant === "daily" ? minutesPerHour : getWeeklyGraphMaxMinutes(data);
  const halfMinutes = maxMinutes / 2;
  const axisLabels = variant === "daily" ? dailyUsageAxisLabels : data.map((item) => item.shortLabel ?? item.label);
  const accessibleValues = data.map((item) => `${item.label} ${formatUsageDuration(item.minutes)}`).join(", ");
  const totalLabel = getUsageGraphTotalLabel(data);

  return (
    <figure
      aria-label={`${label}. ${totalLabel}. ${accessibleValues}. max ${formatUsageDuration(maxMinutes)}, midpoint ${formatUsageDuration(halfMinutes)}.`}
      className={cx("usage-time-graph", variant, compact && "compact")}
    >
      <div className="usage-time-graph-canvas">
        <div className="usage-time-plot" style={{ "--usage-graph-bar-count": data.length } as CSSProperties}>
          <span aria-hidden className="usage-time-grid-line top" />
          <span aria-hidden className="usage-time-grid-line half" />
          <div className="usage-time-bars">
            {data.map((item, index) => {
              const percent = Math.min(Math.max(item.minutes / maxMinutes, 0), 1) * 100;
              return (
                <span
                  aria-hidden="true"
                  className="usage-time-bar"
                  key={`${item.label}-${index}`}
                  style={
                    {
                      "--chart-delay": `${index * 34}ms`,
                      "--usage-graph-bar-value": `${percent}%`,
                    } as CSSProperties
                  }
                  title={`${item.label} ${formatUsageDuration(item.minutes)}`}
                >
                  <span />
                </span>
              );
            })}
          </div>
          <div aria-hidden className="usage-time-x-axis">
            {axisLabels.map((axisLabel) => (
              <span key={axisLabel}>{axisLabel}</span>
            ))}
          </div>
        </div>
        <div aria-hidden className="usage-time-y-axis">
          <span className="usage-time-y-max">{formatUsageDuration(maxMinutes)}</span>
          <span className="usage-time-y-half">{formatUsageDuration(halfMinutes)}</span>
        </div>
      </div>
    </figure>
  );
}

export function DailyUsageGraph({
  compact = false,
  data = defaultDailyUsageData,
  label = "하루 사용 그래프",
}: {
  compact?: boolean;
  data?: UsageGraphDatum[];
  label?: string;
}) {
  return <UsageTimeGraph compact={compact} data={data} label={label} variant="daily" />;
}

export function WeeklyUsageGraph({
  compact = false,
  data = defaultWeeklyUsageData,
  label = "일주일 사용 그래프",
}: {
  compact?: boolean;
  data?: UsageGraphDatum[];
  label?: string;
}) {
  return <UsageTimeGraph compact={compact} data={data} label={label} variant="weekly" />;
}

export function RecordsChart({
  values = defaultRecordChartValues,
  compact = false,
  label = "Usage chart",
}: {
  values?: number[];
  compact?: boolean;
  label?: string;
}) {
  return (
    <div aria-label={label} className={cx("records-chart", compact && "compact")}>
      {values.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={
            {
              "--chart-delay": `${index * 42}ms`,
              "--chart-value": `${Math.min(Math.max(height, 0), 100)}%`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function UsageList() {
  const [boost, setBoost] = useState(0);
  return (
    <div className="stack">
      <AilockList>
        {apps.map((app, index) => (
          <div key={app.name}>
            <UsageBar app={app} boost={boost} />
            {index !== apps.length - 1 ? <RowDivider /> : null}
          </div>
        ))}
      </AilockList>
      <AilockButton variant="secondary" onClick={() => setBoost((value) => (value >= 0.24 ? 0 : value + 0.08))}>
        Simulate usage
      </AilockButton>
    </div>
  );
}

export function PermissionCard({
  row,
  granted,
  onToggle,
}: {
  row: PermissionSample;
  granted: boolean;
  onToggle: () => void;
}) {
  return (
    <button className={cx("permission-card", granted && "ready")} onClick={onToggle} type="button">
      <span className={cx("permission-icon", granted ? "granted" : "missing")}>
        <DesignIcon name={row.icon as IconName} size={22} />
      </span>
      <span className="permission-copy">
        <strong>{row.title}</strong>
        <small>{row.description}</small>
      </span>
      {!granted ? (
        <span className="row-trailing">
          <DesignIcon className="row-chevron" name="arrowForward" size={19} />
        </span>
      ) : null}
    </button>
  );
}

export function PermissionCardGroup() {
  const [grantedTitles, setGrantedTitles] = useState<Set<string>>(
    () => new Set(permissionRows.filter((row) => row.granted).map((row) => row.title)),
  );
  const toggle = (title: string) => {
    setGrantedTitles((previous) => {
      const next = new Set(previous);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <AilockList>
      {permissionRows.map((row, index) => (
        <div key={row.title}>
          <PermissionCard granted={grantedTitles.has(row.title)} onToggle={() => toggle(row.title)} row={row} />
          {index !== permissionRows.length - 1 ? <RowDivider /> : null}
        </div>
      ))}
    </AilockList>
  );
}

function ButtonScreenExamples() {
  const [selected, setSelected] = useState("");
  return (
    <PhoneFrame mode="screen">
      <div className="button-screen-examples">
        <AilockButton full={false} size="small" onClick={() => setSelected("Small")}>
          Small
        </AilockButton>
        <div className="button-pair-row">
          <AilockButton variant="secondary" onClick={() => setSelected("Back")}>
            Back
          </AilockButton>
          <AilockButton onClick={() => setSelected("Next")}>
            Next
          </AilockButton>
        </div>
        <AilockButton onClick={() => setSelected("Full")}>{selected === "Full" ? "Selected" : "Full size"}</AilockButton>
      </div>
    </PhoneFrame>
  );
}

function ButtonBoxExamples() {
  const [selected, setSelected] = useState("");
  return (
    <div className="button-box-examples">
      <AilockButton full={false} size="small" onClick={() => setSelected("Small")}>
        Small
      </AilockButton>
      <div className="button-pair-row">
        <AilockButton variant="secondary" onClick={() => setSelected("Back")}>
          Back
        </AilockButton>
        <AilockButton onClick={() => setSelected("Next")}>
          Next
        </AilockButton>
      </div>
      <AilockButton onClick={() => setSelected("Full")}>{selected === "Full" ? "Selected" : "Full size"}</AilockButton>
    </div>
  );
}

function ButtonBoxScreen() {
  return (
    <PhoneFrame mode="screen">
      <div className="button-box-screen">
        <ButtonBoxExamples />
      </div>
    </PhoneFrame>
  );
}

function useTimedPressMotion(durationMs = 760) {
  const [pressed, setPressed] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const playMotion = () => {
    clearTimers();
    setPressed(false);
    timersRef.current = [
      window.setTimeout(() => setPressed(true), 0),
      window.setTimeout(() => setPressed(false), durationMs),
    ];
  };

  return { playMotion, pressed };
}

function BottomCtaPlayground() {
  const { playMotion, pressed } = useTimedPressMotion();
  return (
    <div className="bottom-cta-stage">
      <div className={cx("bottom-cta-dock", "is-visible", pressed && "motion-press")}>
        <AilockButton placement="bottom" onClick={playMotion}>
          Select
        </AilockButton>
      </div>
    </div>
  );
}

function ButtonDisabledExamples() {
  return (
    <div className="primitive-demo-stack">
      <div className="button-pair-row">
        <AilockButton full={false} size="small">
          Small
        </AilockButton>
        <AilockButton disabled full={false} size="small">
          Disabled
        </AilockButton>
      </div>
      <AilockButton disabled>Continue</AilockButton>
    </div>
  );
}

function ButtonPlaygroundAll() {
  const [screenSelected, setScreenSelected] = useState("");
  const [boxSelected, setBoxSelected] = useState("");
  const { playMotion, pressed } = useTimedPressMotion();

  return (
    <PhoneFrame mode="screen">
      <div className="button-playground-screen">
        <div className="button-screen-examples compact">
          <div className="button-pair-row">
            <AilockButton full={false} size="small" onClick={() => setScreenSelected("Small")}>
              Small
            </AilockButton>
            <AilockButton disabled full={false} size="small">
              Disabled
            </AilockButton>
          </div>
          <div className="button-pair-row">
            <AilockButton variant="secondary" onClick={() => setScreenSelected("Back")}>
              Back
            </AilockButton>
            <AilockButton onClick={() => setScreenSelected("Next")}>
              Next
            </AilockButton>
          </div>
          <AilockButton onClick={() => setScreenSelected("Full")}>{screenSelected === "Full" ? "Selected" : "Full size"}</AilockButton>
        </div>
        <div className="button-box-examples compact">
          <div className="button-pair-row">
            <AilockButton full={false} size="small" onClick={() => setBoxSelected("Small")}>
              Small
            </AilockButton>
            <AilockButton disabled full={false} size="small">
              Disabled
            </AilockButton>
          </div>
          <div className="button-pair-row">
            <AilockButton variant="secondary" onClick={() => setBoxSelected("Back")}>
              Back
            </AilockButton>
            <AilockButton onClick={() => setBoxSelected("Next")}>
              Next
            </AilockButton>
          </div>
          <AilockButton onClick={() => setBoxSelected("Full")}>{boxSelected === "Full" ? "Selected" : "Full size"}</AilockButton>
        </div>
        <div className={cx("bottom-cta-dock", "is-visible", pressed && "motion-press")}>
          <AilockButton placement="bottom" onClick={playMotion}>
            Select
          </AilockButton>
        </div>
      </div>
    </PhoneFrame>
  );
}

function BottomButtonPhone({ children }: { children: ReactNode }) {
  return (
    <PhoneFrame mode="screen">
      <div className="bottom-preview">{children}</div>
    </PhoneFrame>
  );
}

export function ButtonStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <ButtonPlaygroundAll />
      </StateTile>
      <StateTile title="Full Screen" interactive>
        <ButtonScreenExamples />
      </StateTile>
      <StateTile title="In Box" interactive>
        <ButtonBoxScreen />
      </StateTile>
      <StateTile title="Disabled">
        <ButtonDisabledExamples />
      </StateTile>
      <StateTile title="Bottom Button" interactive>
        <BottomButtonPhone>
          <BottomCtaPlayground />
        </BottomButtonPhone>
      </StateTile>
    </StateMatrix>
  );
}

export function IconButton({
  icon,
  label,
  active = false,
  variant = "field",
  direction,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  variant?: "header" | "field" | "action";
  direction?: "left" | "right";
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cx("icon-button", variant, direction === "left" && "icon-left", active && "active")}
      onClick={onClick}
      type="button"
    >
      <DesignIcon name={icon} size={22} />
    </button>
  );
}

function IconButtonHeaderScreen({ children }: { children?: ReactNode }) {
  return (
    <PhoneFrame mode="screen">
      <div className="icon-button-screen">
        <div className="icon-header-demo">
          <IconButton direction="left" icon="arrowForward" label="Back" variant="header" />
          <h2 className="screen-header-collapsed-title">Choose apps</h2>
          <IconButton icon="close" label="Delete" variant="header" />
        </div>
        {children ? <div className="icon-button-screen-body">{children}</div> : null}
      </div>
    </PhoneFrame>
  );
}

export function IconButtonStateMatrix() {
  const [active, setActive] = useState("settings");
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <IconButtonHeaderScreen>
          <div className="icon-button-stack">
            <div className="icon-field-demo">
              <IconButton direction="left" icon="arrowForward" label="Move left" onClick={() => setActive("left")} />
              <IconButton icon="arrowForward" label="Move right" onClick={() => setActive("right")} />
            </div>
            <AilockTextField initialValue="YouTube" showLabel={false} />
            <div className="icon-action-row">
              <IconButton
                active={active === "settings"}
                icon="settings"
                label="Settings"
                variant="action"
                onClick={() => setActive("settings")}
              />
              <AilockButton onClick={() => setActive("continue")}>
                {active === "continue" ? "Selected" : "Continue"}
              </AilockButton>
            </div>
          </div>
        </IconButtonHeaderScreen>
      </StateTile>
      <StateTile title="Header">
        <IconButtonHeaderScreen />
      </StateTile>
      <StateTile title="Input Field">
        <div className="icon-button-stack">
          <div className="icon-field-demo">
            <IconButton direction="left" icon="arrowForward" label="Move left" />
            <IconButton icon="arrowForward" label="Move right" />
          </div>
          <AilockTextField initialValue="YouTube" showLabel={false} />
        </div>
      </StateTile>
      <StateTile title="Action Row">
        <div className="icon-action-row">
          <IconButton icon="settings" label="Settings" variant="action" />
          <AilockButton>Continue</AilockButton>
        </div>
      </StateTile>
    </StateMatrix>
  );
}

export function InputStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <AilockTextField initialValue="YouTube" showLabel={false} />
      </StateTile>
      <StateTile title="Empty">
        <AilockTextField initialValue="" showLabel={false} />
      </StateTile>
      <StateTile title="Filled">
        <AilockTextField initialValue="Instagram" showLabel={false} />
      </StateTile>
      <StateTile title="Disabled">
        <div className="ailock-field">
          <div className="field-control state-disabled has-leading-icon">
            <span aria-hidden className="field-leading-icon">
              <DesignIcon name="search" size={20} />
            </span>
            <input disabled placeholder="App name search" value="Search disabled" readOnly />
          </div>
        </div>
      </StateTile>
    </StateMatrix>
  );
}

export function SegmentedControlStateMatrix() {
  const [value, setValue] = useState<"hours" | "minutes">("hours");
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <div className="primitive-demo-stack">
          <SegmentedControl onChange={setValue} value={value} />
          <p className="primitive-state-text">{value}</p>
        </div>
      </StateTile>
      <StateTile title="Hours">
        <SegmentedControl value="hours" />
      </StateTile>
      <StateTile title="Minutes">
        <SegmentedControl value="minutes" />
      </StateTile>
    </StateMatrix>
  );
}

function AppSelectionPlayground() {
  const [selected, setSelected] = useState(true);
  return (
    <div className="primitive-demo-stack app-demo-stack">
      <AilockList>
        <AppListItem app={apps[0]} onClick={() => setSelected((value) => !value)} selected={selected} />
        <RowDivider />
        <AppListItem app={apps[1]} onClick={() => undefined} selected={false} />
        <RowDivider />
        <AppListItem app={apps[2]} onClick={() => undefined} selected={false} />
      </AilockList>
    </div>
  );
}

export function AppSelectionRowStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <AppSelectionPlayground />
      </StateTile>
      <StateTile title="Selected">
        <AilockList>
          <AppListItem app={apps[0]} selected />
        </AilockList>
      </StateTile>
      <StateTile title="Unselected">
        <AilockList>
          <AppListItem app={apps[1]} selected={false} />
        </AilockList>
      </StateTile>
      <StateTile title="Search list">
        <AppListGroup />
      </StateTile>
      <StateTile title="Empty search">
        <AppListGroup query="none" />
      </StateTile>
    </StateMatrix>
  );
}

function AccordionPlayground() {
  const demoItems = [
    { app: apps[0], duration: "25 min", label: "Today 1h 22m used", value: { hours: 0, minutes: 25 } },
    { app: apps[1], duration: "45 min", label: "Today 38m used", value: { hours: 0, minutes: 45 } },
    { app: apps[2], duration: "1h 10m", label: "Today 2h 04m used", value: { hours: 1, minutes: 10 } },
  ];
  const [expandedName, setExpandedName] = useState<string | null>(demoItems[0].app.name);

  return (
    <div className="primitive-demo-stack app-demo-stack">
      <AilockList>
        {demoItems.map((item, index) => {
          const expanded = expandedName === item.app.name;
          return (
            <div key={item.app.name}>
              <AilockAccordion
                expanded={expanded}
                header={
                  <AppListItem
                    app={item.app}
                    highlightSelected
                    onClick={() => setExpandedName((current) => (current === item.app.name ? null : item.app.name))}
                    selected={expanded}
                    selectedLabel={item.label}
                    showSelectionCheck={false}
                    unselectedLabel={item.label}
                  />
                }
              >
                <>
                  <ContentSectionLabel title="Lock timer" trailing={<span className="section-meta">{item.duration}</span>} />
                  <TimeWheelPicker value={item.value} />
                </>
              </AilockAccordion>
              {index !== demoItems.length - 1 ? <RowDivider /> : null}
            </div>
          );
        })}
      </AilockList>
    </div>
  );
}

export function AccordionStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <AccordionPlayground />
      </StateTile>
      <StateTile title="Collapsed">
        <AilockList>
          <AilockAccordion
            expanded={false}
            header={<AppListItem app={apps[1]} selected={false} unselectedLabel="Tap to configure lock timer" />}
          />
        </AilockList>
      </StateTile>
      <StateTile title="Expanded">
        <AilockList>
          <AilockAccordion
            expanded
            header={
              <AppListItem
                app={apps[2]}
                highlightSelected
                selected
                selectedLabel="Today 38m used"
                showSelectionCheck={false}
              />
            }
          >
            <>
              <ContentSectionLabel title="Lock timer" trailing={<span className="section-meta">45 min</span>} />
              <TimeWheelPicker value={{ hours: 0, minutes: 45 }} />
            </>
          </AilockAccordion>
        </AilockList>
      </StateTile>
    </StateMatrix>
  );
}

function UsagePlayground() {
  const [boost, setBoost] = useState(0);
  return (
    <div className="primitive-demo-stack app-demo-stack">
      <AilockList>
        {apps.map((app, index) => (
          <div key={app.name}>
            <UsageBar app={app} boost={boost} />
            {index !== apps.length - 1 ? <RowDivider /> : null}
          </div>
        ))}
      </AilockList>
      <AilockButton variant="secondary" onClick={() => setBoost((value) => (value >= 0.24 ? 0 : value + 0.08))}>
        Simulate usage
      </AilockButton>
    </div>
  );
}

export function UsageRowStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <UsagePlayground />
      </StateTile>
      <StateTile title="Normal">
        <AilockList>
          <UsageBar app={apps[2]} />
        </AilockList>
      </StateTile>
      <StateTile title="Active">
        <AilockList>
          <UsageBar app={apps[1]} boost={0.12} />
        </AilockList>
      </StateTile>
      <StateTile title="Near limit">
        <AilockList>
          <UsageBar app={apps[0]} boost={0.24} />
        </AilockList>
      </StateTile>
      <StateTile title="Usage list">
        <UsageList />
      </StateTile>
    </StateMatrix>
  );
}

export function GraphStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Usage Progress">
        <div className="graph-demo-stack">
          <UsageProgress value={0.34} />
          <UsageProgress value={0.62} />
          <UsageProgress value={0.86} />
        </div>
      </StateTile>
      <StateTile title="Daily Graph">
        <div className="graph-demo-stack">
          <DailyUsageGraph />
        </div>
      </StateTile>
      <StateTile title="Weekly Graph">
        <div className="graph-demo-stack">
          <WeeklyUsageGraph />
        </div>
      </StateTile>
      <StateTile title="Compact Weekly Graph">
        <div className="graph-demo-stack">
          <WeeklyUsageGraph compact />
        </div>
      </StateTile>
    </StateMatrix>
  );
}

export function PermissionStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <PermissionCardGroup />
      </StateTile>
      <StateTile title="Missing">
        <AilockList>
          <PermissionCard granted={false} onToggle={() => undefined} row={permissionRows[0]} />
        </AilockList>
      </StateTile>
      <StateTile title="Granted">
        <AilockList>
          <PermissionCard granted onToggle={() => undefined} row={permissionRows[1]} />
        </AilockList>
      </StateTile>
      <StateTile title="All granted">
        <AilockList>
          {permissionRows.map((row, index) => (
            <div key={row.title}>
              <PermissionCard granted onToggle={() => undefined} row={row} />
              {index !== permissionRows.length - 1 ? <RowDivider /> : null}
            </div>
          ))}
        </AilockList>
      </StateTile>
    </StateMatrix>
  );
}

export type BottomRoute = "home" | "records" | "restrictions" | "settings";

export function FloatingBottomNav({
  currentRoute,
  interactive = true,
  onRouteChange,
}: {
  currentRoute?: BottomRoute;
  interactive?: boolean;
  onRouteChange?: (route: BottomRoute) => void;
} = {}) {
  const [activeRoute, setActiveRoute] = useState<BottomRoute>(currentRoute ?? "home");
  const selectedRoute = currentRoute ?? activeRoute;
  const items: Array<{ route: BottomRoute; label: string; icon: IconName; selectedIcon: IconName }> = [
    { route: "home", label: "Home", icon: "home", selectedIcon: "homeFilled" },
    { route: "records", label: "Records", icon: "records", selectedIcon: "recordsFilled" },
    { route: "restrictions", label: "Limits", icon: "restrictions", selectedIcon: "restrictionsFilled" },
    { route: "settings", label: "Settings", icon: "settings", selectedIcon: "settingsFilled" },
  ];
  const activeIndex = Math.max(
    items.findIndex((item) => item.route === selectedRoute),
    0,
  );

  return (
    <nav
      aria-label="Bottom navigation"
      className="floating-bottom-nav"
      style={{ "--active-index": activeIndex } as CSSProperties}
    >
      <span aria-hidden className="bottom-nav-indicator" />
      {items.map((item) => {
        const selected = selectedRoute === item.route;
        return (
          <button
            className={cx("bottom-nav-item", selected && "active")}
            key={item.route}
            onClick={() => {
              if (!interactive) return;
              setActiveRoute(item.route);
              onRouteChange?.(item.route);
            }}
            type="button"
          >
            <span aria-hidden className="bottom-nav-icon">
              <DesignIcon name={selected ? item.selectedIcon : item.icon} size={20} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function BottomNavPreview({ route, interactive = false }: { route?: BottomRoute; interactive?: boolean }) {
  return (
    <div className="component-surface nav-surface">
      <FloatingBottomNav currentRoute={route} interactive={interactive} />
    </div>
  );
}

export function BottomNavigationStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <BottomNavPreview interactive />
      </StateTile>
      <StateTile title="Home">
        <BottomNavPreview route="home" />
      </StateTile>
      <StateTile title="Records">
        <BottomNavPreview route="records" />
      </StateTile>
      <StateTile title="Limits">
        <BottomNavPreview route="restrictions" />
      </StateTile>
      <StateTile title="Settings">
        <BottomNavPreview route="settings" />
      </StateTile>
    </StateMatrix>
  );
}

function ScreenHeaderPreview({
  initialProgress = 0,
  interactive = false,
  mode = "detail",
  content = "short",
}: {
  initialProgress?: number;
  interactive?: boolean;
  mode?: "top-level" | "detail";
  content?: "short" | "long";
}) {
  const [progress, setProgress] = useState(initialProgress);
  const topbarRef = useRef<HTMLDivElement>(null);
  const largeHeaderRef = useRef<HTMLDivElement>(null);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const title = mode === "top-level" ? "Records" : "Choose apps";
  const subtitle = mode === "top-level" ? "하루, 주간을 선택해서 볼 수 있어요." : "Set daily limits";
  const collapsedTitleOpacity = Math.min(1, Math.max(0, (clampedProgress - 0.18) / 0.58));
  const largeTitleOpacity = Math.max(0, 1 - clampedProgress * 1.18);
  const largeSubtitleOpacity = Math.max(0, 1 - clampedProgress * 1.9);
  const headerStyle = {
    "--header-divider-opacity": `${clampedProgress}`,
    "--collapsed-title-opacity": `${collapsedTitleOpacity}`,
    "--collapsed-title-y": `${(1 - collapsedTitleOpacity) * 6}px`,
    "--large-title-opacity": `${largeTitleOpacity}`,
    "--large-title-scale": `${1 - clampedProgress * 0.18}`,
    "--large-title-y": `${clampedProgress * -54}px`,
    "--large-subtitle-opacity": `${largeSubtitleOpacity}`,
    "--large-subtitle-y": `${(1 - largeSubtitleOpacity) * -12}px`,
  } as CSSProperties;
  const collapsedTitleStyle = {
    opacity: collapsedTitleOpacity,
    transform: `translateY(${(1 - collapsedTitleOpacity) * 6}px)`,
  } as CSSProperties;

  return (
    <div
      className={cx("header-scroll-demo", !interactive && "header-static-demo")}
      onScroll={(event) => {
        if (!interactive) return;
        const measuredCollapseDistance =
          (largeHeaderRef.current?.offsetHeight ?? 0) - (topbarRef.current?.offsetHeight ?? 0);
        setProgress(Math.min(event.currentTarget.scrollTop / Math.max(measuredCollapseDistance, HEADER_COLLAPSE_DISTANCE), 1));
      }}
      style={headerStyle}
      tabIndex={interactive ? 0 : -1}
    >
      <div className={cx("screen-header-topbar", mode === "top-level" && "top-level")} ref={topbarRef}>
        {mode === "top-level" ? (
          <>
            <h2 className="screen-header-collapsed-title" style={collapsedTitleStyle}>{title}</h2>
            <div className="screen-header-trailing">
              <SegmentedControl value="hours" />
            </div>
          </>
        ) : (
          <>
            <IconButton direction="left" icon="arrowForward" label="Back" variant="header" />
            <h2 className="screen-header-collapsed-title" style={collapsedTitleStyle}>{title}</h2>
            <IconButton icon="close" label="Delete" variant="header" />
          </>
        )}
      </div>
      <div className={cx("screen-header-large", mode === "top-level" && "top-level")} ref={largeHeaderRef}>
        <div className="screen-header-copy">
          <h1 className="screen-header-large-title">{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <CollapsingHeaderDemoBody content={content} />
    </div>
  );
}

function CollapsingHeaderDemoBody({ content }: { content: "short" | "long" }) {
  return (
    <main className={cx("collapsing-demo-body", content === "long" && "long")}>
      <ContentSectionLabel title={content === "long" ? "앱 사용 기록" : "오늘 사용 기록"} />
      <AilockList>
        {(content === "long" ? longHeaderDemoApps : apps.slice(0, 2)).map((app, index, rows) => (
          <div key={`${app.name}-${index}`}>
            <UsageBar app={app} boost={content === "long" ? Math.min(index * 0.018, 0.22) : 0} />
            {index !== rows.length - 1 ? <RowDivider /> : null}
          </div>
        ))}
      </AilockList>
    </main>
  );
}

function CollapsingHeaderPhonePreview({
  content = "short",
  initialProgress = 0,
}: {
  content?: "short" | "long";
  initialProgress?: number;
}) {
  return (
    <PhoneFrame mode="screen">
      <div className="collapsing-header-demo-screen">
        <ScreenHeaderPreview content={content} initialProgress={initialProgress} interactive mode="top-level" />
        <div className="collapsing-header-demo-nav">
          <FloatingBottomNav currentRoute="records" />
        </div>
      </div>
    </PhoneFrame>
  );
}

function StaticHeaderPreview({ trailing = "close" }: { trailing?: "close" | "delete" }) {
  return (
    <div className="static-header-demo">
      <div className="static-screen-header">
        <IconButton direction="left" icon="arrowForward" label="Back" variant="header" />
        <h2>{trailing === "delete" ? "YouTube" : "개인정보 입력"}</h2>
        <IconButton icon={trailing === "delete" ? "trash" : "close"} label={trailing === "delete" ? "Delete" : "Close"} variant="header" />
      </div>
      <div className="static-header-demo-body">
        <div className="screen-intro">
          <h1>{trailing === "delete" ? "앱 제한 설정" : "프로필 설정"}</h1>
          <p>
            {trailing === "delete"
              ? "상세 화면은 고정 헤더를 사용합니다."
              : "온보딩과 세부 화면은 중앙 정렬 고정 헤더를 사용합니다."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeaderStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Top Level">
        <CollapsingHeaderPhonePreview />
      </StateTile>
      <StateTile title="Top Collapsed">
        <CollapsingHeaderPhonePreview initialProgress={1} />
      </StateTile>
      <StateTile title="Long List">
        <CollapsingHeaderPhonePreview content="long" />
      </StateTile>
      <StateTile title="Detail">
        <PhoneFrame mode="screen">
          <StaticHeaderPreview />
        </PhoneFrame>
      </StateTile>
      <StateTile title="Detail With Delete">
        <PhoneFrame mode="screen">
          <StaticHeaderPreview trailing="delete" />
        </PhoneFrame>
      </StateTile>
    </StateMatrix>
  );
}

export function OnboardingProgress({ step = 2, total = 5 }: { step?: number; total?: number }) {
  const progress = Math.min(Math.max(step / total, 0), 1);
  return (
    <div className="onboarding-progress" aria-label={`Onboarding step ${step} of ${total}`}>
      <span style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

type MascotMood = "idle" | "thinking" | "success";
type MascotSize = "sm" | "md" | "lg" | "hero";

export function OnboardingPrompt({
  className,
  layout = "row",
  message,
  mood = "idle",
}: {
  className?: string;
  layout?: "row" | "stack";
  message: string;
  mood?: MascotMood;
}) {
  const bubble = (
    <SpeechBubble className="onboarding-prompt-bubble" key={message}>
      {message}
    </SpeechBubble>
  );
  const mascot = <Mascot mood={mood} size={layout === "stack" ? "lg" : "sm"} />;

  return (
    <div className={cx("onboarding-prompt", layout, className)}>
      {layout === "stack" ? (
        <>
          {bubble}
          {mascot}
        </>
      ) : (
        <>
          {mascot}
          {bubble}
        </>
      )}
    </div>
  );
}

function HangulTypingText({ text }: { text: string }) {
  const frames = useMemo(() => getHangulTypingFrames(text), [text]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (frames.length <= 1) {
      setFrameIndex(frames.length - 1);
      return undefined;
    }

    let nextIndex = 0;
    setFrameIndex(0);
    let timer: number | undefined;
    const startTimer = window.setTimeout(() => {
      timer = window.setInterval(() => {
        nextIndex += 1;
        setFrameIndex(nextIndex);
        if (nextIndex >= frames.length - 1 && timer !== undefined) window.clearInterval(timer);
      }, hangulTypingFrameMs);
    }, hangulTypingInitialDelayMs);

    return () => {
      window.clearTimeout(startTimer);
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [frames]);

  return (
    <span aria-label={text} className="onboarding-prompt-text">
      {frames[frameIndex] ?? text}
    </span>
  );
}

function OnboardingLayoutPreview() {
  return (
    <PhoneFrame mode="screen">
      <div className="onboarding-pattern-screen">
        <div className="static-screen-header onboarding-pattern-header">
          <IconButton direction="left" icon="arrowForward" label="Back" variant="header" />
          <h2>{"개인정보 입력"}</h2>
          <span aria-hidden />
        </div>
        <OnboardingProgress step={2} total={4} />
        <div className="onboarding-pattern-content">
          <div className="onboarding-flow">
            <OnboardingPrompt message={"이름이 궁금해."} />
            <div className="onboarding-form">
              <label className="profile-field">
                <span>{"이름"}</span>
                <input placeholder={"이름을 입력해주세요"} readOnly value={"홍길동"} />
              </label>
            </div>
          </div>
        </div>
        <div className="onboarding-pattern-action">
          <AilockButton placement="bottom">{"다음"}</AilockButton>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function OnboardingPatternStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Layout">
        <OnboardingLayoutPreview />
      </StateTile>
      <StateTile title="Prompt">
        <div className="onboarding-prompt-demo">
          <OnboardingPrompt layout="stack" message={"안녕하세요."} />
          <OnboardingPrompt message={"이름을 알려주세요."} />
        </div>
      </StateTile>
      <StateTile title="Progress">
        <PhoneFrame mode="screen">
          <div className="onboarding-progress-demo">
            <OnboardingProgress step={1} total={4} />
            <OnboardingProgress step={2} total={4} />
            <OnboardingProgress step={4} total={4} />
          </div>
        </PhoneFrame>
      </StateTile>
    </StateMatrix>
  );
}

function ContentSectionLabelPreview() {
  return (
    <div className="section-label-demo-stack">
      <ScreenSection>
        <ContentSectionLabel
          title={"하루 그래프"}
          trailing={<span className="section-meta">{getUsageGraphTotalLabel(defaultDailyUsageData)}</span>}
        />
        <DailyUsageGraph compact />
      </ScreenSection>
      <ScreenSection>
        <ContentSectionLabel title={"앱 사용 기록"} trailing={<span className="section-meta">{"3개"}</span>} />
        <AilockList>
          <UsageBar app={apps[0]} />
          <RowDivider />
          <UsageBar app={apps[1]} />
          <RowDivider />
          <UsageBar app={apps[2]} />
        </AilockList>
      </ScreenSection>
    </div>
  );
}

function ContentSectionLabelOnlyPreview() {
  return (
    <div className="section-label-demo-stack">
      <ContentSectionLabel title={"하루 그래프"} trailing={<span className="section-meta">{getUsageGraphTotalLabel(defaultDailyUsageData)}</span>} />
      <ContentSectionLabel title={"일주일 그래프"} trailing={<span className="section-meta">{getUsageGraphTotalLabel(defaultWeeklyUsageData)}</span>} />
    </div>
  );
}

export function SectionLabelStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Screen Section">
        <ContentSectionLabelPreview />
      </StateTile>
      <StateTile title="Label Only">
        <ContentSectionLabelOnlyPreview />
      </StateTile>
    </StateMatrix>
  );
}

export function SpeechBubble({
  animated = true,
  children,
  className,
}: {
  animated?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const shouldAnimate = animated && typeof children === "string";
  return (
    <div className={cx("speech-bubble", className)}>
      {shouldAnimate ? <HangulTypingText key={`${children}-${hangulTypingAnimationVersion}`} text={children} /> : children}
    </div>
  );
}

export function Mascot({ mood = "idle", size = "md" }: { mood?: MascotMood; size?: MascotSize }) {
  return (
    <div className={cx("mascot", `size-${size}`, mood === "thinking" && "mood-thinking", mood === "success" && "mood-success")}>
      <BrandMark className="brand-symbol" />
    </div>
  );
}

export function SpeechBubbleStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Speech Bubble">
        <div className="primitive-demo-stack">
          <SpeechBubble>Tell me why you need this app.</SpeechBubble>
        </div>
      </StateTile>
      <StateTile title="Long Copy">
        <div className="primitive-demo-stack">
          <SpeechBubble>{"사용 시간을 확인하고 잠금할 앱을 선택하세요."}</SpeechBubble>
        </div>
      </StateTile>
    </StateMatrix>
  );
}

export function MascotStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Mascot Idle">
        <div className="primitive-demo-stack">
          <Mascot />
        </div>
      </StateTile>
      <StateTile title="Mascot Thinking">
        <div className="primitive-demo-stack">
          <Mascot mood="thinking" />
        </div>
      </StateTile>
      <StateTile title="Mascot Success">
        <div className="primitive-demo-stack">
          <Mascot mood="success" />
        </div>
      </StateTile>
    </StateMatrix>
  );
}

const sampleReasonMessage = "유튜브에서 강의 들어야해서 10분만 들을게.";
const retryReasonMessage = "정말 자료만 확인하고 바로 끄께.";
const deniedDecisionMessage = "안돼, 지금은 허용해줄 수 없어.";
const retryDeniedDecisionMessage =
  "그래도 안 돼. 지금 요청은 목적이 충분히 분명하지 않아.\n다른 방법을 선택해.";
const allowedDecisionMessage = "그래, 딱 3분만 보도록 해.";
const defaultChatAppName = "YouTube";
const thinkingStatusLabel = "생각중이에요";
const retryDecisionLabel = "다시 요청하기";
const confirmDecisionLabel = "확인";
const reasonInputPlaceholder = "이유를 입력해주세요";
const chatSubmitFadeMs = 260;
const chatThinkingResolveMs = 1250;

type ChatMessageRole = "assistant" | "user";
type ChatDecisionPhase =
  | "asking"
  | "submitting"
  | "thinking"
  | "result"
  | "editing"
  | "retrySubmitting"
  | "retryThinking"
  | "retryResult";

function getReasonQuestion(appName: string) {
  const displayName = appName === "YouTube" ? "유튜브" : appName;
  return `${displayName} 왜 켰어?`;
}

export function ChatMessage({
  animated = false,
  children,
  className,
  mood = "idle",
  role = "assistant",
}: {
  animated?: boolean;
  children: ReactNode;
  className?: string;
  mood?: MascotMood;
  role?: ChatMessageRole;
}) {
  const isAssistant = role === "assistant";
  return (
    <div className={cx("chat-message", `role-${role}`, isAssistant && "layout-inline", className)}>
      {isAssistant ? <Mascot mood={mood} size="sm" /> : null}
      <SpeechBubble animated={animated} className="chat-message-bubble">
        {children}
      </SpeechBubble>
    </div>
  );
}

export function ChatThread({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("chat-thread", className)}>{children}</div>;
}

export function ChatInputBar({
  disabled = false,
  expanded = false,
  loading = false,
  onActivate,
  onChange,
  onClear,
  onSubmit,
  placeholder = reasonInputPlaceholder,
  statusText = thinkingStatusLabel,
  value = "",
}: {
  disabled?: boolean;
  expanded?: boolean;
  loading?: boolean;
  onActivate?: () => void;
  onChange?: (value: string) => void;
  onClear?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  statusText?: string;
  value?: string;
}) {
  const hasValue = value.trim().length > 0;
  const canSubmit = hasValue && !disabled && !loading;
  const actionLabel = loading ? "중단" : disabled ? value || placeholder : canSubmit ? "전송" : "지우기";

  const handleAction = () => {
    if (canSubmit) {
      onSubmit?.();
      return;
    }
    onClear?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSubmit) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div
      className={cx("chat-input-bar", expanded && "expanded", loading && "loading", disabled && "disabled")}
      onClick={(event) => {
        if (!disabled || !onActivate) return;
        if (event.target instanceof HTMLElement && event.target.closest(".chat-input-action")) return;
        onActivate();
      }}
    >
      {loading ? (
        <div className="chat-input-status">
          <span className="spinner" />
          <strong>{statusText}</strong>
        </div>
      ) : disabled ? (
        <span className="chat-input-disabled-label">{value || placeholder}</span>
      ) : (
        <textarea
          aria-label={reasonInputPlaceholder}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={!onChange}
          rows={expanded ? 4 : 1}
          value={value}
        />
      )}
      <button
        aria-label={actionLabel}
        className={cx("chat-input-action", canSubmit && "ready")}
        onClick={handleAction}
        type="button"
      >
        <DesignIcon name={canSubmit ? "arrowForward" : "close"} size={20} />
      </button>
    </div>
  );
}

function ChatFlowFrame({
  children,
  className,
  onPointerDown,
}: {
  children: ReactNode;
  className?: string;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={cx("chat-flow-frame", className)} onPointerDown={onPointerDown}>
      <div className="chat-flow-content">{children}</div>
    </div>
  );
}

function ChatThinkingState({ onCancel }: { onCancel?: () => void }) {
  return (
    <ChatFlowFrame>
      <div className="chat-thinking-cluster">
        <Mascot mood="thinking" size="hero" />
      </div>
      <ChatInputBar loading onClear={onCancel} />
    </ChatFlowFrame>
  );
}

function ChatInputDemo() {
  const [value, setValue] = useState(sampleReasonMessage);
  return <ChatInputBar expanded={value.length > 0} onChange={setValue} onClear={() => setValue("")} value={value} />;
}

export function ChatComponentsStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Messages">
        <div className="primitive-demo-stack chat-component-demo">
          <ChatMessage>{getReasonQuestion(defaultChatAppName)}</ChatMessage>
          <ChatMessage role="user">{sampleReasonMessage}</ChatMessage>
          <ChatMessage>{deniedDecisionMessage}</ChatMessage>
        </div>
      </StateTile>
      <StateTile title="Input">
        <div className="primitive-demo-stack chat-component-demo">
          <ChatInputBar />
          <ChatInputDemo />
          <ChatInputBar disabled value={retryDecisionLabel} />
        </div>
      </StateTile>
      <StateTile title="Thinking">
        <ReasonFlowPhone>
          <ChatThinkingState />
        </ReasonFlowPhone>
      </StateTile>
    </StateMatrix>
  );
}

export function ReasonComposer({
  appName = defaultChatAppName,
  autoResolve = true,
  initial = "",
  onAllow,
  onExit,
  thinking = false,
}: {
  appName?: string;
  autoResolve?: boolean;
  initial?: string;
  onAllow?: () => void;
  onExit?: () => void;
  thinking?: boolean;
}) {
  const [phase, setPhase] = useState<ChatDecisionPhase>(thinking ? "thinking" : "asking");
  const [reason, setReason] = useState(thinking ? "" : initial);
  const [submittedReason, setSubmittedReason] = useState(initial);
  const [retryReason, setRetryReason] = useState("");
  const [decision, setDecision] = useState<"allowed" | "denied">("denied");
  const [focused, setFocused] = useState(false);
  const hasContent = reason.length > 0;
  const acceptsInput = phase === "asking" || phase === "editing";
  const isSubmittingPhase = phase === "submitting" || phase === "retrySubmitting";
  const isThinkingPhase = phase === "thinking" || phase === "retryThinking";
  const expanded = (focused || hasContent) && acceptsInput;
  const questionMessage = getReasonQuestion(appName);

  useEffect(() => {
    if (phase === "submitting" || phase === "retrySubmitting") {
      const nextPhase = phase === "retrySubmitting" ? "retryThinking" : "thinking";
      const timer = window.setTimeout(() => setPhase(nextPhase), chatSubmitFadeMs);
      return () => window.clearTimeout(timer);
    }

    if ((phase === "thinking" || phase === "retryThinking") && autoResolve) {
      const nextPhase = phase === "retryThinking" ? "retryResult" : "result";
      const timer = window.setTimeout(() => setPhase(nextPhase), chatThinkingResolveMs);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [autoResolve, phase]);

  const submitReason = () => {
    const nextReason = reason.trim();
    if (!nextReason || !acceptsInput) return;
    if (phase === "editing") {
      setRetryReason(nextReason);
      setPhase("retrySubmitting");
    } else {
      setSubmittedReason(nextReason);
      setDecision(/강의|자료|공부|수업|과제/.test(nextReason) ? "allowed" : "denied");
      setRetryReason("");
      setPhase("submitting");
    }
    setReason("");
    setFocused(false);
  };

  const startEditingAgain = () => {
    setReason("");
    setFocused(true);
    setPhase("editing");
  };

  const showInitialPrompt = phase === "asking" || phase === "submitting";
  const showResultOnly = phase === "result";
  const showConversation = phase === "editing" || phase === "retrySubmitting" || phase === "retryResult";
  const showRetryExchange = showConversation && retryReason.length > 0;

  return (
    <ChatFlowFrame
      className={cx("chat-decision-flow", `phase-${phase}`, isSubmittingPhase && "is-submitting")}
      onPointerDown={(event) => {
        if (event.target instanceof HTMLElement && !event.target.closest(".chat-input-bar")) setFocused(false);
      }}
    >
      {isThinkingPhase ? (
        <>
          <div className="chat-thinking-cluster">
            <Mascot mood="thinking" size="hero" />
          </div>
          <ChatInputBar loading onClear={startEditingAgain} />
        </>
      ) : (
        <>
          <ChatThread>
            {showInitialPrompt ? <ChatMessage>{questionMessage}</ChatMessage> : null}
            {showResultOnly ? (
              <>
                <ChatMessage>{questionMessage}</ChatMessage>
                <ChatMessage role="user">{submittedReason}</ChatMessage>
                <ChatMessage mood={decision === "allowed" ? "success" : "idle"}>
                  {decision === "allowed" ? allowedDecisionMessage : deniedDecisionMessage}
                </ChatMessage>
              </>
            ) : null}
            {showConversation ? (
              <>
                {submittedReason ? <ChatMessage role="user">{submittedReason}</ChatMessage> : null}
                <ChatMessage>{deniedDecisionMessage}</ChatMessage>
                {showRetryExchange ? <ChatMessage role="user">{retryReason}</ChatMessage> : null}
                {phase === "retryResult" ? <ChatMessage>{retryDeniedDecisionMessage}</ChatMessage> : null}
              </>
            ) : null}
          </ChatThread>
          {showResultOnly || phase === "retryResult" ? (
            <div className="figma-decision-actions">
              <ChatInputBar disabled onActivate={startEditingAgain} onClear={startEditingAgain} />
              <AilockButton onClick={decision === "allowed" ? onAllow : onExit}>
                {decision === "allowed" ? "3분 사용하기" : "나가기"}
              </AilockButton>
            </div>
          ) : (
            <ChatInputBar
              expanded={expanded}
              loading={phase === "submitting"}
              onChange={(value) => {
                setReason(value);
              }}
              onClear={() => setReason("")}
              onSubmit={submitReason}
              placeholder={reasonInputPlaceholder}
              value={reason}
            />
          )}
        </>
      )}
    </ChatFlowFrame>
  );
}

function ReasonFlowPhone({ children }: { children: ReactNode }) {
  return (
    <PhoneFrame>
      <div className="bottom-preview overlay-preview">{children}</div>
    </PhoneFrame>
  );
}

function RetryDeniedScenario() {
  return (
    <ChatFlowFrame className="chat-decision-flow phase-retryResult">
      <ChatThread>
        <ChatMessage role="user">{sampleReasonMessage}</ChatMessage>
        <ChatMessage>{deniedDecisionMessage}</ChatMessage>
        <ChatMessage role="user">{retryReasonMessage}</ChatMessage>
        <ChatMessage>{retryDeniedDecisionMessage}</ChatMessage>
      </ChatThread>
      <ChatInputBar disabled value={retryDecisionLabel} />
    </ChatFlowFrame>
  );
}

export function ReasonChatFlowStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Playground" interactive>
        <ReasonFlowPhone>
          <ReasonComposer />
        </ReasonFlowPhone>
      </StateTile>
      <StateTile title="Typing">
        <ReasonFlowPhone>
          <ReasonComposer initial={sampleReasonMessage} />
        </ReasonFlowPhone>
      </StateTile>
      <StateTile title="Loading">
        <ReasonFlowPhone>
          <ReasonComposer autoResolve={false} initial={sampleReasonMessage} thinking />
        </ReasonFlowPhone>
      </StateTile>
      <StateTile title="Retry Denied">
        <ReasonFlowPhone>
          <RetryDeniedScenario />
        </ReasonFlowPhone>
      </StateTile>
    </StateMatrix>
  );
}

export function DecisionResponse({ state, withRequest = false }: { state: "allowed" | "denied"; withRequest?: boolean }) {
  const message = state === "allowed" ? allowedDecisionMessage : deniedDecisionMessage;
  return (
    <ChatFlowFrame>
      <ChatThread>
        {withRequest ? <ChatMessage role="user">{sampleReasonMessage}</ChatMessage> : null}
        <ChatMessage mood={state === "allowed" ? "success" : "idle"}>
          {message}
        </ChatMessage>
      </ChatThread>
      <ChatInputBar disabled value={state === "denied" ? retryDecisionLabel : confirmDecisionLabel} />
    </ChatFlowFrame>
  );
}

export function OverlayPhone({ children }: { children: ReactNode }) {
  return (
    <PhoneFrame>
      <div className="bottom-preview overlay-preview">{children}</div>
    </PhoneFrame>
  );
}

export function DecisionResponseStateMatrix() {
  return (
    <StateMatrix>
      <StateTile title="Allowed">
        <OverlayPhone>
          <DecisionResponse state="allowed" />
        </OverlayPhone>
      </StateTile>
      <StateTile title="Denied">
        <OverlayPhone>
          <DecisionResponse state="denied" />
        </OverlayPhone>
      </StateTile>
      <StateTile title="Denied Thread">
        <OverlayPhone>
          <DecisionResponse state="denied" withRequest />
        </OverlayPhone>
      </StateTile>
    </StateMatrix>
  );
}
