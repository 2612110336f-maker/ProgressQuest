import React from "react";
import { motion } from "framer-motion";
import { Checkpoint } from "@/lib/api";
import { isOverdue } from "@/lib/questStatus";

interface TimelineProps {
  checkpoints: Checkpoint[];
  onToggleComplete: (cp: Checkpoint) => void;
  onDelete: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  checkpoints,
  onToggleComplete,
  onDelete,
}) => {
  const sorted = [...checkpoints].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div className="relative pl-6 border-l-2 border-slate-700 space-y-6 py-2">
      {sorted.map((cp, idx) => {
        const completed = !!cp.completed_at;
        const overdue = !completed && cp.due_date ? isOverdue(cp.due_date) : false;

        return (
          <motion.div
            key={cp.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative"
          >
            {/* タイムラインのノード点 */}
            <div
              className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                completed
                  ? "bg-success border-success shadow-[0_0_8px_#22C55E]"
                  : overdue
                  ? "bg-danger border-danger animate-pulse shadow-[0_0_10px_#EF4444]"
                  : "bg-slate-900 border-slate-500"
              }`}
            />

            {/* コンテンツカード */}
            <div className="bg-card border border-border rounded-xl p-4 hover:border-slate-500 transition-all shadow-lg">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => onToggleComplete(cp)}
                    className="w-5 h-5 rounded border-slate-600 text-primary focus:ring-primary bg-slate-800 accent-primary cursor-pointer shrink-0"
                  />
                  <div>
                    <h4
                      className={`font-bold font-display text-sm sm:text-base ${
                        completed ? "text-slate-500 line-through font-normal" : "text-slate-100"
                      }`}
                    >
                      {cp.title}
                    </h4>
                    {cp.description && (
                      <p className="text-xs text-slate-400 mt-1">{cp.description}</p>
                    )}
                    {cp.due_date && (
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${
                          overdue
                            ? "bg-danger/20 text-danger border border-danger/30"
                            : "bg-slate-850 text-slate-400 border border-slate-700"
                        }`}
                      >
                        期日: {cp.due_date} {overdue && "⚠️ 期限切れ"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(cp.id)}
                  className="text-xs text-slate-500 hover:text-danger transition px-2 py-1"
                >
                  削除
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Timeline;
