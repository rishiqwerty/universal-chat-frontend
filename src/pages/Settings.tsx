import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { 
  getApiKeys, 
  addApiKey, 
  removeApiKey, 
  activateApiKey,
  toggleApiKey,
  type ApiKey 
} from "../api/api";
import PageTransition from "../components/PageTransition";
import { useTheme } from "../hooks/useTheme";

export default function Settings() {
  const { accentColor, setAccentColor, availableColors } = useTheme();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [provider, setProvider] = useState("openai");
  const [apiKeyParam, setApiKeyParam] = useState("");
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
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
    if (!apiKeyParam.trim() || !label.trim()) return;
    setLoading(true);
    setError("");
    try {
      await addApiKey(provider, apiKeyParam.trim(), label.trim(), baseUrl.trim() || undefined);
      setApiKeyParam("");
      setLabel("");
      setBaseUrl("");
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

  const handleToggle = async (id: string) => {
    try {
      await toggleApiKey(id);
      await loadKeys();
    } catch {
      // ignore
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateApiKey(id);
      await loadKeys();
    } catch {
      // ignore
    }
  };

  const formatDate = (ds: string) => {
    try {
      return new Date(ds).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return ds;
    }
  };

  return (
    <PageTransition>
      <div className="flex h-screen min-h-0 overflow-hidden bg-background">
        <Sidebar activeNav="settings" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar hideIncognito={true} />
          <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-textPrimary">Settings</h1>
            <p className="mt-1 text-sm text-textSecondary">
              Configure your model providers and securely manage multiple API keys.
            </p>

            <form onSubmit={handleAdd} className="mt-8 rounded-card bg-surface p-6 shadow-none ring-1 ring-border/40">
              <h2 className="text-lg font-semibold text-textPrimary">Add API Key</h2>
              {error && (
                <p className="mt-4 rounded-input bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/50">
                  {error}
                </p>
              )}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
                    <option value="local">Local LLM</option>
                  </select>
                </label>

                {provider === "local" && (
                  <label className="block sm:col-span-1">
                    <span className="text-xs font-medium text-textSecondary">Base URL</span>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434/v1"
                      className="mt-2 h-11 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </label>
                )}

                <label className="block sm:col-span-1">
                  <span className="text-xs font-medium text-textSecondary">Key Label</span>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Primary Key"
                    className="mt-2 h-11 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </label>

                <label className={`block ${provider === "local" ? "sm:col-span-2" : "sm:col-span-2"}`}>
                  <span className="text-xs font-medium text-textSecondary">API Key</span>
                  <input
                    type="password"
                    value={apiKeyParam}
                    onChange={(e) => setApiKeyParam(e.target.value)}
                    placeholder={provider === "local" ? "None (or local key)" : "sk-..."}
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
                  Your API key is <span className="font-bold text-textPrimary">encrypted</span> at rest. Only one key per provider 
                  can be <span className="text-primary font-bold">active</span> at a time.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !apiKeyParam.trim() || !label.trim()}
                className="mt-6 w-full rounded-input bg-primary py-2.5 text-sm font-bold text-background shadow-[0_0_16px_rgba(217,255,0,0.2)] transition-all hover:scale-[1.02] hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:px-8"
              >
                {loading ? "Adding..." : "Securely Add Key"}
              </button>
            </form>

            <div className="mt-10 rounded-card bg-surface p-6 shadow-none ring-1 ring-border/40">
              <h2 className="text-lg font-semibold text-textPrimary">Appearance</h2>
              <p className="text-xs text-textSecondary mt-1">Select your personalized neural accent color.</p>
              
              <div className="mt-6 flex flex-wrap gap-4">
                {availableColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`group relative flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 ${
                      accentColor === color.value 
                        ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {accentColor === color.value && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background/40 backdrop-blur-sm text-white">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-textPrimary">{color.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 pb-10">
              <h2 className="text-lg font-semibold text-textPrimary">Configured Keys</h2>
              <div className="mt-4 flex flex-col gap-3">
                {keys.length === 0 ? (
                  <p className="text-sm text-textMuted">No API keys installed yet.</p>
                ) : (
                  keys.map((k) => (
                    <div key={k.id} className={`flex items-center justify-between rounded-input border transition-all duration-300 px-4 py-3 ${
                      k.is_active ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(217,255,0,0.05)]' : 'border-border/30 bg-surface grayscale'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <span className={`h-2.5 w-2.5 block rounded-full ${k.is_active ? 'bg-primary' : 'bg-textMuted'}`} />
                          {k.is_active && (
                            <span className="absolute -inset-1 rounded-full bg-primary/30 animate-ping" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold text-textSecondary uppercase tracking-widest">{k.provider}</p>
                            {k.is_active && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary ring-1 ring-primary/30">Active</span>
                            )}
                          </div>
                          <p className={`text-base font-semibold ${k.is_active ? 'text-textPrimary' : 'text-textSecondary'}`}>{k.label}</p>
                          {k.base_url && (
                            <p className="text-[10px] font-mono text-textMuted truncate max-w-[200px]">Endpoint: {k.base_url}</p>
                          )}
                          <p className="text-[10px] text-textMuted mt-0.5">
                            Added: {formatDate(k.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!k.is_active ? (
                          <button
                            type="button"
                            onClick={() => handleActivate(k.id)}
                            className="rounded-input bg-elevated px-3 py-1.5 text-xs font-bold text-primary transition-all hover:scale-[1.05] hover:bg-primary/20 hover:text-primary ring-1 ring-primary/20"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggle(k.id)}
                            className="rounded-input bg-background/50 px-3 py-1.5 text-xs font-bold text-textSecondary transition-all hover:scale-[1.05] hover:bg-elevated hover:text-textPrimary border border-border/50"
                          >
                            Disable
                          </button>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => handleRemove(k.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-input text-textMuted transition-all hover:scale-[1.1] hover:bg-elevated hover:text-error"
                          title="Delete Key"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
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


