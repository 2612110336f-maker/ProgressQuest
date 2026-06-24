import { StatusItem } from "@/lib/questStatus";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT_PER_NODE = 90;
const TOP_MARGIN = 50;
const BOTTOM_MARGIN = 50;
const LEFT_X = 90;
const RIGHT_X = 230;
const CENTER_X = 160;
const NODE_RADIUS = 24;

type GradientStop = { light: string; dark: string };

const nodeGradient: Record<StatusItem["status"], GradientStop> = {
  completed: { light: "#86efac", dark: "#16a34a" },
  current: { light: "#93c5fd", dark: "#2563eb" },
  overdue: { light: "#fca5a5", dark: "#dc2626" },
  future: { light: "#e5e7eb", dark: "#9ca3af" },
};

const nodeIcon: Record<StatusItem["status"], string> = {
  completed: "✓",
  current: "⚔",
  overdue: "⚠",
  future: "🔒",
};

type Props = {
  items: StatusItem[];
};

export default function QuestMap({ items }: Props) {
  const count = items.length;
  const height = TOP_MARGIN + BOTTOM_MARGIN + VIEW_HEIGHT_PER_NODE * (count + 1);

  const startY = height - BOTTOM_MARGIN;
  const goalY = TOP_MARGIN;
  const step = count > 0 ? (startY - goalY) / (count + 1) : 0;

  const nodes = items.map((item, i) => ({
    ...item,
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: startY - step * (i + 1),
  }));

  const points = [
    { x: CENTER_X, y: startY },
    ...nodes.map((n) => ({ x: n.x, y: n.y })),
    { x: CENTER_X, y: goalY },
  ];

  const allCompleted = count > 0 && nodes.every((n) => n.status === "completed");

  // segment i connects points[i] -> points[i+1]; it's "walked" (green) once
  // the node it arrives at (or, for the final segment, the whole quest) is complete.
  const segmentCompleted = (segmentIndex: number) => {
    if (segmentIndex === count) return allCompleted;
    return nodes[segmentIndex]?.status === "completed";
  };

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} className="w-full" style={{ minHeight: 320 }}>
      <defs>
        {Object.entries(nodeGradient).map(([status, { light, dark }]) => (
          <radialGradient key={status} id={`grad-${status}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={dark} />
          </radialGradient>
        ))}
        <radialGradient id="grad-start" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        <radialGradient id="grad-goal" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </radialGradient>
        <radialGradient id="grad-island" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ecfccb" />
          <stop offset="100%" stopColor="#d9f99d" />
        </radialGradient>
      </defs>

      <ellipse
        cx={CENTER_X}
        cy={height / 2}
        rx={VIEW_WIDTH / 2 - 6}
        ry={height / 2 - 10}
        fill="url(#grad-island)"
        opacity={0.5}
      />

      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const cx = p.x;
        const cy = (p.y + next.y) / 2;
        const completed = segmentCompleted(i);
        return (
          <g key={`segment-${i}`}>
            <path
              d={`M ${p.x} ${p.y + 2} Q ${cx} ${cy + 2} ${next.x} ${next.y + 2}`}
              fill="none"
              stroke="#00000022"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${next.x} ${next.y}`}
              fill="none"
              stroke={completed ? "#4ade80" : "#d1d5db"}
              strokeWidth={4}
              strokeDasharray={completed ? undefined : "6,4"}
              strokeLinecap="round"
            />
          </g>
        );
      })}

      <ellipse
        cx={CENTER_X}
        cy={startY + NODE_RADIUS * 0.85}
        rx={NODE_RADIUS * 1.15}
        ry={NODE_RADIUS * 0.4}
        fill="#00000025"
      />
      <circle cx={CENTER_X} cy={startY} r={NODE_RADIUS} fill="url(#grad-start)" />
      <text x={CENTER_X} y={startY + 5} textAnchor="middle" fontSize={18}>
        🏁
      </text>
      <text x={CENTER_X} y={startY + NODE_RADIUS + 16} textAnchor="middle" fontSize={12} fill="#92400e">
        スタート
      </text>

      {nodes.map((node) => {
        const labelX = node.x === LEFT_X ? node.x + NODE_RADIUS + 8 : node.x - NODE_RADIUS - 8;
        const labelAnchor = node.x === LEFT_X ? "start" : "end";
        return (
          <g key={node.checkpoint.id}>
            <ellipse
              cx={node.x}
              cy={node.y + NODE_RADIUS * 0.85}
              rx={NODE_RADIUS * 1.15}
              ry={NODE_RADIUS * 0.4}
              fill="#00000025"
            />
            {node.status === "current" && (
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS + 7}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={2}
                opacity={0.5}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill={`url(#grad-${node.status})`}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <ellipse
              cx={node.x - NODE_RADIUS * 0.35}
              cy={node.y - NODE_RADIUS * 0.4}
              rx={NODE_RADIUS * 0.4}
              ry={NODE_RADIUS * 0.25}
              fill="#ffffff"
              opacity={0.35}
            />
            <text x={node.x} y={node.y + 6} textAnchor="middle" fontSize={18}>
              {nodeIcon[node.status]}
            </text>
            <text
              x={labelX}
              y={node.y + 5}
              textAnchor={labelAnchor}
              fontSize={12}
              fill="#475569"
            >
              {node.checkpoint.title}
            </text>
          </g>
        );
      })}

      <ellipse
        cx={CENTER_X}
        cy={goalY + NODE_RADIUS * 0.85}
        rx={NODE_RADIUS * 1.15}
        ry={NODE_RADIUS * 0.4}
        fill="#00000025"
      />
      <circle cx={CENTER_X} cy={goalY} r={NODE_RADIUS} fill="url(#grad-goal)" />
      <text x={CENTER_X} y={goalY + 5} textAnchor="middle" fontSize={18}>
        🏆
      </text>
      <text x={CENTER_X} y={goalY - NODE_RADIUS - 8} textAnchor="middle" fontSize={12} fill="#92400e">
        ゴール
      </text>
    </svg>
  );
}
