import { useState, useEffect } from 'react';
import { api } from '../api';
import './Settings.css';

const SEARCH_PROVIDERS = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    description: 'News search. Fast and free.',
    requiresKey: false,
    keyType: null,
  },
  {
    id: 'tavily',
    name: 'Tavily',
    description: 'Purpose-built for LLMs. Returns rich, relevant content. Requires API key.',
    requiresKey: true,
    keyType: 'tavily',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    description: 'Privacy-focused search. 2,000 free queries/month. Requires API key.',
    requiresKey: true,
    keyType: 'brave',
  },
];

const LLM_PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', description: 'Use cloud-based models' },
  { id: 'ollama', name: 'Ollama', description: 'Use local models' },
  { id: 'direct', name: 'Direct', description: 'Use your own API keys' },
  { id: 'hybrid', name: 'Hybrid', description: 'Mix cloud and local models' }
];

const DIRECT_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', key: 'openai_api_key' },
  { id: 'anthropic', name: 'Anthropic', key: 'anthropic_api_key' },
  { id: 'google', name: 'Google', key: 'google_api_key' },
  { id: 'mistral', name: 'Mistral', key: 'mistral_api_key' },
  { id: 'deepseek', name: 'DeepSeek', key: 'deepseek_api_key' },
];

export default function Settings({ onClose, ollamaStatus, onRefreshOllama }) {
  const [settings, setSettings] = useState(null);
  const [selectedSearchProvider, setSelectedSearchProvider] = useState('duckduckgo');
  const [fullContentResults, setFullContentResults] = useState(3);

  // LLM Provider State
  const [selectedLlmProvider, setSelectedLlmProvider] = useState('openrouter');

  // OpenRouter State
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [councilModels, setCouncilModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isTestingOpenRouter, setIsTestingOpenRouter] = useState(false);
  const [openrouterTestResult, setOpenrouterTestResult] = useState(null);

  // Ollama State
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
  const [ollamaCouncilModels, setOllamaCouncilModels] = useState([]);
  const [ollamaChairmanModel, setOllamaChairmanModel] = useState('');
  const [ollamaAvailableModels, setOllamaAvailableModels] = useState([]);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState(null);

  // Hybrid State
  const [hybridCouncilModels, setHybridCouncilModels] = useState([]);
  const [hybridChairmanModel, setHybridChairmanModel] = useState('');

  // Direct Provider State
  const [directKeys, setDirectKeys] = useState({
    openai_api_key: '',
    anthropic_api_key: '',
    google_api_key: '',
    mistral_api_key: '',
    deepseek_api_key: ''
  });
  const [directCouncilModels, setDirectCouncilModels] = useState([]);
  const [directChairmanModel, setDirectChairmanModel] = useState('');
  const [directAvailableModels, setDirectAvailableModels] = useState([]);

  // Validation State
  const [validatingKeys, setValidatingKeys] = useState({});
  const [keyValidationStatus, setKeyValidationStatus] = useState({});

  // Track filter preference for Hybrid mode rows (index -> 'remote' | 'local')
  // We initialize this lazily during render or effects
  const [hybridRowFilters, setHybridRowFilters] = useState({});

  // Search API Keys
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [braveApiKey, setBraveApiKey] = useState('');
  const [isTestingTavily, setIsTestingTavily] = useState(false);
  const [isTestingBrave, setIsTestingBrave] = useState(false);
  const [tavilyTestResult, setTavilyTestResult] = useState(null);
  const [braveTestResult, setBraveTestResult] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Hybrid Mode Filters
  const [hybridShowOpenRouter, setHybridShowOpenRouter] = useState(true);
  const [hybridShowLocal, setHybridShowLocal] = useState(true);
  const [hybridShowDirect, setHybridShowDirect] = useState(true);
  const [hybridDirectProviders, setHybridDirectProviders] = useState({
    openai: true,
    anthropic: true,
    google: true,
    mistral: true,
    deepseek: true
  });

  // Utility Models State
  const [searchQueryModel, setSearchQueryModel] = useState('');

  // System Prompts State
  const [prompts, setPrompts] = useState({
    stage1_prompt: '',
    stage2_prompt: '',
    stage3_prompt: '',
    title_prompt: '',
    search_query_prompt: ''
  });
  const [activePromptTab, setActivePromptTab] = useState('stage1');

  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    if (!settings) return;

    const checkChanges = () => {
      if (selectedSearchProvider !== settings.search_provider) return true;
      if (fullContentResults !== (settings.full_content_results ?? 3)) return true;
      if (selectedLlmProvider !== settings.llm_provider) return true;

      // OpenRouter
      // Note: openrouterApiKey is auto-saved on test, so we don't check it here
      if (JSON.stringify(councilModels) !== JSON.stringify(settings.council_models)) return true;
      if (chairmanModel !== settings.chairman_model) return true;

      // Ollama
      // Note: ollamaBaseUrl is auto-saved on connect, so we don't check it here
      if (JSON.stringify(ollamaCouncilModels) !== JSON.stringify(settings.ollama_council_models)) return true;
      if (ollamaChairmanModel !== settings.ollama_chairman_model) return true;

      // Direct
      if (JSON.stringify(directCouncilModels) !== JSON.stringify(settings.direct_council_models)) return true;
      if (directChairmanModel !== settings.direct_chairman_model) return true;
      // Note: directKeys are auto-saved on test, so we don't check them here

      // Hybrid
      if (JSON.stringify(hybridCouncilModels) !== JSON.stringify(settings.hybrid_council_models)) return true;
      if (hybridChairmanModel !== settings.hybrid_chairman_model) return true;

      // Utility
      if (searchQueryModel !== settings.search_query_model) return true;

      // Prompts
      if (prompts.stage1_prompt !== settings.stage1_prompt) return true;
      if (prompts.stage2_prompt !== settings.stage2_prompt) return true;
      if (prompts.stage3_prompt !== settings.stage3_prompt) return true;
      if (prompts.title_prompt !== settings.title_prompt) return true;
      if (prompts.search_query_prompt !== settings.search_query_prompt) return true;

      // Note: API keys (tavilyApiKey, braveApiKey) are auto-saved on test, so we don't check them here

      return false;
    };

    setHasChanges(checkChanges());
  }, [
    settings,
    selectedSearchProvider,
    fullContentResults,
    selectedLlmProvider,
    councilModels,
    chairmanModel,
    ollamaCouncilModels,
    ollamaChairmanModel,
    directCouncilModels,
    directChairmanModel,
    hybridCouncilModels,
    hybridChairmanModel,
    searchQueryModel,
    prompts
  ]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);

      setSelectedSearchProvider(data.search_provider || 'duckduckgo');
      setFullContentResults(data.full_content_results ?? 3);

      setSelectedLlmProvider(data.llm_provider || 'openrouter');

      setCouncilModels(data.council_models || []);
      setChairmanModel(data.chairman_model || '');

      setOllamaBaseUrl(data.ollama_base_url || 'http://localhost:11434');
      setOllamaCouncilModels(data.ollama_council_models || []);
      setOllamaChairmanModel(data.ollama_chairman_model || '');

      setHybridCouncilModels(data.hybrid_council_models || []);
      setHybridChairmanModel(data.hybrid_chairman_model || '');

      setSearchQueryModel(data.search_query_model || 'google/gemini-2.5-flash');

      setPrompts({
        stage1_prompt: data.stage1_prompt || '',
        stage2_prompt: data.stage2_prompt || '',
        stage3_prompt: data.stage3_prompt || '',
        title_prompt: data.title_prompt || '',
        search_query_prompt: data.search_query_prompt || ''
      });

      // Load Direct Keys
      // Load Direct Keys
      setDirectKeys({
        openai_api_key: '',
        anthropic_api_key: '',
        google_api_key: '',
        mistral_api_key: '',
        deepseek_api_key: ''
      });
      setDirectCouncilModels(data.direct_council_models || []);
      setDirectChairmanModel(data.direct_chairman_model || '');

      // Load OpenRouter models
      loadModels();
      // Load Ollama models
      loadOllamaModels(data.ollama_base_url || 'http://localhost:11434');

    } catch (err) {
      setError('Failed to load settings');
    }
  };

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const data = await api.getModels();
      if (data.models && data.models.length > 0) {
        // Sort models alphabetically
        const sorted = data.models.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setAvailableModels(sorted);
      }

      // Fetch direct models from backend
      try {
        const directModels = await api.getDirectModels();
        setDirectAvailableModels(directModels);
      } catch (error) {
        console.error('Failed to fetch direct models:', error);
        // Fallback to empty list or basic models if fetch fails
        setDirectAvailableModels([]);
      }

    } catch (err) {
      console.warn('Failed to load models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadOllamaModels = async (baseUrl) => {
    try {
      const data = await api.getOllamaModels(baseUrl);
      if (data.models && data.models.length > 0) {
        // Sort models alphabetically
        const sorted = data.models.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setOllamaAvailableModels(sorted);
      }
    } catch (err) {
      console.warn('Failed to load Ollama models:', err);
    }
  };

  // Auto-populate Ollama defaults if empty and models are available
  useEffect(() => {
    if (selectedLlmProvider === 'ollama' && ollamaAvailableModels.length > 0) {
      // Only populate if completely empty
      if (ollamaCouncilModels.length === 0) {
        const count = Math.min(ollamaAvailableModels.length, 4);
        setOllamaCouncilModels(ollamaAvailableModels.slice(0, count).map(m => m.id));
      }
      if (!ollamaChairmanModel) {
        setOllamaChairmanModel(ollamaAvailableModels[0].id);
      }
    }
  }, [selectedLlmProvider, ollamaAvailableModels]);

  // Auto-populate Hybrid defaults if empty
  useEffect(() => {
    if (selectedLlmProvider === 'hybrid' && hybridCouncilModels.length === 0) {
      // Default to the standard OpenRouter council if available
      // We can't easily access the 'defaults' from API here without a call, 
      // but we can use the 'councilModels' state if it's populated (which comes from defaults usually)
      // Or better, just wait for user to hit Reset, OR populate with available OpenRouter models
      if (councilModels.length > 0) {
        setHybridCouncilModels(councilModels);
      } else if (availableModels.length >= 4) {
        // Fallback if councilModels not ready
        setHybridCouncilModels(availableModels.slice(0, 4).map(m => m.id));
      }

      if (!hybridChairmanModel && chairmanModel) {
        setHybridChairmanModel(chairmanModel);
      }
    }
  }, [selectedLlmProvider, councilModels, availableModels]);

  // Clear Utility Models if invalid for current provider (e.g. Ollama selected but provider is Direct)
  useEffect(() => {
    if (selectedLlmProvider === 'direct') {
      if (searchQueryModel.startsWith('ollama:')) {
        setSearchQueryModel('');
      }
    }
  }, [selectedLlmProvider, searchQueryModel]);

  const handleTestTavily = async () => {
    if (!tavilyApiKey) {
      setTavilyTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }
    setIsTestingTavily(true);
    setTavilyTestResult(null);
    try {
      const result = await api.testTavilyKey(tavilyApiKey);
      setTavilyTestResult(result);

      // Auto-save API key if validation succeeds
      if (result.success) {
        await api.updateSettings({ tavily_api_key: tavilyApiKey });
        setTavilyApiKey(''); // Clear input after save

        // Reload settings but preserve current UI selections
        const currentProvider = selectedLlmProvider;
        await loadSettings();
        setSelectedLlmProvider(currentProvider);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setTavilyTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTestingTavily(false);
    }
  };

  const handleTestBrave = async () => {
    if (!braveApiKey) {
      setBraveTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }
    setIsTestingBrave(true);
    setBraveTestResult(null);
    try {
      const result = await api.testBraveKey(braveApiKey);
      setBraveTestResult(result);

      // Auto-save API key if validation succeeds
      if (result.success) {
        await api.updateSettings({ brave_api_key: braveApiKey });
        setBraveApiKey(''); // Clear input after save

        // Reload settings but preserve current UI selections
        const currentProvider = selectedLlmProvider;
        await loadSettings();
        setSelectedLlmProvider(currentProvider);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setBraveTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTestingBrave(false);
    }
  };

  const handleTestOpenRouter = async () => {
    if (!openrouterApiKey && !settings.openrouter_api_key_set) {
      setOpenrouterTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }
    setIsTestingOpenRouter(true);
    setOpenrouterTestResult(null);
    try {
      // If input is empty but key is configured, pass null to test the saved key
      const keyToTest = openrouterApiKey || null;
      const result = await api.testOpenRouterKey(keyToTest);
      setOpenrouterTestResult(result);

      // Auto-save API key if validation succeeds and a new key was provided
      if (result.success && openrouterApiKey) {
        await api.updateSettings({ openrouter_api_key: openrouterApiKey });
        setOpenrouterApiKey(''); // Clear input after save

        // Reload settings but preserve current UI selections
        const currentProvider = selectedLlmProvider;
        await loadSettings();
        setSelectedLlmProvider(currentProvider);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setOpenrouterTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTestingOpenRouter(false);
    }
  };

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    setOllamaTestResult(null);
    try {
      const result = await api.testOllamaConnection(ollamaBaseUrl);
      setOllamaTestResult(result);

      // Always refresh parent component's ollama status (success or failure)
      if (onRefreshOllama) {
        onRefreshOllama(ollamaBaseUrl);
      }

      if (result.success) {
        // Auto-save base URL if connection succeeds
        await api.updateSettings({ ollama_base_url: ollamaBaseUrl });

        // Reload settings but preserve current UI selections
        const currentProvider = selectedLlmProvider;
        await loadSettings();
        setSelectedLlmProvider(currentProvider);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setOllamaTestResult({ success: false, message: 'Connection failed' });

      // Refresh parent status on exception too
      if (onRefreshOllama) {
        onRefreshOllama(ollamaBaseUrl);
      }
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleCouncilModelChange = (index, modelId) => {
    if (selectedLlmProvider === 'openrouter') {
      setCouncilModels(prev => {
        const updated = [...prev];
        updated[index] = modelId;
        return updated;
      });
    } else if (selectedLlmProvider === 'ollama') {
      setOllamaCouncilModels(prev => {
        const updated = [...prev];
        updated[index] = modelId;
        return updated;
      });
    } else if (selectedLlmProvider === 'direct') {
      setDirectCouncilModels(prev => {
        const updated = [...prev];
        updated[index] = modelId;
        return updated;
      });
    } else {
      setHybridCouncilModels(prev => {
        const updated = [...prev];
        updated[index] = modelId;
        return updated;
      });
    }
  };

  const handleAddCouncilMember = () => {
    if (selectedLlmProvider === 'openrouter') {
      const filteredModels = showFreeOnly
        ? availableModels.filter(m => m.is_free)
        : availableModels;
      if (filteredModels.length > 0) {
        setCouncilModels(prev => [...prev, filteredModels[0].id]);
      }
    } else if (selectedLlmProvider === 'ollama') {
      if (ollamaAvailableModels.length > 0) {
        setOllamaCouncilModels(prev => [...prev, ollamaAvailableModels[0].id]);
      }
    } else if (selectedLlmProvider === 'direct') {
      if (directAvailableModels.length > 0) {
        setDirectCouncilModels(prev => [...prev, directAvailableModels[0].id]);
      }
    } else {
      // For hybrid, try adding OpenRouter model first, then Ollama
      const filteredModels = showFreeOnly
        ? availableModels.filter(m => m.is_free)
        : availableModels;

      if (filteredModels.length > 0) {
        setHybridCouncilModels(prev => [...prev, filteredModels[0].id]);
      } else if (ollamaAvailableModels.length > 0) {
        setHybridCouncilModels(prev => [...prev, `ollama:${ollamaAvailableModels[0].id}`]);
      } else if (directAvailableModels.length > 0) {
        setHybridCouncilModels(prev => [...prev, directAvailableModels[0].id]);
      }
    }
  };

  const handleRemoveCouncilMember = (index) => {
    if (selectedLlmProvider === 'openrouter') {
      setCouncilModels(prev => prev.filter((_, i) => i !== index));
    } else if (selectedLlmProvider === 'ollama') {
      setOllamaCouncilModels(prev => prev.filter((_, i) => i !== index));
    } else if (selectedLlmProvider === 'direct') {
      setDirectCouncilModels(prev => prev.filter((_, i) => i !== index));
    } else {
      setHybridCouncilModels(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePromptChange = (key, value) => {
    setPrompts(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetPrompt = async (key) => {
    try {
      const defaults = await api.getDefaultSettings();
      if (defaults[key]) {
        handlePromptChange(key, defaults[key]);
      }
    } catch (err) {
      console.error("Failed to fetch default prompt", err);
    }
  };

  const handleResetToDefaults = () => {
    setShowResetConfirm(true);
  };

  const confirmResetToDefaults = async () => {
    setShowResetConfirm(false);

    try {
      const defaults = await api.getDefaultSettings();

      // General Settings
      setSelectedSearchProvider('duckduckgo');
      setFullContentResults(3);
      setSelectedLlmProvider('openrouter');
      setShowFreeOnly(false);

      // OpenRouter
      setCouncilModels(defaults.council_models);
      setChairmanModel(defaults.chairman_model);

      // Ollama
      setOllamaBaseUrl('http://localhost:11434');
      // For Ollama models, we can't really "reset" to a specific list since it depends on what's installed.
      // We'll leave them as is or try to auto-populate if empty, but for now let's just reset the URL.
      // Actually, let's try to refresh the list if we can, but that's async. 
      // Let's just reset the selection logic to "try to pick valid ones" if we were to re-run loadOllamaModels.
      // For now, preserving current Ollama selection is safer than clearing it to empty.

      // Direct
      setDirectCouncilModels([]);
      setDirectChairmanModel('');

      // Hybrid
      setHybridCouncilModels(defaults.council_models); // Default to same as OpenRouter
      setHybridChairmanModel(defaults.chairman_model);

      // Utility Models
      setSearchQueryModel(defaults.search_query_model);
      // title_model removed from backend

      // Prompts
      setPrompts({
        stage1_prompt: defaults.stage1_prompt,
        stage2_prompt: defaults.stage2_prompt,
        stage3_prompt: defaults.stage3_prompt,
        title_prompt: defaults.title_prompt,
        search_query_prompt: defaults.search_query_prompt
      });

      // Reset Hybrid Filters
      setHybridShowLocal(true);
      setHybridShowOpenRouter(true);
      setHybridShowDirect(true);
      setHybridRowFilters({});

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to load default settings');
    }
  };

  const handleTestDirectKey = async (providerId, keyField) => {
    const apiKey = directKeys[keyField];
    if (!apiKey) return;

    setValidatingKeys(prev => ({ ...prev, [providerId]: true }));
    setKeyValidationStatus(prev => ({ ...prev, [providerId]: null }));

    try {
      const result = await api.testProviderKey(providerId, apiKey);
      setKeyValidationStatus(prev => ({
        ...prev,
        [providerId]: {
          success: result.success,
          message: result.message
        }
      }));

      // Auto-save API key if validation succeeds
      if (result.success) {
        await api.updateSettings({ [keyField]: apiKey });
        setDirectKeys(prev => ({ ...prev, [keyField]: '' })); // Clear input after save

        // Reload settings but preserve current UI selections
        const currentProvider = selectedLlmProvider;
        await loadSettings();
        setSelectedLlmProvider(currentProvider);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setKeyValidationStatus(prev => ({
        ...prev,
        [providerId]: {
          success: false,
          message: err.message
        }
      }));
    } finally {
      setValidatingKeys(prev => ({ ...prev, [providerId]: false }));
    }
  };



  const handleExportCouncil = () => {
    const config = {
      // General
      search_provider: selectedSearchProvider,
      full_content_results: fullContentResults,
      llm_provider: selectedLlmProvider,
      show_free_only: showFreeOnly,

      // OpenRouter
      council_models: councilModels,
      chairman_model: chairmanModel,

      // Ollama
      ollama_base_url: ollamaBaseUrl,
      ollama_council_models: ollamaCouncilModels,
      ollama_chairman_model: ollamaChairmanModel,

      // Direct
      direct_council_models: directCouncilModels,
      direct_chairman_model: directChairmanModel,

      // Hybrid
      hybrid_council_models: hybridCouncilModels,
      hybrid_chairman_model: hybridChairmanModel,
      hybrid_show_local: hybridShowLocal,
      hybrid_show_remote: hybridShowOpenRouter, // mapped from hybridShowOpenRouter
      hybrid_show_direct: hybridShowDirect,
      hybrid_direct_providers: hybridDirectProviders,
      hybrid_row_filters: hybridRowFilters,

      // Utility
      search_query_model: searchQueryModel,

      // Prompts
      prompts: prompts
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "council_config.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportCouncil = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);

        // Basic validation
        if (!config.llm_provider) {
          throw new Error("Invalid format: missing llm_provider");
        }

        // 1. Apply General Settings
        if (config.search_provider) setSelectedSearchProvider(config.search_provider);
        if (config.full_content_results !== undefined) setFullContentResults(config.full_content_results);
        if (config.llm_provider) setSelectedLlmProvider(config.llm_provider);
        if (config.show_free_only !== undefined) setShowFreeOnly(config.show_free_only);

        // 2. Apply Prompts
        if (config.prompts) {
          setPrompts(prev => ({ ...prev, ...config.prompts }));
        }

        // 3. Apply Provider Settings & Validate Models
        // We need to validate models for the ACTIVE provider to show immediate feedback
        // But we should import ALL provider settings regardless

        // OpenRouter
        if (config.council_models) setCouncilModels(config.council_models);
        if (config.chairman_model) setChairmanModel(config.chairman_model);

        // Ollama
        if (config.ollama_base_url) setOllamaBaseUrl(config.ollama_base_url);
        if (config.ollama_council_models) setOllamaCouncilModels(config.ollama_council_models);
        if (config.ollama_chairman_model) setOllamaChairmanModel(config.ollama_chairman_model);

        // Direct
        if (config.direct_council_models) setDirectCouncilModels(config.direct_council_models);
        if (config.direct_chairman_model) setDirectChairmanModel(config.direct_chairman_model);

        // Hybrid
        if (config.hybrid_council_models) setHybridCouncilModels(config.hybrid_council_models);
        if (config.hybrid_chairman_model) setHybridChairmanModel(config.hybrid_chairman_model);
        if (config.hybrid_show_local !== undefined) setHybridShowLocal(config.hybrid_show_local);
        if (config.hybrid_show_remote !== undefined) setHybridShowOpenRouter(config.hybrid_show_remote);
        if (config.hybrid_show_direct !== undefined) setHybridShowDirect(config.hybrid_show_direct);
        if (config.hybrid_direct_providers) setHybridDirectProviders(config.hybrid_direct_providers);
        if (config.hybrid_row_filters) setHybridRowFilters(config.hybrid_row_filters);

        // Utility
        if (config.search_query_model) setSearchQueryModel(config.search_query_model);

        // 4. Validation for Active Provider
        const activeProvider = config.llm_provider || selectedLlmProvider;
        let modelsToValidate = [];
        let availableModelsList = [];

        if (activeProvider === 'openrouter') {
          modelsToValidate = config.council_models || [];
          availableModelsList = availableModels;
        } else if (activeProvider === 'ollama') {
          modelsToValidate = config.ollama_council_models || [];
          availableModelsList = ollamaAvailableModels;
        } else if (activeProvider === 'direct') {
          modelsToValidate = config.direct_council_models || [];
          availableModelsList = directAvailableModels;
        } else if (activeProvider === 'hybrid') {
          modelsToValidate = config.hybrid_council_models || [];
          availableModelsList = [
            ...availableModels,
            ...ollamaAvailableModels.map(m => ({ ...m, id: `ollama:${m.id}` })),
            ...directAvailableModels
          ];
        }

        const missingModels = modelsToValidate.filter(id => !availableModelsList.find(m => m.id === id));

        if (missingModels.length > 0) {
          setError(`Imported with warnings: Active models not found: ${missingModels.join(', ')}`);
        } else {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }

      } catch (err) {
        setError(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updates = {
        search_provider: selectedSearchProvider,
        full_content_results: fullContentResults,
        llm_provider: selectedLlmProvider,
        ollama_base_url: ollamaBaseUrl,
        ollama_council_models: ollamaCouncilModels,
        ollama_chairman_model: ollamaChairmanModel,
        direct_council_models: directCouncilModels,
        direct_chairman_model: directChairmanModel,
        hybrid_council_models: hybridCouncilModels,
        hybrid_chairman_model: hybridChairmanModel,
        council_models: councilModels,
        chairman_model: chairmanModel,

        // Utility Models
        search_query_model: searchQueryModel,

        // Prompts
        ...prompts
      };

      // Only send API keys if they've been changed
      if (tavilyApiKey && !tavilyApiKey.startsWith('•')) {
        updates.tavily_api_key = tavilyApiKey;
      }
      if (braveApiKey && !braveApiKey.startsWith('•')) {
        updates.brave_api_key = braveApiKey;
      }
      if (openrouterApiKey && !openrouterApiKey.startsWith('•')) {
        updates.openrouter_api_key = openrouterApiKey;
      }

      // Add Direct Keys
      Object.entries(directKeys).forEach(([key, value]) => {
        if (value && !value.startsWith('•')) {
          updates[key] = value;
        }
      });

      await api.updateSettings(updates);
      setSuccess(true);
      setTavilyApiKey('');
      setBraveApiKey('');
      setOpenrouterApiKey('');

      await loadSettings();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getRowFilter = (index, modelId) => {
    // If we have an explicit user choice, use it
    if (hybridRowFilters[index]) return hybridRowFilters[index];

    // Otherwise infer from the model ID
    if (modelId && modelId.toString().startsWith('ollama:')) return 'local';
    return 'remote'; // Default to remote
  };

  const toggleRowFilter = (index, type) => {
    setHybridRowFilters(prev => ({
      ...prev,
      [index]: type
    }));
  };

  // Same for Chairman
  const [chairmanFilter, setChairmanFilter] = useState(null);
  const getChairmanFilter = (currentId) => {
    if (chairmanFilter) return chairmanFilter;
    if (currentId && currentId.toString().startsWith('ollama:')) return 'local';
    return 'remote';
  };

  if (!settings) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="settings-loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  const selectedProviderInfo = SEARCH_PROVIDERS.find(p => p.id === selectedSearchProvider);
  let currentAvailableModels = [];
  let currentCouncilModels = [];
  let currentChairmanModel = '';

  const isDirectProviderConfigured = (providerName) => {
    switch (providerName) {
      case 'OpenAI': return !!(directKeys.openai_api_key || settings?.openai_api_key_set);
      case 'Anthropic': return !!(directKeys.anthropic_api_key || settings?.anthropic_api_key_set);
      case 'Google': return !!(directKeys.google_api_key || settings?.google_api_key_set);
      case 'Mistral': return !!(directKeys.mistral_api_key || settings?.mistral_api_key_set);
      case 'DeepSeek': return !!(directKeys.deepseek_api_key || settings?.deepseek_api_key_set);
      default: return false;
    }
  };

  const filteredDirectModels = directAvailableModels.filter(m => isDirectProviderConfigured(m.provider));

  if (selectedLlmProvider === 'openrouter') {
    currentAvailableModels = availableModels;
    currentCouncilModels = councilModels;
    currentChairmanModel = chairmanModel;
  } else if (selectedLlmProvider === 'ollama') {
    currentAvailableModels = ollamaAvailableModels;
    currentCouncilModels = ollamaCouncilModels;
    currentChairmanModel = ollamaChairmanModel;
  } else if (selectedLlmProvider === 'direct') {
    currentAvailableModels = filteredDirectModels;
    currentCouncilModels = directCouncilModels;
    currentChairmanModel = directChairmanModel;
  } else {
    // Hybrid: Merge models from all sources
    const openRouterMapped = availableModels.map(m => ({ ...m, name: `${m.name || m.id} (OpenRouter)` }));
    const ollamaMapped = ollamaAvailableModels.map(m => ({
      ...m,
      id: `ollama:${m.id}`,
      name: `${m.name || m.id} (Local)`
    }));
    // Merge all
    currentAvailableModels = [...openRouterMapped, ...ollamaMapped, ...filteredDirectModels].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    currentCouncilModels = hybridCouncilModels;
    currentChairmanModel = hybridChairmanModel;
  }

  const filteredModels = (selectedLlmProvider !== 'ollama' && showFreeOnly)
    ? currentAvailableModels.filter(m => m.is_free || m.id.startsWith('ollama:')) // Assume local is free/allowed
    : currentAvailableModels;

  const chairmanModels = (selectedLlmProvider === 'ollama')
    ? currentAvailableModels
    : currentAvailableModels.filter(m => !m.is_free || (m.id && m.id.startsWith('ollama:')));

  const getFilteredModels = (filter) => {
    if (!filter) return chairmanModels;
    if (filter === 'local') return chairmanModels.filter(m => m.id.startsWith('ollama:'));
    return chairmanModels.filter(m => !m.id.startsWith('ollama:'));
  };

  const renderModelOptions = (models) => {
    // Filter models based on Hybrid settings if in Hybrid mode
    let filteredModels = models;
    if (selectedLlmProvider === 'hybrid') {
      filteredModels = models.filter(model => {
        // Local (Ollama)
        if (model.id.startsWith('ollama:')) {
          return hybridShowLocal;
        }

        // Direct Providers
        if (model.provider && ['OpenAI', 'Anthropic', 'Google', 'Mistral', 'DeepSeek'].includes(model.provider) && !model.id.startsWith('ollama:')) {
          // Check if it's a direct model (not OpenRouter)
          // OpenRouter models usually don't have these exact provider strings in this context unless mapped, 
          // but our direct models do.
          // However, OpenRouter models ALSO have "provider" fields. 
          // We need to distinguish. 
          // Direct models in our app currently use IDs like "openai:..." or "google:..." 
          // OpenRouter models usually come as "openai/gpt-4..."

          const isDirectId = model.id.includes(':') && !model.id.startsWith('ollama:');

          if (isDirectId) {
            if (!hybridShowDirect) return false;
            // Check specific provider toggle
            const providerKey = model.provider.toLowerCase();
            return hybridDirectProviders[providerKey] !== false; // Default true
          }
        }

        // OpenRouter (everything else)
        // If it's not local and not direct (based on our ID convention), it's OpenRouter
        const isDirectId = model.id.includes(':') && !model.id.startsWith('ollama:');
        if (!model.id.startsWith('ollama:') && !isDirectId) {
          return hybridShowOpenRouter;
        }

        return true;
      });
    }

    // Group models by provider
    const grouped = filteredModels.reduce((acc, model) => {
      // Determine provider
      let provider = model.provider || 'Other';
      if (model.id.startsWith('ollama:')) provider = 'Local (Ollama)';
      else if (model.id.startsWith('openai:')) provider = 'OpenAI';
      else if (model.id.startsWith('anthropic:')) provider = 'Anthropic';
      else if (model.id.startsWith('google:')) provider = 'Google';
      else if (model.id.startsWith('mistral:')) provider = 'Mistral';
      else if (model.id.startsWith('deepseek:')) provider = 'DeepSeek';
      else if (model.id.startsWith('x-ai:')) provider = 'xAI';
      else if (model.id.startsWith('meta-llama:')) provider = 'Meta Llama';

      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    }, {});

    // Sort providers
    const providerOrder = ['Google', 'Anthropic', 'OpenAI', 'Mistral', 'DeepSeek', 'xAI', 'Meta Llama', 'Local (Ollama)', 'Other'];
    const sortedProviders = Object.keys(grouped).sort((a, b) => {
      const indexA = providerOrder.indexOf(a);
      const indexB = providerOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedProviders.map(provider => (
      <optgroup key={provider} label={provider}>
        {grouped[provider].map(model => (
          <option key={model.id} value={model.id}>
            {model.name} {model.is_free && selectedLlmProvider === 'openrouter' ? '(Free)' : ''}
          </option>
        ))}
      </optgroup>
    ));
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-content">

          {/* LLM Provider Selection with Nested Configs */}
          <section className="settings-section">
            <h3>LLM Provider</h3>
            <p className="section-description">
              Choose between cloud-based models (OpenRouter), local models (Ollama), direct API keys, or a mix.
            </p>

            <div className="provider-options">
              {LLM_PROVIDERS.map(provider => (
                <div
                  key={provider.id}
                  className={`provider-option-container ${selectedLlmProvider === provider.id ? 'selected' : ''}`}
                >
                  <label className="provider-option">
                    <input
                      type="radio"
                      name="llm_provider"
                      value={provider.id}
                      checked={selectedLlmProvider === provider.id}
                      onChange={(e) => setSelectedLlmProvider(e.target.value)}
                    />
                    <div className="provider-info">
                      <span className="provider-name">{provider.name}</span>
                      <span className="provider-description">{provider.description}</span>
                    </div>
                  </label>

                  {/* Nested Configuration Sections */}

                  {/* OpenRouter Config */}
                  {provider.id === 'openrouter' && (selectedLlmProvider === 'openrouter' || selectedLlmProvider === 'hybrid') && (
                    <div className="provider-config-nested">
                      <div className="api-key-section">
                        <label>OpenRouter API Key</label>
                        <div className="api-key-input-row">
                          <input
                            type="password"
                            placeholder={settings?.openrouter_api_key_set ? '••••••••••••••••' : 'Enter API key'}
                            value={openrouterApiKey}
                            onChange={(e) => {
                              setOpenrouterApiKey(e.target.value);
                              setOpenrouterTestResult(null);
                            }}
                            className={settings?.openrouter_api_key_set && !openrouterApiKey ? 'key-configured' : ''}
                          />
                          <button
                            className="test-button"
                            onClick={handleTestOpenRouter}
                            disabled={!openrouterApiKey && !settings?.openrouter_api_key_set || isTestingOpenRouter}
                          >
                            {isTestingOpenRouter ? 'Testing...' : (settings?.openrouter_api_key_set && !openrouterApiKey ? 'Retest' : 'Test')}
                          </button>
                        </div>
                        {settings?.openrouter_api_key_set && !openrouterApiKey && (
                          <div className="key-status set">✓ API key configured</div>
                        )}
                        {openrouterTestResult && (
                          <div className={`test-result ${openrouterTestResult.success ? 'success' : 'error'}`}>
                            {openrouterTestResult.message}
                          </div>
                        )}
                        <p className="api-key-hint">
                          Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai</a>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ollama Config */}
                  {provider.id === 'ollama' && (selectedLlmProvider === 'ollama' || selectedLlmProvider === 'hybrid') && (
                    <div className="provider-config-nested">
                      <div className="api-key-section">
                        <label>Ollama Base URL</label>
                        <div className="api-key-input-row">
                          <input
                            type="text"
                            placeholder="http://localhost:11434"
                            value={ollamaBaseUrl}
                            onChange={(e) => {
                              setOllamaBaseUrl(e.target.value);
                              setOllamaTestResult(null);
                            }}
                          />
                          <button
                            className="test-button"
                            onClick={handleTestOllama}
                            disabled={!ollamaBaseUrl || isTestingOllama}
                          >
                            {isTestingOllama ? 'Testing...' : 'Connect'}
                          </button>
                        </div>
                        {ollamaTestResult && (
                          <div className={`test-result ${ollamaTestResult.success ? 'success' : 'error'}`}>
                            {ollamaTestResult.message}
                          </div>
                        )}

                        {/* Auto-connection status */}
                        {ollamaStatus && ollamaStatus.connected && (
                          <div className="ollama-auto-status connected">
                            <span className="status-indicator connected">●</span>
                            <span className="status-text">
                              <strong>Connected to Ollama</strong> <span className="status-separator">·</span> <span className="status-time">Last checked: {new Date(ollamaStatus.lastConnected).toLocaleString()}</span>
                            </span>
                          </div>
                        )}
                        {ollamaStatus && !ollamaStatus.connected && !ollamaStatus.testing && (
                          <div className="ollama-auto-status">
                            <span className="status-indicator disconnected">●</span>
                            <span className="status-text">Not connected</span>
                          </div>
                        )}

                        <p className="api-key-hint">
                          Default is http://localhost:11434
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Direct Config */}
                  {provider.id === 'direct' && (selectedLlmProvider === 'direct' || selectedLlmProvider === 'hybrid') && (
                    <div className="provider-config-nested">
                      {DIRECT_PROVIDERS.map(dp => (
                        <div key={dp.id} className="api-key-section" style={{ marginTop: '10px' }}>
                          <label>{dp.name} API Key</label>
                          <div className="api-key-input-row">
                            <input
                              type="password"
                              placeholder={settings?.[`${dp.key}_set`] ? '••••••••••••••••' : 'Enter API key'}
                              value={directKeys[dp.key]}
                              onChange={e => setDirectKeys(prev => ({ ...prev, [dp.key]: e.target.value }))}
                              className={settings?.[`${dp.key}_set`] && !directKeys[dp.key] ? 'key-configured' : ''}
                            />
                            <button
                              className="test-button"
                              onClick={() => handleTestDirectKey(dp.id, dp.key)}
                              disabled={(!directKeys[dp.key] && !settings?.[`${dp.key}_set`]) || validatingKeys[dp.id]}
                            >
                              {validatingKeys[dp.id] ? 'Testing...' : (settings?.[`${dp.key}_set`] && !directKeys[dp.key] ? 'Retest' : 'Test')}
                            </button>
                          </div>
                          {settings?.[`${dp.key}_set`] && !directKeys[dp.key] && (
                            <div className="key-status set">✓ API key configured</div>
                          )}
                          {keyValidationStatus[dp.id] && (
                            <div className={`test-result ${keyValidationStatus[dp.id].success ? 'success' : 'error'}`}>
                              {keyValidationStatus[dp.id].message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hybrid Note */}
                  {provider.id === 'hybrid' && selectedLlmProvider === 'hybrid' && (
                    <div className="provider-config-nested">
                      <p className="section-description" style={{ marginBottom: 0 }}>
                        Configure individual providers above (OpenRouter, Ollama, Direct) to use them in Hybrid mode.
                      </p>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </section>

          {/* Hybrid Mode Configuration - Redesigned Card Layout */}
          {selectedLlmProvider === 'hybrid' && (
            <div className="hybrid-settings-card">
              <span className="hybrid-section-header">Model Sources</span>

              {/* Primary Sources Group */}
              <div className="filter-group">
                <label className="toggle-wrapper">
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={hybridShowOpenRouter}
                      onChange={(e) => setHybridShowOpenRouter(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </div>
                  <span className="toggle-text">OpenRouter (Cloud)</span>
                </label>

                <label className="toggle-wrapper">
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={hybridShowLocal}
                      onChange={(e) => setHybridShowLocal(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </div>
                  <span className="toggle-text">Local (Ollama)</span>
                </label>
              </div>

              <div className="filter-divider"></div>

              {/* Direct Connections Group */}
              <div className="filter-group" style={{ marginBottom: hybridShowDirect ? '16px' : '0' }}>
                <label className="toggle-wrapper">
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={hybridShowDirect}
                      onChange={(e) => setHybridShowDirect(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </div>
                  <span className="toggle-text">Direct Connections</span>
                </label>
              </div>

              {/* Direct Providers Grid */}
              {hybridShowDirect && (
                <div className="direct-grid">
                  {Object.keys(hybridDirectProviders).map(provider => (
                    <label key={provider} className="toggle-wrapper">
                      <div className="toggle-switch" style={{ width: '34px', height: '20px' }}>
                        <input
                          type="checkbox"
                          checked={hybridDirectProviders[provider]}
                          onChange={(e) => setHybridDirectProviders(prev => ({
                            ...prev,
                            [provider]: e.target.checked
                          }))}
                        />
                        <span className="slider" style={{ borderRadius: '20px' }}></span>
                        <style>{`
                          .direct-grid .slider:before {
                            height: 16px;
                            width: 16px;
                            left: 2px;
                            bottom: 2px;
                          }
                          .direct-grid input:checked + .slider:before {
                            transform: translateX(14px);
                          }
                        `}</style>
                      </div>
                      <span className="toggle-text" style={{ fontSize: '13px' }}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Utility Models Selection */}
          <section className="settings-section">
            <h3>Utility Models</h3>
            <p className="section-description">
              Select models for generating optimized search queries from user questions.
            </p>

            {/* Search Query Model */}
            <div className="council-member-row">
              <span className="member-label">Search Query</span>
              {selectedLlmProvider === 'hybrid' && (
                <div className="model-type-toggle">
                  <button
                    type="button"
                    className={`type-btn ${!searchQueryModel.startsWith('ollama:') ? 'active' : ''}`}
                    onClick={() => {
                      if (availableModels.length > 0) setSearchQueryModel(availableModels[0].id);
                    }}
                  >
                    Remote
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${searchQueryModel.startsWith('ollama:') ? 'active' : ''}`}
                    onClick={() => {
                      if (ollamaAvailableModels.length > 0) setSearchQueryModel(`ollama:${ollamaAvailableModels[0].id}`);
                    }}
                  >
                    Local
                  </button>
                </div>
              )}
              <select
                value={searchQueryModel}
                onChange={(e) => setSearchQueryModel(e.target.value)}
                className="model-select"
              >
                {(selectedLlmProvider === 'ollama' || (selectedLlmProvider === 'hybrid' && searchQueryModel.startsWith('ollama:'))) ? (
                  ollamaAvailableModels.map(model => (
                    <option key={model.id} value={`ollama:${model.id}`}>
                      {model.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="">Select a model</option>
                    {renderModelOptions(currentAvailableModels.filter(m => !m.id.startsWith('ollama:')))}
                  </>
                )}
              </select>
            </div>


          </section>

          {/* Model Selection (Context Sensitive) */}
          <section className="settings-section">
            <h3>Model Selection</h3>

            {(selectedLlmProvider === 'openrouter' || selectedLlmProvider === 'hybrid') && (
              <div className="model-options-row">
                <label className="free-filter-label">
                  <input
                    type="checkbox"
                    checked={showFreeOnly}
                    onChange={e => setShowFreeOnly(e.target.checked)}
                  />
                  Show free OpenRouter models only
                </label>
                {isLoadingModels && <span className="loading-models">Loading models...</span>}
              </div>
            )}
            {(selectedLlmProvider === 'ollama' || selectedLlmProvider === 'hybrid') && (
              <div className="model-options-row">
                <button
                  type="button"
                  className="reset-defaults-button"
                  onClick={() => loadOllamaModels(ollamaBaseUrl)}
                >
                  Refresh Local Models
                </button>
                {ollamaAvailableModels.length === 0 && <span className="error-text">No local models found. Check connection.</span>}
              </div>
            )}



            {/* Council Members */}
            <div className="subsection" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>Council Members</h4>
              </div>
              <div className="council-members">
                {currentCouncilModels.map((modelId, index) => {
                  // Determine filter mode for this row (only relevant for Hybrid)
                  const isHybrid = selectedLlmProvider === 'hybrid';
                  const filter = isHybrid ? getRowFilter(index, modelId) : null;

                  // Filter options based on mode
                  let options = filteredModels;
                  if (isHybrid) {
                    if (filter === 'local') {
                      options = filteredModels.filter(m => m.id.startsWith('ollama:'));
                    } else {
                      options = filteredModels.filter(m => !m.id.startsWith('ollama:'));
                    }
                  }

                  return (
                    <div key={index} className="council-member-row">
                      <span className="member-label">Member {index + 1}</span>

                      {isHybrid && (
                        <div className="model-type-toggle">
                          <button
                            type="button"
                            className={`type-btn ${filter === 'remote' ? 'active' : ''}`}
                            onClick={() => toggleRowFilter(index, 'remote')}
                          >
                            Remote
                          </button>
                          <button
                            type="button"
                            className={`type-btn ${filter === 'local' ? 'active' : ''}`}
                            onClick={() => toggleRowFilter(index, 'local')}
                          >
                            Local
                          </button>
                        </div>
                      )}

                      <select
                        value={modelId}
                        onChange={e => handleCouncilModelChange(index, e.target.value)}
                        className="model-select"
                      >
                        {renderModelOptions(options)}
                        {/* Keep current selection visible even if filtered out */}
                        {!options.find(m => m.id === modelId) && (
                          <option value={modelId}>
                            {currentAvailableModels.find(m => m.id === modelId)?.name || modelId}
                          </option>
                        )}
                      </select>
                      <button
                        type="button"
                        className="remove-member-button"
                        onClick={() => handleRemoveCouncilMember(index)}
                        disabled={currentCouncilModels.length <= 2}
                        title="Remove member"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="add-member-button"
                onClick={handleAddCouncilMember}
                disabled={filteredModels.length === 0 || currentCouncilModels.length >= 8}
              >
                + Add Council Member
              </button>
              {currentCouncilModels.length >= 6 && (selectedLlmProvider !== 'ollama') && (
                <div className="council-size-warning">
                  ⚠️ <strong>6+ members:</strong> To avoid rate limits, we'll process requests in batches of 3. Max 8 members allowed.
                </div>
              )}
              {currentCouncilModels.length >= 8 && (
                <div className="council-size-info">
                  ✓ Maximum council size (8 members) reached
                </div>
              )}
            </div>

            {/* Chairman */}
            <div className="subsection" style={{ marginTop: '20px' }}>
              <h4>Chairman Model</h4>
              <div className="chairman-selection" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {selectedLlmProvider === 'hybrid' && (
                  <div className="model-type-toggle">
                    <button
                      type="button"
                      className={`type-btn ${getChairmanFilter(currentChairmanModel) === 'remote' ? 'active' : ''}`}
                      onClick={() => setChairmanFilter('remote')}
                    >
                      Remote
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${getChairmanFilter(currentChairmanModel) === 'local' ? 'active' : ''}`}
                      onClick={() => setChairmanFilter('local')}
                    >
                      Local
                    </button>
                  </div>
                )}

                <select
                  value={currentChairmanModel}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (selectedLlmProvider === 'openrouter') setChairmanModel(newValue);
                    else if (selectedLlmProvider === 'ollama') setOllamaChairmanModel(newValue);
                    else setHybridChairmanModel(newValue);
                  }}
                  className="model-select"
                  style={{ flex: 1 }}
                >
                  {renderModelOptions(getFilteredModels(getChairmanFilter(currentChairmanModel)))}
                  {/* Keep current selection visible even if filtered out */}
                  {!getFilteredModels(getChairmanFilter(currentChairmanModel)).find(m => m.id === currentChairmanModel) && currentChairmanModel && (
                    <option value={currentChairmanModel}>
                      {currentAvailableModels.find(m => m.id === currentChairmanModel)?.name || currentChairmanModel}
                      {(selectedLlmProvider !== 'ollama' && !currentChairmanModel.startsWith('ollama:')) ? ' (not recommended)' : ''}
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Import / Export Configuration */}
            <div className="subsection" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 4px 0' }}>Import / Export Configuration</h4>
              <p className="section-description" style={{ marginBottom: '12px' }}>
                Save your current setup (models, providers, prompts) to a file or load a previous configuration.
                Useful for switching between different testing scenarios.
              </p>
              <div className="council-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="file"
                  id="import-council"
                  style={{ display: 'none' }}
                  accept=".json"
                  onChange={handleImportCouncil}
                />
                <button
                  className="action-btn"
                  onClick={() => document.getElementById('import-council').click()}
                  title="Import Configuration"
                >
                  Import
                </button>
                <button
                  className="action-btn"
                  onClick={handleExportCouncil}
                  title="Export Configuration"
                >
                  Export
                </button>
              </div>
            </div>
          </section>

          {/* System Prompts Section */}
          <section className="settings-section">
            <h3>System Prompts</h3>
            <p className="section-description">
              Customize the system instructions for each stage of the council process.
            </p>

            <div className="prompts-tabs">
              <button
                className={`prompt-tab ${activePromptTab === 'search' ? 'active' : ''}`}
                onClick={() => setActivePromptTab('search')}
              >
                Search Query
              </button>
              <button
                className={`prompt-tab ${activePromptTab === 'stage1' ? 'active' : ''}`}
                onClick={() => setActivePromptTab('stage1')}
              >
                Stage 1
              </button>
              <button
                className={`prompt-tab ${activePromptTab === 'stage2' ? 'active' : ''}`}
                onClick={() => setActivePromptTab('stage2')}
              >
                Stage 2
              </button>
              <button
                className={`prompt-tab ${activePromptTab === 'stage3' ? 'active' : ''}`}
                onClick={() => setActivePromptTab('stage3')}
              >
                Stage 3
              </button>
            </div>

            <div className="prompt-editor">
              {activePromptTab === 'search' && (
                <div className="prompt-content">
                  <label>Search Query Generation</label>
                  <p className="section-description" style={{ marginBottom: '10px' }}>
                    Generates optimized search terms from user questions for web search.
                  </p>
                  <p className="prompt-help">Variables: <code>{'{user_query}'}</code></p>
                  <textarea
                    value={prompts.search_query_prompt}
                    onChange={(e) => handlePromptChange('search_query_prompt', e.target.value)}
                    rows={5}
                  />
                  <button className="reset-prompt-btn" onClick={() => handleResetPrompt('search_query_prompt')}>Reset to Default</button>
                </div>
              )}
              {activePromptTab === 'stage1' && (
                <div className="prompt-content">
                  <label>Stage 1: Initial Response</label>
                  <p className="section-description" style={{ marginBottom: '10px' }}>
                    Guides council members' initial responses to user questions.
                  </p>
                  <p className="prompt-help">Variables: <code>{'{user_query}'}</code>, <code>{'{search_context_block}'}</code></p>
                  <textarea
                    value={prompts.stage1_prompt}
                    onChange={(e) => handlePromptChange('stage1_prompt', e.target.value)}
                    rows={10}
                  />
                  <button className="reset-prompt-btn" onClick={() => handleResetPrompt('stage1_prompt')}>Reset to Default</button>
                </div>
              )}
              {activePromptTab === 'stage2' && (
                <div className="prompt-content">
                  <label>Stage 2: Peer Ranking</label>
                  <p className="section-description" style={{ marginBottom: '10px' }}>
                    Instructs models how to rank and evaluate peer responses.
                  </p>
                  <p className="prompt-help">Variables: <code>{'{user_query}'}</code>, <code>{'{responses_text}'}</code>, <code>{'{search_context_block}'}</code></p>
                  <textarea
                    value={prompts.stage2_prompt}
                    onChange={(e) => handlePromptChange('stage2_prompt', e.target.value)}
                    rows={10}
                  />
                  <button className="reset-prompt-btn" onClick={() => handleResetPrompt('stage2_prompt')}>Reset to Default</button>
                </div>
              )}
              {activePromptTab === 'stage3' && (
                <div className="prompt-content">
                  <label>Stage 3: Chairman Synthesis</label>
                  <p className="section-description" style={{ marginBottom: '10px' }}>
                    Directs the chairman to synthesize a final answer from all inputs.
                  </p>
                  <p className="prompt-help">Variables: <code>{'{user_query}'}</code>, <code>{'{stage1_text}'}</code>, <code>{'{stage2_text}'}</code>, <code>{'{search_context_block}'}</code></p>
                  <textarea
                    value={prompts.stage3_prompt}
                    onChange={(e) => handlePromptChange('stage3_prompt', e.target.value)}
                    rows={10}
                  />
                  <button className="reset-prompt-btn" onClick={() => handleResetPrompt('stage3_prompt')}>Reset to Default</button>
                </div>
              )}
            </div>
          </section>

          {/* Web Search Config */}
          <section className="settings-section">
            <h3>Web Search Provider</h3>
            <div className="provider-options">
              {SEARCH_PROVIDERS.map(provider => (
                <div key={provider.id} className={`provider-option-container ${selectedSearchProvider === provider.id ? 'selected' : ''}`}>
                  <label
                    className="provider-option"
                  >
                    <input
                      type="radio"
                      name="search_provider"
                      value={provider.id}
                      checked={selectedSearchProvider === provider.id}
                      onChange={() => setSelectedSearchProvider(provider.id)}
                    />
                    <div className="provider-info">
                      <span className="provider-name">{provider.name}</span>
                      <span className="provider-description">{provider.description}</span>
                    </div>
                  </label>

                  {/* Inline API Key Input for Tavily */}
                  {selectedSearchProvider === 'tavily' && provider.id === 'tavily' && (
                    <div className="inline-api-key-section">
                      <div className="api-key-input-row">
                        <input
                          type="password"
                          placeholder={settings.tavily_api_key_set ? '••••••••••••••••' : 'Enter Tavily API key'}
                          value={tavilyApiKey}
                          onChange={e => {
                            setTavilyApiKey(e.target.value);
                            setTavilyTestResult(null);
                          }}
                          className={settings.tavily_api_key_set && !tavilyApiKey ? 'key-configured' : ''}
                        />
                        <button
                          type="button"
                          className="test-button"
                          onClick={handleTestTavily}
                          disabled={isTestingTavily || (!tavilyApiKey && !settings.tavily_api_key_set)}
                        >
                          {isTestingTavily ? 'Testing...' : (settings.tavily_api_key_set && !tavilyApiKey ? 'Retest' : 'Test')}
                        </button>
                      </div>
                      {settings.tavily_api_key_set && !tavilyApiKey && (
                        <div className="key-status set">✓ API key configured</div>
                      )}
                      {tavilyTestResult && (
                        <div className={`test-result ${tavilyTestResult.success ? 'success' : 'error'}`}>
                          {tavilyTestResult.success ? '✓' : '✗'} {tavilyTestResult.message}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline API Key Input for Brave */}
                  {selectedSearchProvider === 'brave' && provider.id === 'brave' && (
                    <div className="inline-api-key-section">
                      <div className="api-key-input-row">
                        <input
                          type="password"
                          placeholder={settings.brave_api_key_set ? '••••••••••••••••' : 'Enter Brave API key'}
                          value={braveApiKey}
                          onChange={e => {
                            setBraveApiKey(e.target.value);
                            setBraveTestResult(null);
                          }}
                          className={settings.brave_api_key_set && !braveApiKey ? 'key-configured' : ''}
                        />
                        <button
                          type="button"
                          className="test-button"
                          onClick={handleTestBrave}
                          disabled={isTestingBrave || (!braveApiKey && !settings.brave_api_key_set)}
                        >
                          {isTestingBrave ? 'Testing...' : (settings.brave_api_key_set && !braveApiKey ? 'Retest' : 'Test')}
                        </button>
                      </div>
                      {settings.brave_api_key_set && !braveApiKey && (
                        <div className="key-status set">✓ API key configured</div>
                      )}
                      {braveTestResult && (
                        <div className={`test-result ${braveTestResult.success ? 'success' : 'error'}`}>
                          {braveTestResult.success ? '✓' : '✗'} {braveTestResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="full-content-section">
              <label>Full Article Fetch (Jina AI)</label>
              <p className="setting-description">
                Uses Jina AI to read the full text of the top search results. This gives the Council deeper context than just search snippets. Applies to all search providers. <strong>Set to 0 to disable.</strong>
              </p>
              <div className="full-content-input-row">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={fullContentResults}
                  onChange={e => setFullContentResults(parseInt(e.target.value, 10))}
                  className="full-content-slider"
                />
                <span className="full-content-value">{fullContentResults} results</span>
              </div>
            </div>
          </section>

        </div>

        <div className="settings-footer">
          {error && <div className="settings-error">{error}</div>}
          {success && <div className="settings-success">Settings saved!</div>}
          <button className="reset-button" type="button" onClick={handleResetToDefaults}>
            Reset to Defaults
          </button>
          <div className="footer-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'Saving...' : (success ? 'Saved!' : 'Save')}
            </button>
          </div>
        </div>
      </div >
      {showResetConfirm && (
        <div className="settings-overlay confirmation-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="settings-modal confirmation-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Confirm Reset</h2>
            </div>
            <div className="settings-content confirmation-content">
              <p>Are you sure you want to reset to defaults?</p>
              <div className="confirmation-details">
                <p><strong>This will reset:</strong></p>
                <ul>
                  <li>All model selections</li>
                  <li>System prompts</li>
                  <li>Utility models</li>
                  <li>General settings</li>
                </ul>
                <p className="confirmation-safe">✓ API keys will be PRESERVED</p>
              </div>
            </div>
            <div className="settings-footer">
              <div className="footer-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
                <button className="cancel-button" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                <button className="reset-button" onClick={confirmResetToDefaults}>Confirm Reset</button>
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}