import { Checkpoint } from "@/lib/api";

export type CheckpointStatus = "completed" | "current" | "overdue" | "future";

export const isOverdue = (dueDate: string | null) =>
  !!dueDate && new Date(dueDate) < new Date(new Date().toDateString());

export type StatusItem = { checkpoint: Checkpoint; status: CheckpointStatus };

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
