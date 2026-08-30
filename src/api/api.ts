import axios from "axios";
import { getApiBaseUrl } from "../config";
import { forceLogout } from "../context/AuthContext";

const apiRoot = `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1`;

const client = axios.create({
  baseURL: apiRoot,
  timeout: 60000,
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
  async (error) => {
    const config = error.config;
    
    // Check if error is due to cold-start / sleeping GCP server / transient network reset
    const status = error.response?.status;
    const isColdStartOrTransient =
      !error.response ||
      error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK" ||
      error.message?.toLowerCase().includes("network error") ||
      [502, 503, 504, 520, 521, 522, 524].includes(status);

    const maxRetries = 3;
    const currentRetry = config?.__retryCount || 0;

    if (config && isColdStartOrTransient && currentRetry < maxRetries) {
      config.__retryCount = currentRetry + 1;
      // Exponential backoff: 1.2s, 2.5s, 4.5s
      const backoffDelay = [1200, 2500, 4500][currentRetry] || 3000;
      await new Promise((r) => setTimeout(r, backoffDelay));
      return client(config);
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      forceLogout();
      clearChatCache();
    }
    return Promise.reject(error);
  }
);

/**
 * Resilient fetch wrapper with automatic exponential backoff retry for cold starts
 * before streaming responses begin.
 */
async function fetchWithStreamRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const response = await fetch(url, options);

      // If gateway is cold-starting (502, 503, 504), retry with backoff
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
        const delay = [1500, 3000, 5000][attempt] || 3000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (options.signal?.aborted || err.name === "AbortError") {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = [1500, 3000, 5000][attempt] || 3000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to connect to chat service. Please retry.");
}

export async function pingServerHealth(): Promise<boolean> {
  const root = getApiBaseUrl().replace(/\/+$/, "");
  try {
    await axios.get(`${root}/health`, { timeout: 15000 });
    return true;
  } catch {
    try {
      await axios.get(`${root}/api/v1/chat/models`, { timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }
}

export async function mockChatReply(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  return `Echo: ${prompt}`;
}

export type SignupPayload = {
  email: string;
  password: string;
};

export async function signupAccount(payload: SignupPayload): Promise<void> {
  await client.post("/auth/register", payload, { timeout: 45000 });
}

export async function loginAccount(payload: SignupPayload): Promise<string> {
  const { data } = await client.post("/auth/login", payload, { timeout: 45000 });
  return data.access_token;
}

export async function googleLoginAccount(credential: string): Promise<string> {
  const { data } = await client.post("/auth/google", { credential }, { timeout: 45000 });
  return data.access_token;
}

export async function requestOtpApi(email: string, purpose: string = "login"): Promise<{ message: string; email: string }> {
  const { data } = await client.post("/auth/request-otp", { email, purpose }, { timeout: 45000 });
  return data;
}

export async function verifyOtpApi(email: string, code: string): Promise<string> {
  const { data } = await client.post("/auth/verify-otp", { email, code }, { timeout: 45000 });
  return data.access_token;
}

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  image?: string | null;
  image_url?: string | null;
  avatar?: string | null;
  bio: string | null;
  preferences: Record<string, any> | null;
  credits: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type UserProfileUpdate = {
  full_name?: string | null;
  avatar_url?: string | null;
  image?: string | null;
  image_url?: string | null;
  avatar?: string | null;
  bio?: string | null;
  preferences?: Record<string, any> | null;
};

export async function getUserProfile(): Promise<UserProfile> {
  let res;
  try {
    res = await client.get("/auth/users/me");
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        res = await client.get("/auth/profile");
      } catch {
        res = await client.get("/auth/me");
      }
    } else {
      throw err;
    }
  }
  const data = res.data;
  const resolvedAvatar = data.avatar_url || data.image_url || data.image || data.avatar || null;
  return {
    ...data,
    avatar_url: resolvedAvatar,
  };
}

export async function updateUserProfile(payload: UserProfileUpdate): Promise<UserProfile> {
  const resolvedAvatar = payload.avatar_url ?? payload.image_url ?? payload.image ?? payload.avatar;
  const body: Record<string, any> = {};

  if (payload.full_name !== undefined) {
    body.full_name = payload.full_name ? payload.full_name.trim().slice(0, 255) : null;
  }
  if (resolvedAvatar !== undefined) {
    body.avatar_url = resolvedAvatar ? resolvedAvatar.trim().slice(0, 500) : null;
  }
  if (payload.bio !== undefined) {
    body.bio = payload.bio ? payload.bio.trim().slice(0, 1000) : null;
  }
  if (payload.preferences !== undefined) {
    body.preferences = payload.preferences;
  }

  let res;
  try {
    res = await client.put("/auth/profile", body);
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      try {
        res = await client.patch("/auth/users/me", body);
      } catch {
        res = await client.put("/auth/me", body);
      }
    } else {
      throw err;
    }
  }
  const data = res.data;
  return {
    ...data,
    avatar_url: data.avatar_url || data.image_url || data.image || data.avatar || null,
  };
}

export async function uploadUserAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post("/auth/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return {
    ...data,
    avatar_url: data.avatar_url || data.image_url || data.image || data.avatar || null,
  };
}

export type Conversation = {
  id: string;
  title: string;
  user_id?: string;
  is_starred?: boolean;
  is_archived?: boolean;
  summary?: string;
  updatedAt?: string;
  created_at?: string;
};

export type ProviderModels = {
  provider: string;
  display_name?: string;
  is_free?: boolean;
  is_byok_configured?: boolean;
  text_models: string[];
  image_models?: string[];
  premium_models?: string[];
  status?: "online" | "degraded" | "offline";
  reachable?: boolean;
  latency_ms?: number;
  speed_tier?: "fast" | "moderate" | "slow";
  speed_label?: string;
  est_tps?: number;
  model_speeds?: Record<string, number>;
  reachable_models?: string[];
};

export type ModelHealthResponse = {
  status: "operational" | "degraded" | "offline";
  checked_at: string;
  providers: Record<
    string,
    {
      status: "online" | "degraded" | "offline";
      reachable: boolean;
      latency_ms: number;
      error?: string;
    }
  >;
};

export async function fetchModelHealth(): Promise<ModelHealthResponse> {
  const { data } = await client.get("/models/health");
  return data;
}

export async function getAvailableModels(): Promise<ProviderModels[]> {
  const { data } = await client.get("/chat/models");
  if (!Array.isArray(data)) return [];
  // Ensure duplicates (e.g. gemini_free and gemini) are merged into one canonical provider
  const { mergeProviderModels } = await import("../utils/modelUtils");
  return mergeProviderModels(data);
}

export type OpenRouterModel = {
  id: string;
  name: string;
  context_length?: number;
};

export async function searchOpenRouterModels(query: string): Promise<OpenRouterModel[]> {
  const { data } = await client.get("/chat/models/search", { params: { q: query } });
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
  clearChatCache();
  return data;
}

export async function starConversation(id: string): Promise<Conversation> {
  const { data } = await client.post(`/chat/conversations/${id}/star`);
  clearChatCache();
  return data;
}

export async function unstarConversation(id: string): Promise<Conversation> {
  const { data } = await client.post(`/chat/conversations/${id}/unstar`);
  clearChatCache();
  return data;
}

export async function archiveConversation(id: string): Promise<Conversation> {
  const { data } = await client.post(`/chat/conversations/${id}/archive`);
  clearChatCache();
  return data;
}

export async function unarchiveConversation(id: string): Promise<Conversation> {
  const { data } = await client.post(`/chat/conversations/${id}/unarchive`);
  clearChatCache();
  return data;
}

export async function patchConversation(
  id: string,
  update: { title?: string; is_starred?: boolean; is_archived?: boolean }
): Promise<Conversation> {
  const { data } = await client.patch(`/chat/conversations/${id}`, update);
  clearChatCache();
  return data;
}

export async function getConversations(params?: {
  limit?: number;
  is_archived?: boolean;
  is_starred?: boolean;
}): Promise<Conversation[]> {
  const { data } = await client.get("/chat/conversations", { params });
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
  provider_metadata?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  created_at: string;
};

export type UnifiedMessage = {
  role: "system" | "user" | "assistant";
  content: string;
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
  const response = await fetchWithStreamRetry(`${apiRoot}/chat/conversations/${conversationId}/messages`, {
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
      forceLogout();
      clearChatCache();
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
  const response = await fetchWithStreamRetry(`${apiRoot}/chat/temp`, {
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      onChunk(chunk);
    }
  }
}
export type CreditBalance = {
  balance: number;
};

export type CreditTransaction = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
};

export async function getCreditBalance(): Promise<CreditBalance> {
  const { data } = await client.get("/credits/balance");
  return data;
}

export type CheckoutResponse = {
  checkout_url: string;
};

export type CreditPlan = {
  id: string;
  amount: number;
  price: number;
  currency: string;
  label: string;
  description: string;
};

export async function fetchCreditPlans(): Promise<CreditPlan[]> {
  const { data } = await client.get("/credits/plans");
  return data;
}

export type RazorpayOrderResponse = {
  order_id: string;
  id: string;
  amount: number;
  currency: string;
  key_id: string;
  transaction_id: string;
  credits: number;
  plan?: CreditPlan;
  checkout_url?: string;
};

export type VerifyPaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  message: string;
  credits_added: number;
  new_balance: number;
  transaction_id?: string;
};

export async function createPaymentOrder(params: { amount?: number; plan_id?: string; currency?: string }): Promise<RazorpayOrderResponse> {
  const { data } = await client.post("/credits/payment/create-order", params);
  return data;
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
  const { data } = await client.post("/credits/payment/verify-payment", payload);
  return data;
}

export async function topupCredits(amount: number, redirectUrl?: string): Promise<CheckoutResponse> {
  const { data } = await client.post("/credits/topup", { amount, redirect_url: redirectUrl });
  return data;
}

export async function getCreditTransactions(): Promise<CreditTransaction[]> {
  const { data } = await client.get("/credits/transactions");
  return data;
}
let cachedRecentChats: Conversation[] | null = null;

export function clearChatCache() {
  cachedRecentChats = null;
}

export async function getRecentConversations(forceRefresh = false): Promise<Conversation[]> {
  if (cachedRecentChats && !forceRefresh) return cachedRecentChats;
  const { data } = await client.get("/chat/conversations", {
    params: { limit: 50, is_archived: false },
  });
  cachedRecentChats = data;
  return data;
}

export type ApiKey = {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  base_url?: string;
  created_at: string;
};

export async function getApiKeys(): Promise<ApiKey[]> {
  const { data } = await client.get("/api-keys");
  return data;
}

export async function addApiKey(provider: string, apiKey: string, label: string, baseUrl?: string): Promise<void> {
  await client.post("/api-keys", { provider, api_key: apiKey, label, base_url: baseUrl });
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
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getProxyDownloadUrl(path: string): string {
  if (!path) return "";
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}/api/v1/studio/download?path=${encodeURIComponent(path)}`;
}

// --- Image Studio ---

export type StudioModels = Record<string, string[]>;

export async function getStudioModels(): Promise<StudioModels> {
  const { data } = await client.get("/studio/models");
  return data;
}

export type GeneratedImage = {
  id: string;
  prompt: string;
  image_url: string | null;
  thumbnail_url?: string | null;
  reference_image_url: string | null;
  reference_image_thumbnail_url?: string | null;
  secondary_reference_image_url?: string | null;
  secondary_image_url?: string | null;
  secondary_reference_image_thumbnail_url?: string | null;
  outfit_image_url?: string | null;
  aspect_ratio: string;
  provider: string;
  model: string;
  used_credits: string;
  payment_mode: string;
  status: string; // "pending" | "generating" | "completed" | "failed" | "queued"
  error_message: string | null;
  created_at: string;
};

export async function generateStudioImage(
  prompt: string,
  provider: string,
  model: string,
  aspectRatio: string,
  paymentMode: string,
  referenceImage: File | null = null,
  presetId: string | null = null,
  secondaryImage: File | null = null
): Promise<GeneratedImage> {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("provider", provider);
  formData.append("model", model);
  formData.append("aspect_ratio", aspectRatio);
  formData.append("payment_mode", paymentMode);
  if (referenceImage) {
    formData.append("reference_image", referenceImage);
  }
  if (secondaryImage) {
    formData.append("secondary_image", secondaryImage);
    formData.append("outfit_image", secondaryImage);
  }
  if (presetId) {
    formData.append("preset_id", presetId);
  }

  const { data } = await client.post("/studio/generate", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export type QueueStatus = {
  used_today: number;
  limit: number;
};

export async function getQueueStatus(): Promise<QueueStatus> {
  const { data } = await client.get("/studio/queue-status");
  return data;
}

export async function getImageStatus(imageId: string): Promise<GeneratedImage> {
  const { data } = await client.get(`/studio/status/${imageId}`);
  return data;
}

export async function retryStudioImage(imageId: string, paymentMode?: string): Promise<GeneratedImage> {
  const params = paymentMode ? { payment_mode: paymentMode } : {};
  const { data } = await client.post(`/studio/retry/${imageId}`, null, { params });
  return data;
}

export async function getStudioGallery(limit = 50, offset = 0): Promise<GeneratedImage[]> {
  const { data } = await client.get(`/studio/gallery?limit=${limit}&offset=${offset}`);
  return data;
}

export async function deleteStudioImage(imageId: string): Promise<void> {
  await client.delete(`/studio/${imageId}`);
}

export type StudioPreset = {
  id: string;
  title: string;
  version: string;
  category: string;
  prompt?: string;
  image_url: string;
  thumbnail_url?: string | null;
  before_image_url?: string | null;
  description: string;
  requires_secondary_image?: boolean;
  main_image_label?: string;
  secondary_image_label?: string;
  preset_type?: string;
};

export async function getStudioPresets(): Promise<StudioPreset[]> {
  const { data } = await client.get("/studio/presets");
  return data;
}

export type McpInfo = {
  sse_url: string;
  python_path: string;
  server_script_path: string;
  api_key: string;
  oauth_client_id: string;
  oauth_client_secret: string;
};

export type McpTool = {
  name: string;
  description: string;
  schema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
};

export type McpToolTestResponse = {
  content?: Array<{ type: string; text: string }>;
  isError?: boolean;
};

export async function getMcpInfo(): Promise<McpInfo> {
  const { data } = await client.get("/mcp-config/info");
  return data;
}

export async function getMcpTools(): Promise<McpTool[]> {
  const { data } = await client.get("/mcp-config/tools");
  return data;
}

export async function testMcpTool(toolName: string, args: Record<string, any>): Promise<McpToolTestResponse> {
  const { data } = await client.post(`/mcp-config/tools/${toolName}/test`, {
    arguments: args,
  });
  return data;
}

export type DocVersion = {
  version: string;
  date: string;
  summary: string;
  is_current: boolean;
};

export type DocMetadata = {
  id: string;
  title: string;
  description: string;
  current_version?: string;
  effective_date?: string;
  last_updated?: string;
};

export type DocDetail = {
  id: string;
  title: string;
  description: string;
  content_markdown: string;
  version?: string;
  effective_date?: string;
  last_updated?: string;
  is_current?: boolean;
  versions?: DocVersion[];
};

export async function getDocumentsList(): Promise<DocMetadata[]> {
  const { data } = await client.get("/docs");
  return data;
}

export async function getDocumentDetails(id: string, version?: string): Promise<DocDetail> {
  const url = version ? `/docs/${id}?version=${encodeURIComponent(version)}` : `/docs/${id}`;
  const { data } = await client.get(url);
  return data;
}

export { client };
