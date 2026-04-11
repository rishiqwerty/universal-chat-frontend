import axios from "axios";
import { getApiBaseUrl } from "../config";

const apiRoot = `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1`;

const client = axios.create({
  baseURL: apiRoot,
  timeout: 10000,
});

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

export { client };
