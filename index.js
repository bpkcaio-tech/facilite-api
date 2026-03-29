const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/api/criar-pagamento', async (req, res) => {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token não configurado' });
  const { valor, descricao, email, nome, userId } = req.body;
  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Idempotency-Key': 'facilite-' + (userId || 'anon') + '-' + Date.now()
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: descricao || 'Facilite Premium',
        payment_method_id: 'pix',
        payer: {
          email: email || 'usuario@facilite.app',
          first_name: (nome || 'Usuario').split(' ')[0],
          last_name: (nome || 'Usuario').split(' ').slice(1).join(' ') || 'Facilite'
        },
        metadata: { userId: userId || 'anonimo' }
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data.message });
    return res.json({
      id: data.id,
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/verificar-pagamento', async (req, res) => {
  const token = process.env.MP_ACCESS_TOKEN;
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID não fornecido' });
  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments/' + id, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    return res.json({ status: data.status });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Facilite API rodando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API rodando na porta ' + PORT));