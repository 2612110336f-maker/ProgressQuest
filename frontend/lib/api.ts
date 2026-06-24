import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
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

export type Checkpoint = {
  id: string;
  quest_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  order_index: number | null;
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

export const createCheckpoint = async (
  questId: string,
  data: { title: string; description?: string; due_date?: string; order_index?: number }
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
  }>
): Promise<Checkpoint> => {
  const res = await api.patch(`/checkpoints/${id}`, data);
  return res.data;
};

export const deleteCheckpoint = async (id: string) => {
  const res = await api.delete(`/checkpoints/${id}`);
  return res.data;
};

export default api;
