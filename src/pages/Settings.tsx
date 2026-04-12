import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { getApiKeys, addApiKey, removeApiKey, type ApiKey } from "../api/api";
import PageTransition from "../components/PageTransition";

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [provider, setProvider] = useState("openai");
  const [apiKeyParam, setApiKeyParam] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadKeys = async () => {
    try {
      const data = await getApiKeys();
      setKeys(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyParam.trim()) return;
    setLoading(true);
    setError("");
    try {
      await addApiKey(provider, apiKeyParam.trim());
      setApiKeyParam("");
      await loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Failed to add key");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeApiKey(id);
      await loadKeys();
    } catch {
      // ignore
    }
  };

  const formatDate = (ds: string) => {
    try {
      return new Date(ds).toLocaleString();
    } catch {
      return ds;
    }
  };

  return (
    <PageTransition>
      <div className="flex h-screen min-h-0 overflow-hidden bg-background">
        <Sidebar activeNav="settings" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-textPrimary">Settings</h1>
            <p className="mt-1 text-sm text-textSecondary">
              Configure your model providers and securely manage API keys.
            </p>

            <form onSubmit={handleAdd} className="mt-8 rounded-card bg-surface p-6 shadow-none ring-1 ring-border/40">
              <h2 className="text-lg font-semibold text-textPrimary">Add API Key</h2>
              {error && (
                <p className="mt-4 rounded-input bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/50">
                  {error}
                </p>
              )}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block sm:col-span-1">
                  <span className="text-xs font-medium text-textSecondary">Provider</span>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="mt-2 h-11 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-textSecondary">API Key</span>
                  <input
                    type="password"
                    value={apiKeyParam}
                    onChange={(e) => setApiKeyParam(e.target.value)}
                    placeholder="sk-..."
                    className="mt-2 h-11 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-input bg-surface/40 p-3 ring-1 ring-border/30">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-textMuted">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-[11px] leading-relaxed text-textSecondary">
                  Your API key is <span className="font-bold text-textPrimary">encrypted</span> and cannot be accessed by anyone. 
                  We only use your API key to send requests directly to the provider. 
                  We do not store or reuse it outside your requests.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !apiKeyParam.trim()}
                className="mt-6 w-full rounded-input bg-primary py-2.5 text-sm font-bold text-background shadow-[0_0_16px_rgba(217,255,0,0.2)] transition-colors hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:px-8"
              >
                {loading ? "Adding..." : "Securely Add Key"}
              </button>
            </form>

            <div className="mt-10 pb-10">
              <h2 className="text-lg font-semibold text-textPrimary">Configured Keys</h2>
              <div className="mt-4 flex flex-col gap-3">
                {keys.length === 0 ? (
                  <p className="text-sm text-textMuted">No API keys installed yet.</p>
                ) : (
                  keys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between rounded-input border border-border/50 bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium text-textPrimary capitalize">{k.provider}</p>
                          <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wide">
                            Added: {formatDate(k.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(k.id)}
                        className="flex items-center gap-2 rounded-input border border-border/80 bg-transparent px-3 py-1.5 text-xs font-medium text-textSecondary transition-colors hover:bg-elevated hover:text-textPrimary"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}

