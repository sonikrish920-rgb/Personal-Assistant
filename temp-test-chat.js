const fetch = global.fetch || require('node-fetch');
(async () => {
  try {
    const res = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' })
    });
    console.log('status', res.status);
    console.log('body', await res.text());
  } catch (e) {
    console.error(e);
  }
})();
