// --- チェックポイントの表示ステータス判定ロジック ---
// QuestMap/QuestMapSimple/WeeklyTimelineなど、ロードマップを可視化する
// 複数コンポーネントから共通利用される。バックエンドはcompleted_at/due_dateしか
// 持たないため、フロント側で「今どのチェックポイントに取り組むべきか」を算出する。
import { Checkpoint } from "@/lib/api";

export type CheckpointStatus = "completed" | "current" | "overdue" | "future";

// due_dateが「今日の日付の0時」より前なら期日超過とみなす(時刻部分は無視して日付だけで比較)。
export const isOverdue = (dueDate: string | null) =>
  !!dueDate && new Date(dueDate) < new Date(new Date().toDateString());

export type StatusItem = { checkpoint: Checkpoint; status: CheckpointStatus };

// order_index順に並べ、未完了(completed_atがない)チェックポイントのうち
// 最初の1つだけを"current"(今取り組むべきもの)とし、以降は"future"、
// 期日超過は"overdue"として優先的に判定する。
export const getCheckpointStatuses = (checkpoints: Checkpoint[]): StatusItem[] => {
  const sorted = [...checkpoints].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const currentIndex = sorted.findIndex((cp) => !cp.completed_at);
  return sorted.map((checkpoint, i) => {
    let status: CheckpointStatus;
    if (checkpoint.completed_at) {
      status = "completed";
    } else if (isOverdue(checkpoint.due_date)) {
      status = "overdue";
    } else if (i === currentIndex) {
      status = "current";
    } else {
      status = "future";
    }
    return { checkpoint, status };
  });
};
