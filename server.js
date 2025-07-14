const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios');

const app = express();

// ✅ Enable CORS
app.use(cors());

// ✅ IPv4 agent (optional, but safe for webhook)
const agent = new https.Agent({ family: 4 });

// ✅ Safe to parse JSON after webhook
app.use(express.json());
app.use(express.static('public'));

/** 🛑 Webhook must come BEFORE express.json() */
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { httpAgent: agent });
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const sessionId = session.id;

    console.log('✅ Preorder complete:', email);

    // ✅ Log to Google Sheets (optional)
    try {
      await axios.post('https://script.google.com/macros/s/AKfycbxbZ3AfExjF7gN0CvNlCFfJAy6kfknNahr-FuSHWGEhMMAP3rftPQn_AeTX_rqsEHp56Q/exec', null, {
        params: {
          email,
          session: sessionId,
          secret: 'chatrbox-partner-2121'
        }
      });
      console.log('✅ Logged to Google Sheet & email sent');
    } catch (err) {
      console.error('❌ Failed to send to Google Script:', err.message);
    }
  }

  res.status(200).send('Received');
});

// ✅ Create Checkout Session using Axios (not SDK)
app.post('/create-checkout-session', async (req, res) => {
  console.log('🔁 Calling Stripe API via Axios...');

  try {
    const sessionRes = await axios.post(
      'https://api.stripe.com/v1/checkout/sessions',
      new URLSearchParams({
        mode: 'payment',
        'line_items[0][price]': 'price_1RkXk3L4RMbs0zdIZUKnLgmB',
        'line_items[0][quantity]': '1',
        success_url: 'https://chatrbox.petitek.com/success',
        cancel_url: 'https://chatrbox.petitek.com/cancel'
      }),
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent: agent
      }
    );

    const session = sessionRes.data;
    console.log('✅ Session created via Axios:', session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Axios Stripe error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Stripe API call failed' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

