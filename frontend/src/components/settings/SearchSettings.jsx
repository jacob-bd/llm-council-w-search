import React from 'react';

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

export default function SearchSettings({
    settings,
    selectedSearchProvider,
    setSelectedSearchProvider,
    // Tavily
    tavilyApiKey,
    setTavilyApiKey,
    handleTestTavily,
    isTestingTavily,
    tavilyTestResult,
    setTavilyTestResult,
    // Brave
    braveApiKey,
    setBraveApiKey,
    handleTestBrave,
    isTestingBrave,
    braveTestResult,
    setBraveTestResult,
    // Other Settings
    fullContentResults,
    setFullContentResults,
    searchKeywordExtraction,
    setSearchKeywordExtraction
}) {
    return (
        <section className="settings-section">
            <h3>Web Search Provider</h3>
            <div className="provider-options">
                {SEARCH_PROVIDERS.map(provider => (
                    <div key={provider.id} className={`provider-option-container ${selectedSearchProvider === provider.id ? 'selected' : ''}`}>
                        <label className="provider-option">
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
                                        placeholder={settings?.tavily_api_key_set ? '••••••••••••••••' : 'Enter Tavily API key'}
                                        value={tavilyApiKey}
                                        onChange={e => {
                                            setTavilyApiKey(e.target.value);
                                            if (setTavilyTestResult) setTavilyTestResult(null);
                                        }}
                                        className={settings?.tavily_api_key_set && !tavilyApiKey ? 'key-configured' : ''}
                                    />
                                    <button
                                        type="button"
                                        className="test-button"
                                        onClick={handleTestTavily}
                                        disabled={isTestingTavily || (!tavilyApiKey && !settings?.tavily_api_key_set)}
                                    >
                                        {isTestingTavily ? 'Testing...' : (settings?.tavily_api_key_set && !tavilyApiKey ? 'Retest' : 'Test')}
                                    </button>
                                </div>
                                {settings?.tavily_api_key_set && !tavilyApiKey && (
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
                                        placeholder={settings?.brave_api_key_set ? '••••••••••••••••' : 'Enter Brave API key'}
                                        value={braveApiKey}
                                        onChange={e => {
                                            setBraveApiKey(e.target.value);
                                            if (setBraveTestResult) setBraveTestResult(null);
                                        }}
                                        className={settings?.brave_api_key_set && !braveApiKey ? 'key-configured' : ''}
                                    />
                                    <button
                                        type="button"
                                        className="test-button"
                                        onClick={handleTestBrave}
                                        disabled={isTestingBrave || (!braveApiKey && !settings?.brave_api_key_set)}
                                    >
                                        {isTestingBrave ? 'Testing...' : (settings?.brave_api_key_set && !braveApiKey ? 'Retest' : 'Test')}
                                    </button>
                                </div>
                                {settings?.brave_api_key_set && !braveApiKey && (
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
                    Uses Jina AI to read the full text of the top search results.
                    <strong> Set to 0 to disable.</strong>
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

            <div className="keyword-extraction-section" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <label>Search Query Processing</label>
                <p className="setting-description">
                    Choose how your prompt is sent to the search engine.
                </p>

                <div className="provider-options">
                    <div className={`provider-option-container ${searchKeywordExtraction === 'direct' ? 'selected' : ''}`}>
                        <label className="provider-option">
                            <input
                                type="radio"
                                name="keyword_extraction"
                                value="direct"
                                checked={searchKeywordExtraction === 'direct'}
                                onChange={() => setSearchKeywordExtraction('direct')}
                            />
                            <div className="provider-info">
                                <span className="provider-name">Direct (Recommended)</span>
                                <span className="provider-description">
                                    Send your exact query to the search engine. Best for modern semantic search engines like Tavily and Brave.
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className={`provider-option-container ${searchKeywordExtraction === 'yake' ? 'selected' : ''}`}>
                        <label className="provider-option">
                            <input
                                type="radio"
                                name="keyword_extraction"
                                value="yake"
                                checked={searchKeywordExtraction === 'yake'}
                                onChange={() => setSearchKeywordExtraction('yake')}
                            />
                            <div className="provider-info">
                                <span className="provider-name">Smart Keywords (Yake)</span>
                                <span className="provider-description">
                                    Extract key terms from your prompt before searching. Useful if you paste very long prompts that confuse the search engine.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </section>
    );
}
