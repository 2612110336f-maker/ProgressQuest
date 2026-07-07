// --- バックエンドAPIクライアント集約ファイル ---
// AGENTS.mdの規約「APIクライアントはlib/api.tsに集約する」に従い、
// axiosインスタンス1つと、エンドポイントごとの関数・型をすべてここにまとめている。
// 各page/componentはこのファイルの関数をimportして呼ぶだけでよい。
import axios from "axios";

// NEXT_PUBLIC_API_URL未設定時はローカルのFastAPI(uvicorn)を向く。
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// SSR時(typeof window === "undefined")はlocalStorageが無いのでnullを返す。
const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

// 全リクエストに共通してAuthorizationヘッダーを付与するインターセプター。
// login()成功時にlocalStorageへ保存したJWT(backend/auth.py参照)をここで自動添付する。
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 認証系(backend/main.pyの/auth/*に対応) ---
export const register = async (email: string, password: string) => {
  const res = await api.post("/auth/register", { email, password });
  return res.data;
};

export const login = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
};

// トークンをクエリパラメータで渡す実装(backend側がGET /auth/me?token=...を想定しているため)
export const getMe = async (): Promise<{ id: string; email: string }> => {
  const token = getStoredToken();
  const res = await api.get("/auth/me", { params: { token } });
  return res.data;
};

// --- 型定義: backend/schemas.pyのCheckpointOut/QuestOutに対応 ---
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

// --- ロードマップ(Quest)CRUD: backend/routers/quests.pyに対応 ---
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

// --- チェックポイントCRUD: backend/routers/checkpoints.pyに対応 ---
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

// --- Gemini AI連携: Core AI Flowの3ステップ(AGENTS.md参照、backend/routers/ai.pyに対応) ---
// new/page.tsx(新規作成フロー)がdiagnose→proposeDeadline→generateRoadmapの順に呼ぶ。
export type DiagnoseQuestion = {
  id: string;
  text: string;
  options: string[];
};

// Step1: 目標と希望期日から診断質問一覧を取得
export const diagnose = async (
  goal: string,
  desired_deadline: string,
  context?: string
): Promise<{ questions: DiagnoseQuestion[] }> => {
  const res = await api.post("/ai/diagnose", { goal, desired_deadline, context });
  return res.data;
};

// Step2: 診断の回答から現実的な期日を提案してもらう
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

// Step3: 確定期日と診断要約からチェックポイント列(ロードマップ)を生成してもらう
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

// --- LINE連携: backend/routers/line.pyに対応 ---
export const getLineStatus = async (): Promise<{ linked: boolean }> => {
  const res = await api.get("/line/status");
  return res.data;
};

// 連携用の6桁コードを発行してもらう。ユーザーはこのコードをLINE公式アカウントに送信して紐付ける。
export const createLineLinkCode = async (): Promise<{ code: string; linked: boolean }> => {
  const res = await api.post("/line/link-code");
  return res.data;
};

export default api;
