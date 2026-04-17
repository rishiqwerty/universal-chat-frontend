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
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
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

export type ProviderModels = {
  provider: string;
  text_models: string[];
  image_models?: string[];
};

export async function getAvailableModels(): Promise<ProviderModels[]> {
  const { data } = await client.get("/chat/models");
  return data;
}

export async function createConversation(title: string): Promise<Conversation> {
  const { data } = await client.post("/chat/conversations", { title });
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await client.delete(`/chat/conversations/${id}`);
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  await client.delete(`/chat/conversations/${conversationId}/messages/${messageId}`);
}

export async function updateConversationTitle(id: string, title: string): Promise<Conversation> {
  const { data } = await client.put(`/chat/conversations/${id}`, { title });
  return data;
}

export type ApiMessage = {
  id: string;
  conversation_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  provider: string;
  model: string;
  is_complete: boolean;
  images?: string[];
  created_at: string;
};

export async function getConversationDetails(id: string): Promise<Conversation> {
  const { data } = await client.get(`/chat/conversations/${id}`);
  return data;
}

export async function getConversationMessages(id: string): Promise<ApiMessage[]> {
  const { data } = await client.get(`/chat/conversations/${id}/messages`);
  return data;
}

export async function sendMessageStream(
  conversationId: string,
  message: string,
  provider: string,
  model: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${apiRoot}/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      provider,
      model,
      message,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("access_token");
      clearChatCache();
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }

    let errorMsg = `Server error (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || errorMsg;
      if (typeof errorMsg !== "string") {
        errorMsg = JSON.stringify(errorMsg);
      }
    } catch {
      // Not JSON or no detail field
    }
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines (each terminated by \n\n)
    const lines = buffer.split("\n");
    buffer = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // If this is the last element and doesn't end with newline, it's partial — re-buffer
      if (i === lines.length - 1 && line !== "") {
        buffer = lines[i];
        break;
      }

      if (!line.startsWith("data: ")) continue;

      const payload = line.slice(6); // strip "data: "

      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch (e: any) {
        if (e instanceof Error && e.message !== "Unexpected string in JSON..." && e.message !== "Unexpected token") {
          throw e; // re-throw intentional errors like parsed.error
        }
        // ignore malformed JSON chunks
      }
    }
  }
}

export async function sendTempChatMessageStream(
  messages: UnifiedMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${apiRoot}/chat/temp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
    signal,
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (i === lines.length - 1 && line !== "" && !line.endsWith("\n") && lines.length > 1) {
        buffer = lines[i];
        break;
      }
      if (!line) continue;
      onChunk(line);
    }
  }
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

export type ApiKey = {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  created_at: string;
};

export async function getApiKeys(): Promise<ApiKey[]> {
  const { data } = await client.get("/api-keys");
  return data;
}

export async function addApiKey(provider: string, apiKey: string, label: string): Promise<void> {
  await client.post("/api-keys", { provider, api_key: apiKey, label });
}

export async function removeApiKey(id: string): Promise<void> {
  await client.delete(`/api-keys/${id}`);
}

export async function activateApiKey(id: string): Promise<ApiKey> {
  const { data } = await client.patch(`/api-keys/${id}/activate`);
  return data;
}

export async function toggleApiKey(id: string): Promise<ApiKey> {
  const { data } = await client.patch(`/api-keys/${id}/toggle`);
  return data;
}

export function resolveImagePath(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export { client };
