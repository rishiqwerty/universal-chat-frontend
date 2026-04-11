import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

export async function mockChatReply(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  return `Echo: ${prompt}`;
}

export { client };
