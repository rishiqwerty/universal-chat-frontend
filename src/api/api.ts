import axios from "axios";
import { getApiBaseUrl } from "../config";

const apiRoot = `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1`;

const client = axios.create({
  baseURL: apiRoot,
  timeout: 10000,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("access_token");
      clearChatCache();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export async function mockChatReply(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  return `Echo: ${prompt}`;
}

export type SignupPayload = {
  email: string;
  password: string;
};

export async function signupAccount(payload: SignupPayload): Promise<void> {
  await client.post("/auth/register", payload);
}

export async function loginAccount(payload: SignupPayload): Promise<string> {
  const { data } = await client.post("/auth/login", payload);
  return data.access_token;
}

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
};

export async function createConversation(title: string): Promise<Conversation> {
  const { data } = await client.post("/chat/conversations", { title });
  return data;
}

export async function updateConversationTitle(id: string, title: string): Promise<Conversation> {
  const { data } = await client.put(`/chat/conversations/${id}`, { title });
  return data;
}

let cachedRecentChats: Conversation[] | null = null;

export function clearChatCache() {
  cachedRecentChats = null;
}

export async function getRecentConversations(forceRefresh = false): Promise<Conversation[]> {
  if (cachedRecentChats && !forceRefresh) return cachedRecentChats;
  const { data } = await client.get("/chat/conversations?limit=5");
  cachedRecentChats = data;
  return data;
}

export { client };
