import { StatusItem } from "@/lib/questStatus";

const VIEW_WIDTH = 1451;
const VIEW_HEIGHT = 816;

const NODE_RADIUS = 28;
const PUCK_DEPTH = 7;
const LABEL_WIDTH = 130;
const LABEL_HEIGHT = 30;

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
};

export default function QuestMap({ items }: Props) {
  const count = items.length;

  // 右下 (X: 1300, Y: 700付近) から左上 (X: 150, Y: 150付近) へ大まかに進む座標テンプレート
  // アイテム数(count)に応じて、ここから座標を割り当てます。
  // 必要に応じて座標の数値を微調整してください。
  const basePositions = [
    { x: 1250, y: 680 }, // 1つ目のノード (右下付近)
    { x: 1100, y: 550 },
    { x: 950,  y: 620 },
    { x: 800,  y: 480 },
    { x: 680,  y: 530 },
    { x: 550,  y: 380 },
    { x: 420,  y: 420 },
    { x: 300,  y: 280 }, // Nつ目のノード (左上へ向かう途中)
  ];

  // スタート地点（右下端）
  const startX = 1350;
  const startY = 740;

  // ゴール地点（左上端）
  const goalX = 150;
  const goalY = 150;

  // 動的に生成されたノードに手動の座標をマッピング
  const nodes = items.map((item, i) => {
    // テンプレート座標が足りない場合は、最後の座標から左上に向けて等間隔で補間
    const pos = basePositions[i] || {
      x: Math.max(goalX, 300 - (i - basePositions.length) * 80),
      y: Math.max(goalY, 280 - (i - basePositions.length) * 60)
    };
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

  const segmentCompleted = (segmentIndex: number) => {
    if (segmentIndex === count) return allCompleted;
    return nodes[segmentIndex]?.status === "completed";
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="min-w-[1000px] w-full h-auto"
      >
        <defs>
          <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 背景地図画像 */}
        <image
          href="/001.png"
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

        {/* 各チェックポイントノード */}
        {nodes.map((node) => {
          const colors = nodeColor[node.status];
          // ラベルはノードの少し上に表示（左右ジグザグではなくなったため）
          const labelX = node.x - LABEL_WIDTH / 2;
          const labelY = node.y - NODE_RADIUS - 30;
          return (
            <g key={node.checkpoint.id}>
              <Puck
                x={node.x}
                y={node.y}
                r={NODE_RADIUS}
                colors={colors}
                icon={nodeIcon[node.status]}
                ringed={node.status === "current"}
              />
              <foreignObject
                x={labelX}
                y={labelY}
                width={LABEL_WIDTH}
                height={LABEL_HEIGHT}
              >
                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-amber-900/10 h-full flex items-center justify-center px-2 py-0.5 text-xs font-bold text-[#2C2C2C]">
                  <span className="truncate">{node.checkpoint.title}</span>
                </div>
              </foreignObject>
            </g>
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
