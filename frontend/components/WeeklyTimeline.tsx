import { QuestDetail } from "@/lib/api";

type TimelineItem = {
  questId: string;
  questTitle: string;
  checkpointId: string;
  title: string;
  dueDate: string;
  overdue: boolean;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
};

type Props = {
  quests: QuestDetail[];
};

export default function WeeklyTimeline({ quests }: Props) {
  const today = new Date(new Date().toDateString());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const items: TimelineItem[] = quests
    .flatMap((q) =>
      q.checkpoints
        .filter((cp) => !cp.completed_at && cp.due_date)
        .map((cp) => ({
          questId: q.id,
          questTitle: q.title,
          checkpointId: cp.id,
          title: cp.title,
          dueDate: cp.due_date as string,
          overdue: new Date(cp.due_date as string) < today,
        }))
    )
    .filter((item) => item.overdue || new Date(item.dueDate) < weekEnd)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (items.length === 0) {
    return (
      <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-5 text-center">
        <p className="text-sm text-[#888888]">📅 今週・期日超過のタスクはありません。</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-5">
      <p className="text-xs font-bold text-[#2D6A4F] tracking-widest uppercase mb-3">
        📅 今週のタスク
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.checkpointId}
            className="flex items-center gap-3 bg-[#F5F0E8] shadow-neumorphism-sm rounded-xl px-3 py-2"
          >
            <span
              className={`text-xs font-bold rounded-full px-2 py-1 shrink-0 ${
                item.overdue ? "bg-[#E05252] text-white" : "bg-[#2D6A4F] text-white"
              }`}
            >
              {item.overdue ? "期日超過" : formatDate(item.dueDate)}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-[#2C2C2C] truncate">{item.title}</p>
              <p className="text-xs text-[#888888] truncate">{item.questTitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
