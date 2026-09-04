'use client';

const AdTestPage = () => {
  const handleRunTest = () => {
    // Navigue la WebView entière vers l'URL de test officielle
    window.location.href = 'https://google.github.io/webview-ads/test/#api-for-ads-tests';
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>WebView Bridge Test</h1>
      <p>This page will test the connection to the native Google Mobile Ads SDK.</p>
      <button
        onClick={handleRunTest}
        style={{ padding: '15px 30px', fontSize: '18px', marginTop: '20px', cursor: 'pointer' }}
      >
        Run Google's Official Test
      </button>
    </div>
  );
};

export default AdTestPage;
