// --- テーマ「シンプル」用のロードマップ表示(SVGで自作したすごろく風マップ) ---
// QuestMap.tsx(ファンタジー演出版)の簡易版。チェックポイントをジグザグに配置し、
// スタート→各チェックポイント→ゴールを曲線でつないで進捗を可視化する。
import { StatusItem } from "@/lib/questStatus";

// レイアウト計算に使う定数群(SVGのviewBoxサイズ・ノード間隔・左右の配置X座標など)
const VIEW_WIDTH = 320;
const VIEW_HEIGHT_PER_NODE = 110;
const TOP_MARGIN = 60;
const BOTTOM_MARGIN = 60;
const LEFT_X = 90;
const RIGHT_X = 230;
const CENTER_X = 160;
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

// 1つのチェックポイント/スタート/ゴールを表す円形の駒(ボードゲームのコマ風に立体的に見せる)。
// ステータスごとの色(nodeColor)とアイコン(nodeIcon)は上の対応表から渡される。
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
    <g filter="url(#node-shadow-simple)">
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

export default function QuestMapSimple({ items }: Props) {
  const count = items.length;
  // チェックポイント数に応じてSVG全体の縦幅を決める(下=スタート、上=ゴール、下から上へ進む)
  const height =
    TOP_MARGIN + BOTTOM_MARGIN + PUCK_DEPTH + VIEW_HEIGHT_PER_NODE * (count + 1);

  const startY = height - BOTTOM_MARGIN - PUCK_DEPTH;
  const goalY = TOP_MARGIN;
  const step = count > 0 ? (startY - goalY) / (count + 1) : 0;

  // 各チェックポイントを左右交互(ジグザグ)に配置し、下(スタート)から上(ゴール)へ等間隔に並べる
  const nodes = items.map((item, i) => ({
    ...item,
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: startY - step * (i + 1),
  }));

  // スタート→各ノード→ゴールを結ぶ曲線を描くための座標列
  const points = [
    { x: CENTER_X, y: startY },
    ...nodes.map((n) => ({ x: n.x, y: n.y })),
    { x: CENTER_X, y: goalY },
  ];

  const allCompleted = count > 0 && nodes.every((n) => n.status === "completed");

  // 区間(segment)ごとに、その手前のチェックポイントが完了済みなら実線・緑色にする
  const segmentCompleted = (segmentIndex: number) => {
    if (segmentIndex === count) return allCompleted;
    return nodes[segmentIndex]?.status === "completed";
  };

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} className="w-full" style={{ minHeight: 320 }}>
      <defs>
        <filter id="node-shadow-simple" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const cx = p.x;
        const cy = (p.y + next.y) / 2;
        const completed = segmentCompleted(i);
        return (
          <path
            key={`segment-${i}`}
            d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${next.x} ${next.y}`}
            fill="none"
            stroke={completed ? "#58cc02" : "#e5e5e5"}
            strokeWidth={5}
            strokeDasharray={completed ? undefined : "2,10"}
            strokeLinecap="round"
          />
        );
      })}

      <Puck
        x={CENTER_X}
        y={startY}
        r={NODE_RADIUS}
        colors={{ top: "#ffae00", base: "#e08e00", icon: "#ffffff" }}
        icon="🏁"
        iconSize={26}
      />
      <text
        x={CENTER_X}
        y={startY + NODE_RADIUS + PUCK_DEPTH + 20}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="#92400e"
      >
        スタート
      </text>

      {nodes.map((node) => {
        const colors = nodeColor[node.status];
        const labelOnLeft = node.x === RIGHT_X;
        const labelX = labelOnLeft
          ? node.x - NODE_RADIUS - 12 - LABEL_WIDTH
          : node.x + NODE_RADIUS + 12;
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
              y={node.y - LABEL_HEIGHT / 2}
              width={LABEL_WIDTH}
              height={LABEL_HEIGHT}
            >
              <div
                className="bg-white rounded-lg shadow-sm h-full flex items-center px-3 py-1 text-sm font-bold text-[#2C2C2C]"
                style={{
                  justifyContent: labelOnLeft ? "flex-end" : "flex-start",
                  textAlign: labelOnLeft ? "right" : "left",
                }}
              >
                <span className="truncate">{node.checkpoint.title}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}

      <Puck
        x={CENTER_X}
        y={goalY}
        r={NODE_RADIUS}
        colors={{ top: "#ffc800", base: "#e0a800", icon: "#ffffff" }}
        icon="🏆"
        iconSize={26}
      />
      <text
        x={CENTER_X}
        y={goalY - NODE_RADIUS - 12}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill="#92400e"
      >
        ゴール
      </text>
    </svg>
  );
}
