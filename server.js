const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios');

const app = express();

// Enable CORS and JSON body parsing v1.0
app.use(cors());
app.use(express.json());

// Force IPv4 to avoid TLS/DNS issues on Render
const agent = new https.Agent({ family: 4 });

// ✅ Live inventory tracking (in-memory)
let remainingInventory = 386;

// ✅ Create Stripe Checkout session via Axios
app.post('/create-checkout-session', async (req, res) => {
  console.log('🔁 Calling Stripe via Axios...');

  try {
    const response = await axios.post(
      'https://api.stripe.com/v1/checkout/sessions',
      new URLSearchParams({
        mode: 'payment',

        // ✅ REQUIRED to ensure full customer info is collected
        'customer_creation': 'always',
        'phone_number_collection[enabled]': 'true',
        'shipping_address_collection[allowed_countries][]': 'US',

        // ✅ TEST price and shipping rate IDs
        'line_items[0][price]': 'price_1Rs5a6L4RMbs0zdIW43fmfoc', // $59.95 test price
        'line_items[0][quantity]': '1',
        'shipping_options[0][shipping_rate]': 'shr_1Rs4yUL4RMbs0zdIIWlZeG8J',

        // ✅ Redirect URLs
        success_url: 'https://chatrbox.petitek.com/success',
        cancel_url: 'https://chatrbox.petitek.com'

        // ❌ LIVE MODE — uncomment these when going live
        // 'line_items[0][price]': 'price_1RlYtYL4RMbs0zdIDJfFm9Yb',
        // 'shipping_options[0][shipping_rate]': 'shr_1RlZB5L4RMbs0zdIHQmkKy9t',
      }),
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, // Must be sk_test_... for now
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

// ✅ GET: Return current inventory
app.get('/remaining-count', (req, res) => {
  res.json({ remaining: remainingInventory });
});

// ✅ POST: Decrease inventory ONCE (if > 0)
app.post('/decrement-count', (req, res) => {
  if (remainingInventory > 0) {
    remainingInventory--;
    console.log(`📉 Inventory decremented. Remaining: ${remainingInventory}`);
    res.json({ remaining: remainingInventory });
  } else {
    res.json({ remaining: 0 });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


