const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios');

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Force IPv4 for stability
const agent = new https.Agent({ family: 4 });

// Replace this with your actual Stripe Price ID
const STRIPE_PRICE_ID = 'price_1RkXk3L4RMbs0zdIZUKnLgmB';

app.post('/create-checkout-session', async (req, res) => {
  console.log('🔁 Creating Stripe session with Axios...');
  try {
    const response = await axios.post(
      'https://api.stripe.com/v1/checkout/sessions',
      new URLSearchParams({
        mode: 'payment',
        'line_items[0][price]': STRIPE_PRICE_ID,
        'line_items[0][quantity]': '1',
        success_url: 'https://chatrbox.petitek.com/success',
        cancel_url: 'https://chatrbox.petitek.com/cancel',
      }),
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: agent,
      }
    );

    const session = response.data;
    console.log('✅ Session created:', session.id);
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



