import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { 
  getApiKeys, 
  addApiKey, 
  removeApiKey, 
  activateApiKey,
  toggleApiKey,
  type ApiKey,
  getMcpInfo,
  getMcpTools,
  testMcpTool,
  type McpInfo,
  type McpTool
} from "../api/api";
import PageTransition from "../components/PageTransition";
import { useTheme } from "../hooks/useTheme";
import { useDocumentSEO } from "../hooks/useDocumentSEO";
import { getApiBaseUrl } from "../config";

export default function Settings() {
  useDocumentSEO({
    title: "Settings",
    description: "Configure model weights, customize themes, and manage API keys.",
  });

  const { accentColor, setAccentColor, availableColors } = useTheme();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [provider, setProvider] = useState("openai");
  const [apiKeyParam, setApiKeyParam] = useState("");
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tab management
  const [activeTab, setActiveTab] = useState<"providers" | "mcp">(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    return tabParam === "mcp" ? "mcp" : "providers";
  });

  // MCP Configuration State
  const [mcpInfo, setMcpInfo] = useState<McpInfo | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpConnected, setMcpConnected] = useState<boolean | null>(null);

  // Tool testing states
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, Record<string, any>>>({});
  const [toolResults, setToolResults] = useState<Record<string, { loading: boolean; response?: any; error?: string }>>({});

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showMcpApiKey, setShowMcpApiKey] = useState(false);
  const [mcpIntegrationMode, setMcpIntegrationMode] = useState<"personal" | "oauth">("personal");

  const loadKeys = async () => {
    try {
      const data = await getApiKeys();
      setKeys(data);
    } catch {
      // ignore
    }
  };

  const loadMcpData = async () => {
    setMcpLoading(true);
    try {
      const info = await getMcpInfo();
      setMcpInfo(info);
      const tools = await getMcpTools();
      setMcpTools(tools);
      setMcpConnected(true);
    } catch (err) {
      console.error("Failed to fetch MCP config", err);
      setMcpConnected(false);
    } finally {
      setMcpLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  useEffect(() => {
    if (activeTab === "mcp") {
      loadMcpData();
    }
  }, [activeTab]);

  const handleTestTool = async (toolName: string) => {
    const args = toolArgs[toolName] || {};
    setToolResults((prev) => ({
      ...prev,
      [toolName]: { loading: true },
    }));
    try {
      const res = await testMcpTool(toolName, args);
      if (res.success) {
        setToolResults((prev) => ({
          ...prev,
          [toolName]: { loading: false, response: res.result },
        }));
      } else {
        setToolResults((prev) => ({
          ...prev,
          [toolName]: { loading: false, error: res.error || "Failed to execute tool" },
        }));
      }
    } catch (err: any) {
      setToolResults((prev) => ({
        ...prev,
        [toolName]: { loading: false, error: err.response?.data?.detail || err.message || "Failed to execute tool" },
      }));
    }
  };

  const renderToolForm = (tool: McpTool) => {
    const properties = tool.schema?.properties || {};
    const requiredFields = tool.schema?.required || [];
    const currentArgs = toolArgs[tool.name] || {};

    const handleFieldChange = (fieldName: string, val: any) => {
      setToolArgs((prev) => ({
        ...prev,
        [tool.name]: {
          ...(prev[tool.name] || {}),
          [fieldName]: val,
        },
      }));
    };

    const propertyKeys = Object.keys(properties);
    if (propertyKeys.length === 0) {
      return <p className="text-xs text-textMuted italic">No parameters required.</p>;
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
        {propertyKeys.map((key) => {
          const prop = properties[key];
          const isRequired = requiredFields.includes(key);
          const type = prop.type || "string";
          const defaultValue = prop.default;

          return (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-textSecondary flex items-center gap-1">
                <span>{prop.title || key}</span>
                {isRequired && <span className="text-primary font-bold">*</span>}
                <span className="text-[10px] text-textMuted font-mono">({type})</span>
              </label>
              {type === "integer" || type === "number" ? (
                <input
                  type="number"
                  placeholder={defaultValue !== undefined ? `Default: ${defaultValue}` : `Enter ${key}`}
                  value={currentArgs[key] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                    handleFieldChange(key, val);
                  }}
                  className="h-10 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              ) : type === "boolean" ? (
                <select
                  value={currentArgs[key] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? undefined : e.target.value === "true";
                    handleFieldChange(key, val);
                  }}
                  className="h-10 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">Select option...</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={defaultValue !== undefined ? `Default: ${defaultValue}` : `Enter ${key}`}
                  value={currentArgs[key] ?? ""}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="h-10 w-full rounded-input border border-border/50 bg-elevated px-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              )}
              {prop.description && (
                <p className="text-[10px] text-textMuted leading-relaxed">{prop.description}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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

  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const configSnippet = isLocalhost ? {
    mcpServers: {
      "universal-chat-mcp": {
        command: mcpInfo?.python_path || "python3",
        args: [mcpInfo?.server_script_path || "/path/to/universal-chat-app/app/mcp_server.py"],
        env: {
          DATABASE_URL: "postgresql+asyncpg://postgres:postgres@localhost:5432/chatdb",
          X_API_KEY: mcpInfo?.api_key || "<your-api-key>"
        }
      }
    }
  } : {
    mcpServers: {
      "universal-chat-mcp": {
        type: "sse",
        url: mcpInfo ? `${getApiBaseUrl()}${mcpInfo.sse_url}?x-api-key=${mcpInfo.api_key}` : `${getApiBaseUrl()}/api/v1/mcp/sse`
      }
    }
  };

  const configString = JSON.stringify(configSnippet, null, 2);

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(configString);
    setCopiedKey("claude-config");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderCopyableRow = (label: string, value: string, copyKey: string) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-background/50 border border-border/20 font-mono text-[11px]">
        <span className="text-textSecondary font-headline uppercase font-bold tracking-wider text-[10px]">{label}</span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-textPrimary font-semibold break-all select-all">{value}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopiedKey(copyKey);
              setTimeout(() => setCopiedKey(null), 2000);
            }}
            className="shrink-0 p-1 rounded bg-surface hover:bg-elevated border border-border/30 text-textMuted hover:text-textPrimary transition-all"
            title={`Copy ${label}`}
          >
            {copiedKey === copyKey ? (
              <svg className="h-3 w-3 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
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
              Configure your model providers, custom themes, and Model Context Protocol (MCP) servers.
            </p>

            {/* Tab Swapper */}
            <div className="flex border-b border-border/20 mt-6 mb-8 gap-6">
              <button
                onClick={() => setActiveTab("providers")}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === "providers" 
                    ? "text-primary font-headline" 
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                Providers & Theme
                {activeTab === "providers" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("mcp")}
                className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
                  activeTab === "mcp" 
                    ? "text-primary font-headline" 
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                <span>MCP Server</span>
                <span className={`h-1.5 w-1.5 rounded-full ${mcpConnected === true ? "bg-primary animate-pulse" : mcpConnected === false ? "bg-error" : "bg-textMuted"}`} />
                {activeTab === "mcp" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </div>

            {activeTab === "providers" ? (
              <div className="space-y-10">
                <form onSubmit={handleAdd} className="rounded-card bg-surface p-6 shadow-none ring-1 ring-border/40">
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

                <div className="rounded-card bg-surface p-6 shadow-none ring-1 ring-border/40">
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

                <div className="pb-10">
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
              </div>
            ) : (
              <div className="space-y-8 pb-10">
                {/* Connection Status Card */}
                {/* Connection Status Card */}
                <div className="rounded-card bg-surface p-6 ring-1 ring-border/40">
                  <div className="flex items-center justify-between border-b border-border/20 pb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-textPrimary">Server Connection Status</h2>
                      <p className="text-xs text-textSecondary mt-1">Status of the local Model Context Protocol integration.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        mcpConnected === true 
                          ? "bg-primary/10 text-primary ring-1 ring-primary/30" 
                          : mcpConnected === false 
                            ? "bg-error/10 text-error ring-1 ring-error/30"
                            : "bg-elevated text-textMuted ring-1 ring-border"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          mcpConnected === true ? "bg-primary animate-pulse" : mcpConnected === false ? "bg-error" : "bg-textMuted"
                        }`} />
                        {mcpConnected === true ? "Connected & Active" : mcpConnected === false ? "Connection Failed" : "Checking Status..."}
                      </span>
                      <button
                        onClick={loadMcpData}
                        disabled={mcpLoading}
                        className="p-2 rounded-input hover:bg-elevated text-textSecondary transition-all"
                        title="Refresh Connection"
                      >
                        <svg className={`h-4 w-4 ${mcpLoading ? "animate-spin text-primary" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-input bg-elevated/40 border border-border/20">
                      <span className="text-textSecondary text-[11px] font-headline uppercase font-bold tracking-wider">SSE Connection URL</span>
                      <span className="text-textPrimary font-semibold select-all break-all">{mcpInfo ? `${getApiBaseUrl()}${mcpInfo.sse_url}` : "Loading..."}</span>
                    </div>
                    {isLocalhost && (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-input bg-elevated/40 border border-border/20">
                          <span className="text-textSecondary text-[11px] font-headline uppercase font-bold tracking-wider">Python Executable</span>
                          <span className="text-textPrimary font-semibold select-all break-all">{mcpInfo?.python_path || "Loading..."}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-input bg-elevated/40 border border-border/20">
                          <span className="text-textSecondary text-[11px] font-headline uppercase font-bold tracking-wider">Server Entrypoint</span>
                          <span className="text-textPrimary font-semibold select-all break-all">{mcpInfo?.server_script_path || "Loading..."}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Unified AI Client Integrations Card */}
                <div className="rounded-card bg-surface p-6 ring-1 ring-border/40 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-textPrimary">AI Client Integrations</h2>
                    <p className="text-xs text-textSecondary mt-1">
                      Configure authentication and connect this MCP server to your local development IDEs or remote AI web platforms.
                    </p>
                  </div>

                  {/* Mode Selector Segmented Tabs */}
                  <div className="flex p-0.5 rounded-lg bg-elevated/50 border border-border/20 self-start max-w-fit">
                    <button
                      type="button"
                      onClick={() => setMcpIntegrationMode("personal")}
                      className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                        mcpIntegrationMode === "personal"
                          ? "bg-surface text-primary shadow-sm"
                          : "text-textSecondary hover:text-textPrimary"
                      }`}
                    >
                      Personal Clients (API Key)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMcpIntegrationMode("oauth")}
                      className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                        mcpIntegrationMode === "oauth"
                          ? "bg-surface text-primary shadow-sm"
                          : "text-textSecondary hover:text-textPrimary"
                      }`}
                    >
                      Web Platforms (OAuth 2.0)
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {mcpIntegrationMode === "personal" ? (
                    <div className="space-y-6">
                      {/* API Key Row */}
                      <div className="p-4 rounded-input bg-elevated/20 border border-border/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Your Personal API Key</h3>
                          <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Personal Auth</span>
                        </div>
                        <p className="text-xs text-textSecondary">
                          Use this key to authenticate direct connections (e.g., Claude Desktop, Cursor, Continue, Cherry Studio).
                        </p>
                        <div className="flex items-center gap-2 p-3 rounded-input bg-background/50 border border-primary/20">
                          <span className="text-textPrimary font-mono break-all text-xs min-w-0 flex-1 select-all select-none">
                            {mcpInfo?.api_key
                              ? showMcpApiKey
                                ? mcpInfo.api_key
                                : `${mcpInfo.api_key.slice(0, 12)}${"•".repeat(24)}${mcpInfo.api_key.slice(-8)}`
                              : "Loading..."}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowMcpApiKey((v) => !v)}
                            className="shrink-0 p-1.5 rounded bg-surface hover:bg-elevated border border-border/30 text-textMuted hover:text-textPrimary transition-all"
                            title={showMcpApiKey ? "Hide API Key" : "Reveal API Key"}
                          >
                            {showMcpApiKey ? (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (mcpInfo?.api_key) {
                                navigator.clipboard.writeText(mcpInfo.api_key);
                                setCopiedKey("mcp-api-key");
                                setTimeout(() => setCopiedKey(null), 2000);
                              }
                            }}
                            className="shrink-0 p-1.5 rounded bg-surface hover:bg-elevated border border-border/30 text-textMuted hover:text-textPrimary transition-all"
                            title="Copy API Key"
                          >
                            {copiedKey === "mcp-api-key" ? (
                              <svg className="h-3.5 w-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Claude Desktop Integration instructions */}
                      <div className="border-t border-border/20 pt-5">
                        <h3 className="text-sm font-semibold text-textPrimary">Claude Desktop Integration</h3>
                        <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                          Configure Claude Desktop to run your MCP tools locally using the dynamic configuration snippet below.
                        </p>

                        <div className="mt-4 p-4 rounded-input bg-elevated/20 border border-border/20">
                          <p className="text-xs text-textSecondary leading-relaxed">
                            1. Open or create the Claude Desktop config file on macOS at:
                            <br />
                            <code className="text-[11px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded mt-1 inline-block select-all">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                          </p>
                          <p className="text-xs text-textSecondary leading-relaxed mt-3">
                            2. Add the following JSON configuration snippet to your config file:
                          </p>

                          <div className="relative mt-3 rounded-input bg-background border border-border/30 overflow-hidden font-mono text-xs">
                            <pre className="p-4 overflow-x-auto text-textPrimary max-h-60 leading-relaxed [scrollbar-width:thin]">
                              {configString}
                            </pre>
                            <button
                              type="button"
                              onClick={handleCopyConfig}
                              className="absolute top-3 right-3 p-2 rounded-input bg-surface hover:bg-elevated border border-border/30 text-textSecondary hover:text-textPrimary transition-all flex items-center gap-1.5 text-[10px] font-headline font-bold"
                            >
                              {copiedKey === "claude-config" ? (
                                <>
                                  <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied
                                </>
                              ) : (
                                <>
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                  </svg>
                                  Copy snippet
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* OAuth 2.0 Connection Parameters */}
                      <div className="p-4 rounded-input bg-elevated/20 border border-border/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">OAuth 2.0 Credentials</h3>
                          <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Standard Web Auth</span>
                        </div>
                        <p className="text-xs text-textSecondary">
                          Supply these parameters when registering this MCP server in third-party platforms requiring OAuth 2.0.
                        </p>

                        <div className="space-y-2.5">
                          {renderCopyableRow("Authorization URL", `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/oauth/authorize`, "auth-url")}
                          {renderCopyableRow("Token URL", `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/oauth/token`, "token-url")}
                          {renderCopyableRow("Client ID", mcpInfo?.oauth_client_id || "Loading...", "client-id")}
                          {renderCopyableRow("Client Secret", mcpInfo?.oauth_client_secret || "Loading...", "client-secret")}
                        </div>
                      </div>

                      {/* Setup Guides */}
                      <div className="border-t border-border/20 pt-5 space-y-4">
                        <h3 className="text-sm font-semibold text-textPrimary">Web Platform Integration Guides</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-input bg-elevated/10 border border-border/10 space-y-2">
                            <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                              ChatGPT Actions
                            </h4>
                            <ol className="list-decimal list-inside text-xs text-textSecondary space-y-1.5 leading-relaxed">
                              <li>Create a custom GPT or Plugin action.</li>
                              <li>Paste the MCP OpenAPI Schema.</li>
                              <li>Under Authentication, select <strong>OAuth</strong>.</li>
                              <li>Provide the Client ID, Client Secret, and URLs shown above.</li>
                            </ol>
                          </div>

                          <div className="p-4 rounded-input bg-elevated/10 border border-border/10 space-y-2">
                            <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                              Claude Web Tools
                            </h4>
                            <ol className="list-decimal list-inside text-xs text-textSecondary space-y-1.5 leading-relaxed">
                              <li>Open your project developer settings on Claude.ai.</li>
                              <li>Add a new <strong>Custom Connector</strong>.</li>
                              <li>Provide the OAuth connection credentials.</li>
                              <li>Authorize the application upon connection prompt.</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tools Registry & Tester */}
                <div>
                  <h2 className="text-lg font-semibold text-textPrimary">Registered Tools</h2>
                  <p className="text-xs text-textSecondary mt-1">Examine and test tools loaded by the Model Context Protocol application.</p>

                  <div className="mt-4 flex flex-col gap-3">
                    {mcpTools.length === 0 ? (
                      <div className="p-6 rounded-card border border-border/30 text-center bg-surface/30">
                        <p className="text-sm text-textMuted">
                          {mcpLoading ? "Fetching registered tools..." : "No tools registered in this server."}
                        </p>
                      </div>
                    ) : (
                      mcpTools.map((tool) => {
                        const isExpanded = expandedTool === tool.name;
                        const result = toolResults[tool.name];
                        
                        return (
                          <div key={tool.name} className={`rounded-card border transition-all duration-300 bg-surface ${
                            isExpanded ? "border-primary/45 ring-1 ring-primary/10" : "border-border/30"
                          }`}>
                            <button
                              type="button"
                              onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                              className="w-full flex items-center justify-between p-4 text-left transition-colors"
                            >
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-base font-bold text-textPrimary font-mono flex items-center gap-2">
                                  <span>{tool.name}</span>
                                  <span className="rounded bg-elevated px-2 py-0.5 text-[10px] font-medium font-headline text-textSecondary border border-border/20">tool</span>
                                </p>
                                <p className="text-xs text-textSecondary mt-1 leading-relaxed">{tool.description}</p>
                              </div>
                              <span className="text-textMuted hover:text-textPrimary transition-colors">
                                <svg className={`h-5 w-5 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-border/20 p-5 bg-elevated/10 space-y-5">
                                {/* Form Parameters */}
                                <div>
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Arguments</h3>
                                  {renderToolForm(tool)}
                                </div>

                                {/* Execute Button */}
                                <div className="flex justify-end gap-3 pt-3 border-t border-border/10">
                                  <button
                                    type="button"
                                    onClick={() => handleTestTool(tool.name)}
                                    disabled={result?.loading}
                                    className="rounded-input bg-primary px-5 py-2 text-xs font-bold text-background shadow-md hover:bg-primaryHover transition-all disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {result?.loading && (
                                      <svg className="animate-spin h-3 w-3 text-background" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    )}
                                    Invoke Tool
                                  </button>
                                </div>

                                {/* Output Block */}
                                {result && (
                                  <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Execution Result</h3>
                                    {result.loading ? (
                                      <div className="p-4 rounded-input bg-background/50 border border-border/20 text-xs font-mono text-textMuted animate-pulse">
                                        Running tool invocation...
                                      </div>
                                    ) : result.error ? (
                                      <div className="p-4 rounded-input bg-error/10 border border-error/20 text-xs font-mono text-error">
                                        Error: {result.error}
                                      </div>
                                    ) : (
                                      <div className="rounded-input border border-border/20 bg-background overflow-hidden font-mono text-xs relative">
                                        <pre className="p-4 overflow-x-auto text-primary max-h-80 [scrollbar-width:thin] whitespace-pre-wrap leading-relaxed">
                                          {JSON.stringify(result.response, null, 2)}
                                        </pre>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(result.response, null, 2));
                                            setCopiedKey(`tool-res-${tool.name}`);
                                            setTimeout(() => setCopiedKey(null), 2000);
                                          }}
                                          className="absolute top-3 right-3 p-1.5 rounded bg-surface hover:bg-elevated text-textMuted hover:text-textPrimary border border-border/30 transition-all text-[9px] font-headline font-bold flex items-center gap-1"
                                        >
                                          {copiedKey === `tool-res-${tool.name}` ? "Copied" : "Copy output"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageTransition>
  );
}


