import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = async (email: string, password: string) => {
  const res = await api.post("/auth/register", { email, password });
  return res.data;
};

export const login = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
};

export const getMe = async (): Promise<{ id: string; email: string }> => {
  const token = localStorage.getItem("token");
  const res = await api.get("/auth/me", { params: { token } });
  return res.data;
};

export type Checkpoint = {
  id: string;
  quest_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  order_index: number | null;
  estimated_hours: number | null;
};

export type Quest = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  original_deadline: string | null;
  final_deadline: string | null;
  diagnosis_result: unknown;
  created_at: string;
  archived_at: string | null;
};

export type QuestDetail = Quest & {
  checkpoints: Checkpoint[];
};

export const getQuests = async (): Promise<Quest[]> => {
  const res = await api.get("/quests");
  return res.data;
};

export const getQuest = async (id: string): Promise<QuestDetail> => {
  const res = await api.get(`/quests/${id}`);
  return res.data;
};

export const createQuest = async (data: {
  title: string;
  description?: string;
  original_deadline?: string;
  final_deadline?: string;
}): Promise<Quest> => {
  const res = await api.post("/quests", data);
  return res.data;
};

export const updateQuest = async (
  id: string,
  data: Partial<{
    title: string;
    description: string;
    original_deadline: string;
    final_deadline: string;
  }>
): Promise<Quest> => {
  const res = await api.patch(`/quests/${id}`, data);
  return res.data;
};

export const deleteQuest = async (id: string) => {
  const res = await api.delete(`/quests/${id}`);
  return res.data;
};

export const trashQuest = async (id: string): Promise<Quest> => {
  const res = await api.post(`/quests/${id}/trash`);
  return res.data;
};

export const restoreQuest = async (id: string): Promise<Quest> => {
  const res = await api.post(`/quests/${id}/restore`);
  return res.data;
};

export const getTrashedQuests = async (): Promise<Quest[]> => {
  const res = await api.get("/quests/trash");
  return res.data;
};

export const createCheckpoint = async (
  questId: string,
  data: {
    title: string;
    description?: string;
    due_date?: string;
    order_index?: number;
    estimated_hours?: number;
  }
): Promise<Checkpoint> => {
  const res = await api.post(`/quests/${questId}/checkpoints`, data);
  return res.data;
};

export const updateCheckpoint = async (
  id: string,
  data: Partial<{
    title: string;
    description: string;
    due_date: string;
    order_index: number;
    completed: boolean;
    estimated_hours: number;
  }>
): Promise<Checkpoint> => {
  const res = await api.patch(`/checkpoints/${id}`, data);
  return res.data;
};

export const deleteCheckpoint = async (id: string) => {
  const res = await api.delete(`/checkpoints/${id}`);
  return res.data;
};

export type DiagnoseQuestion = {
  id: string;
  text: string;
  options: string[];
};

export const diagnose = async (
  goal: string,
  desired_deadline: string,
  context?: string
): Promise<{ questions: DiagnoseQuestion[] }> => {
  const res = await api.post("/ai/diagnose", { goal, desired_deadline, context });
  return res.data;
};

export const proposeDeadline = async (
  goal: string,
  desired_deadline: string,
  answers: { question_id: string; answer: string }[]
): Promise<{ proposed_deadline: string; reason: string; diagnosis_summary: string }> => {
  const res = await api.post("/ai/propose-deadline", {
    goal,
    desired_deadline,
    answers,
  });
  return res.data;
};

export type RoadmapCheckpoint = {
  title: string;
  description: string;
  due_date: string;
  order_index: number;
  estimated_hours: number;
  deliverable: string;
};

export const generateRoadmap = async (
  goal: string,
  final_deadline: string,
  diagnosis_summary: string
): Promise<{ checkpoints: RoadmapCheckpoint[] }> => {
  const res = await api.post("/ai/generate-roadmap", {
    goal,
    final_deadline,
    diagnosis_summary,
  });
  return res.data;
};

export const getLineStatus = async (): Promise<{ linked: boolean }> => {
  const res = await api.get("/line/status");
  return res.data;
};

export const createLineLinkCode = async (): Promise<{ code: string; linked: boolean }> => {
  const res = await api.post("/line/link-code");
  return res.data;
};

export default api;
