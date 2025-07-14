const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios');

const app = express();

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Force IPv4 to avoid TLS/DNS issues on Render
const agent = new https.Agent({ family: 4 });

// ✅ Create Stripe Checkout session via Axios
app.post('/create-checkout-session', async (req, res) => {
  console.log('🔁 Calling Stripe via Axios...');

  try {
    const response = await axios.post(
      'https://api.stripe.com/v1/checkout/sessions',
      new URLSearchParams({
        mode: 'payment',
        'line_items[0][price]': 'price_1RkXk3L4RMbs0zdIZUKnLgmB', // Replace with your actual test/live price ID
        'line_items[0][quantity]': '1',
        success_url: 'https://chatrbox.petitek.com/success', // Page should return HTML quickly to avoid mobile download warning
        cancel_url: 'https://chatrbox.petitek.com'  // Avoid bare domain; point to a real page
      }),
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent: agent
      }
    );

    const session = response.data;
    console.log('✅ Stripe session created:', session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Axios Stripe error:', err.message);
    if (err.response?.data) {
      console.error('🔎 Full Stripe error:', JSON.stringify(err.response.data, null, 2));
    }
    res.status(500).json({ error: 'Stripe API call failed' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});




