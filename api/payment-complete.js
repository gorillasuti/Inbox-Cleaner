export default function handler(req, res) {
  const { extension_id, status = 'success' } = req.query;

  if (!extension_id) {
    return res.status(400).send('Missing extension_id');
  }

  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Payment ${status === 'success' ? 'Successful' : 'Cancelled'}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8f9fa; color: #333; margin: 0; }
        .icon { font-size: 48px; margin-bottom: 20px; }
        .success { color: #10b981; }
        .cancel { color: #ef4444; }
        button { padding: 12px 24px; background: #333; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 20px; font-size: 16px; font-weight: 500; transition: opacity 0.2s; }
        button:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="icon ${status === 'success' ? 'success' : 'cancel'}">
        ${status === 'success' ? '✅' : '❌'}
    </div>
    <h2>${status === 'success' ? 'Payment Successful!' : 'Payment Cancelled'}</h2>
    <p>You can close this tab now.</p>
    <button onclick="window.close()">Close Tab</button>
    <p style="margin-top: 20px; font-size: 12px; color: #666;">If the tab doesn't close automatically, please close it manually.</p>
    <script>
        setTimeout(() => {
            window.close();
        }, 2000);
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
