// --- テーマ「ファンタジー」用のロードマップ表示 ---
// 背景に地図イラストを敷き、チェックポイントをサインカーブ(波)状に配置してすごろく風に見せる。
// QuestMapSimple.tsxとの最大の違いは、interactive=trueのときにパン(ドラッグ移動)・
// ホイール/ピンチによるズームをSVGのviewBox操作だけで自前実装している点。
"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type TouchList as ReactTouchList,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { StatusItem } from "@/lib/questStatus";

const VIEW_WIDTH = 459;
const VIEW_HEIGHT = 816;

const NODE_RADIUS = 20;
const CURRENT_NODE_RADIUS = 28;
const PUCK_DEPTH = 5;
const LABEL_WIDTH = 150;
const LABEL_HEIGHT = 42;
const CURRENT_LABEL_WIDTH = 180;
const CURRENT_LABEL_HEIGHT = 50;
const MAP_PADDING_X = LABEL_WIDTH / 2 + 10;
const MAP_PADDING_Y = 72;
const FOCUS_VIEW_WIDTH = 340;
const FOCUS_VIEW_HEIGHT = 430;
const MIN_VIEW_WIDTH = 140;
const MIN_VIEW_HEIGHT = 180;

type PuckColors = { top: string; base: string; icon: string };

const nodeColor: Record<StatusItem["status"], PuckColors> = {
  completed: { top: "#58cc02", base: "#46a302", icon: "#ffffff" },
  current: { top: "#1cb0f6", base: "#1899d6", icon: "#ffffff" },
  overdue: { top: "#ff4b4b", base: "#ea2b2b", icon: "#ffffff" },
  future: { top: "#e5e5e5", base: "#afafaf", icon: "#8a8a8a" },
};

const nodeIcon: Record<StatusItem["status"], string> = {
  completed: "✓",
  current: "⚔",
  overdue: "!",
  future: "🔒",
};

// Duolingo's signature lesson-button look
function Puck({
  x,
  y,
  r,
  colors,
  icon,
  iconSize = 18,
  ringed = false,
}: {
  x: number;
  y: number;
  r: number;
  colors: PuckColors;
  icon: string;
  iconSize?: number;
  ringed?: boolean;
}) {
  return (
    <g filter="url(#node-shadow)">
      <ellipse cx={x} cy={y + r + 4} rx={r * 0.9} ry={r * 0.28} fill="#00000022" />
      {ringed && (
        <circle cx={x} cy={y} r={r + 8} fill="none" stroke="#ffffff" strokeWidth={4} />
      )}
      <circle cx={x} cy={y + PUCK_DEPTH} r={r} fill={colors.base} />
      <circle cx={x} cy={y} r={r} fill={colors.top} stroke="#ffffff" strokeWidth={4} />
      <text
        x={x}
        y={y + iconSize * 0.35}
        textAnchor="middle"
        fontSize={iconSize}
        fontWeight={800}
        fill={colors.icon}
      >
        {icon}
      </text>
    </g>
  );
}

type Props = {
  items: StatusItem[];
  viewMode?: "full" | "focus-current";
  interactive?: boolean;
};

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

// パン/ズーム後のviewBoxが元のSVG範囲(0〜VIEW_WIDTH/HEIGHT)からはみ出さないよう補正する
const clampViewBox = (box: ViewBox): ViewBox => {
  const width = clamp(box.width, MIN_VIEW_WIDTH, VIEW_WIDTH);
  const height = clamp(box.height, MIN_VIEW_HEIGHT, VIEW_HEIGHT);

  return {
    x: clamp(box.x, 0, VIEW_WIDTH - width),
    y: clamp(box.y, 0, VIEW_HEIGHT - height),
    width,
    height,
  };
};

export default function QuestMap({ items, viewMode = "full", interactive = false }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<{ clientX: number; clientY: number; viewBox: ViewBox } | null>(null);
  const pinchRef = useRef<{ distance: number; viewBox: ViewBox } | null>(null);
  const count = items.length;

  // スタート地点（下端）
  const startX = 150;
  const startY = 730;

  // ゴール地点（上端）
  const goalX = 70;
  const goalY = 70;

  // チェックポイントのインデックスからSVG座標を計算する。
  // y座標: スタート(startY)からゴール(goalY)まで進捗(progress)に応じて直線補間。
  // x座標: sin波でジグザグに振らせて「道」らしく見せる。
  // amplitude(振れ幅)とwaveCount(波の数)はチェックポイント数に応じて自動調整し、
  // 数が多くても少なくても画面に収まりつつ蛇行して見えるようにしている。
  const getNodePosition = (index: number) => {
    const progress = (index + 1) / (count + 1);
    const minX = MAP_PADDING_X;
    const maxX = VIEW_WIDTH - MAP_PADDING_X;
    const minY = MAP_PADDING_Y;
    const maxY = VIEW_HEIGHT - MAP_PADDING_Y;
    const centerX = VIEW_WIDTH / 2;
    const amplitude = Math.max(70, Math.min(135, 175 - count * 7));
    const waveCount = count <= 4 ? 2.5 : count <= 8 ? 3.5 : 4.5;
    const x = centerX + Math.sin(progress * Math.PI * waveCount - Math.PI / 2) * amplitude;
    const y = startY + (goalY - startY) * progress;

    return {
      x: Math.round(clamp(x, minX, maxX)),
      y: Math.round(clamp(y, minY, maxY)),
    };
  };

  const nodes = items.map((item, i) => {
    const pos = getNodePosition(i);
    return {
      ...item,
      x: pos.x,
      y: pos.y,
    };
  });

  // パス接続用の全座標リスト (スタート -> 各ノード -> ゴール)
  const points = [
    { x: startX, y: startY },
    ...nodes.map((n) => ({ x: n.x, y: n.y })),
    { x: goalX, y: goalY },
  ];

  const allCompleted = count > 0 && nodes.every((n) => n.status === "completed");
  // viewMode="focus-current"のとき最初にズームインして表示する対象。
  // 優先順位: 現在地(current) > 期日超過(overdue) > それ以外の未完了
  const focusNode =
    nodes.find((n) => n.status === "current") ??
    nodes.find((n) => n.status === "overdue") ??
    nodes.find((n) => !n.checkpoint.completed_at);
  // focus-currentならfocusNodeを中心にした小さいviewBox、fullなら地図全体を表示するviewBox
  const initialViewBox =
    viewMode === "focus-current" && focusNode
      ? {
          x: clamp(focusNode.x - FOCUS_VIEW_WIDTH / 2, 0, VIEW_WIDTH - FOCUS_VIEW_WIDTH),
          y: clamp(focusNode.y - FOCUS_VIEW_HEIGHT / 2, 0, VIEW_HEIGHT - FOCUS_VIEW_HEIGHT),
          width: FOCUS_VIEW_WIDTH,
          height: FOCUS_VIEW_HEIGHT,
        }
      : {
          x: 0,
          y: 0,
          width: VIEW_WIDTH,
          height: VIEW_HEIGHT,
        };
  const [viewBox, setViewBox] = useState<ViewBox>(initialViewBox);
  const activeViewBox = interactive ? viewBox : initialViewBox;

  useEffect(() => {
    setViewBox(initialViewBox);
  }, [initialViewBox.x, initialViewBox.y, initialViewBox.width, initialViewBox.height]);

  const segmentCompleted = (segmentIndex: number) => {
    if (segmentIndex === count) return allCompleted;
    return nodes[segmentIndex]?.status === "completed";
  };

  // クライアント座標(マウス/タッチ位置)をSVG内部座標(viewBox基準)に変換する
  const getSvgPoint = (clientX: number, clientY: number, box: ViewBox = activeViewBox) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: box.x, y: box.y };

    return {
      x: box.x + ((clientX - rect.left) / rect.width) * box.width,
      y: box.y + ((clientY - rect.top) / rect.height) * box.height,
    };
  };

  // (clientX, clientY)を中心に据えたままviewBoxを拡大/縮小する(scale<1で拡大、>1で縮小)。
  // ホイール・ピンチ操作の両方から呼ばれる共通ズーム処理。
  const zoomAt = (clientX: number, clientY: number, scale: number) => {
    setViewBox((current) => {
      const minScale = Math.max(MIN_VIEW_WIDTH / current.width, MIN_VIEW_HEIGHT / current.height);
      const maxScale = Math.min(VIEW_WIDTH / current.width, VIEW_HEIGHT / current.height);
      const nextScale = clamp(scale, minScale, maxScale);
      const anchor = getSvgPoint(clientX, clientY, current);
      const width = current.width * nextScale;
      const height = current.height * nextScale;
      const ratioX = (anchor.x - current.x) / current.width;
      const ratioY = (anchor.y - current.y) / current.height;

      return clampViewBox({
        x: anchor.x - width * ratioX,
        y: anchor.y - height * ratioY,
        width,
        height,
      });
    });
  };

  // マウスホイール: 下スクロールで縮小、上スクロールで拡大
  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (!interactive) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 1.12 : 0.88);
  };

  // --- マウスドラッグによるパン(タッチはhandleTouch*側で処理するのでここでは除外) ---
  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || event.pointerType === "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox: activeViewBox,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || !panRef.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = ((event.clientX - panRef.current.clientX) / rect.width) * panRef.current.viewBox.width;
    const dy = ((event.clientY - panRef.current.clientY) / rect.height) * panRef.current.viewBox.height;
    setViewBox(
      clampViewBox({
        ...panRef.current.viewBox,
        x: panRef.current.viewBox.x - dx,
        y: panRef.current.viewBox.y - dy,
      })
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panRef.current = null;
  };

  // --- タッチ操作: 1本指でパン、2本指でピンチズーム ---
  const getTouchDistance = (touches: ReactTouchList) => {
    const first = touches.item(0);
    const second = touches.item(1);
    if (!first || !second) return 0;

    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const getTouchCenter = (touches: ReactTouchList) => {
    const first = touches.item(0);
    const second = touches.item(1);
    if (!first || !second) return null;

    return {
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2,
    };
  };

  const handleTouchStart = (event: ReactTouchEvent<SVGSVGElement>) => {
    if (!interactive) return;
    if (event.touches.length === 1) {
      const touch = event.touches.item(0);
      if (!touch) return;
      panRef.current = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        viewBox: activeViewBox,
      };
      pinchRef.current = null;
    } else if (event.touches.length === 2) {
      pinchRef.current = {
        distance: getTouchDistance(event.touches),
        viewBox: activeViewBox,
      };
      panRef.current = null;
    }
  };

  const handleTouchMove = (event: ReactTouchEvent<SVGSVGElement>) => {
    if (!interactive) return;
    event.preventDefault();

    if (event.touches.length === 1 && panRef.current) {
      const touch = event.touches.item(0);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!touch || !rect) return;

      const dx = ((touch.clientX - panRef.current.clientX) / rect.width) * panRef.current.viewBox.width;
      const dy = ((touch.clientY - panRef.current.clientY) / rect.height) * panRef.current.viewBox.height;
      setViewBox(
        clampViewBox({
          ...panRef.current.viewBox,
          x: panRef.current.viewBox.x - dx,
          y: panRef.current.viewBox.y - dy,
        })
      );
    } else if (event.touches.length === 2 && pinchRef.current) {
      const distance = getTouchDistance(event.touches);
      const center = getTouchCenter(event.touches);
      if (!distance || !center) return;
      zoomAt(center.x, center.y, pinchRef.current.distance / distance);
      pinchRef.current.distance = distance;
    }
  };

  const handleTouchEnd = () => {
    panRef.current = null;
    pinchRef.current = null;
  };

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`${activeViewBox.x} ${activeViewBox.y} ${activeViewBox.width} ${activeViewBox.height}`}
        className={`${viewMode === "focus-current" ? "w-full" : "min-w-[260px] w-full"} h-auto ${
          interactive ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <defs>
          <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 背景地図画像 */}
        <image
          href="/mapBackground-1.png"
          x={0}
          y={0}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* 接続パス (点線 / 実線) */}
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const cx = (p.x + next.x) / 2;
          const cy = (p.y + next.y) / 2 - 30; // 少し上側にカーブを描かせて地図の道っぽくする
          const completed = segmentCompleted(i);
          return (
            <path
              key={`segment-${i}`}
              d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${next.x} ${next.y}`}
              fill="none"
              stroke={completed ? "#58cc02" : "#a3a3a3"}
              strokeWidth={6}
              strokeDasharray={completed ? undefined : "4,12"}
              strokeLinecap="round"
            />
          );
        })}

        {/* スタート地点 */}
        <Puck
          x={startX}
          y={startY}
          r={NODE_RADIUS}
          colors={{ top: "#ffae00", base: "#e08e00", icon: "#ffffff" }}
          icon="🏁"
          iconSize={26}
        />
        <text
          x={startX}
          y={startY + NODE_RADIUS + PUCK_DEPTH + 20}
          textAnchor="middle"
          fontSize={14}
          fontWeight={800}
          fill="#5c3d00"
          className="select-none"
        >
          スタート
        </text>

        {/* 各チェックポイントノード（Puckを先に全描画してラベルが必ず上に来るようにする） */}
        {nodes.map((node) => {
          const isCurrent = node.status === "current";
          const nodeRadius = isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS;
          return (
            <Puck
              key={`puck-${node.checkpoint.id}`}
              x={node.x}
              y={node.y}
              r={nodeRadius}
              colors={nodeColor[node.status]}
              icon={nodeIcon[node.status]}
              iconSize={isCurrent ? 24 : 18}
              ringed={isCurrent}
            />
          );
        })}
        {nodes.map((node) => {
          const isCurrent = node.status === "current";
          const nodeRadius = isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS;
          const labelWidth = isCurrent ? CURRENT_LABEL_WIDTH : LABEL_WIDTH;
          const labelHeight = isCurrent ? CURRENT_LABEL_HEIGHT : LABEL_HEIGHT;
          const labelX = node.x - labelWidth / 2;
          const labelY = node.y - nodeRadius - labelHeight - 8;
          return (
            <foreignObject
              key={`label-${node.checkpoint.id}`}
              x={labelX}
              y={labelY}
              width={labelWidth}
              height={labelHeight}
            >
              <div
                title={node.checkpoint.title}
                className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-md h-full flex items-center justify-center px-2 py-1 leading-tight font-bold text-[#2C2C2C] ${
                  isCurrent
                    ? "border-2 border-[#1cb0f6] text-xs"
                    : "border border-amber-900/10 text-[10px]"
                }`}
              >
                <span className="overflow-hidden text-center [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {node.checkpoint.title}
                </span>
              </div>
            </foreignObject>
          );
        })}

        {/* ゴール地点 */}
        <Puck
          x={goalX}
          y={goalY}
          r={NODE_RADIUS}
          colors={{ top: "#ffc800", base: "#e0a800", icon: "#ffffff" }}
          icon="🏆"
          iconSize={26}
        />
        <text
          x={goalX}
          y={goalY - NODE_RADIUS - 12}
          textAnchor="middle"
          fontSize={14}
          fontWeight={800}
          fill="#5c3d00"
          className="select-none"
        >
          ゴール
        </text>
      </svg>
    </div>
  );
}
