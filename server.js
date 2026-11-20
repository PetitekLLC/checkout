const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

const agent = new https.Agent({ family: 4 });

let remainingInventory = 386;

const storefrontReturnUrls = {
  chatrbox: {
    success: 'https://chatrbox.petitek.com/success',
    cancel: 'https://chatrbox.petitek.com'
  },
  chatrboxpets: {
    success: 'https://chatrboxpets.com/success',
    cancel: 'https://chatrboxpets.com'
  }
};

app.post('/create-checkout-session', async (req, res) => {
  const storefront = typeof req.body?.storefront === 'string' ? req.body.storefront : 'chatrbox';
  const returnUrls = storefrontReturnUrls[storefront];
  if (!returnUrls) {
    return res.status(400).json({ error: 'Unsupported storefront' });
  }
  console.log('🔁 Calling Stripe via Axios...');

  try {
    const response = await axios.post(
      'https://api.stripe.com/v1/checkout/sessions',
      new URLSearchParams({
        mode: 'payment',

        // ✅ Ensure Stripe collects full customer info
        'customer_creation': 'always',
        'phone_number_collection[enabled]': 'true',
        'shipping_address_collection[allowed_countries][]': 'US',
        'payment_intent_data[setup_future_usage]': 'off_session',

        // ✅ Correct custom field for customer name
        'custom_fields[0][key]': 'customer_name',
        'custom_fields[0][label][type]': 'custom',
        'custom_fields[0][label][custom]': 'Customer Name',
        'custom_fields[0][type]': 'text',

        // ✅ Product and shipping details
        'line_items[0][price]': 'price_1Rs5a6L4RMbs0zdIW43fmfoc',
        'line_items[0][quantity]': '1',
        'shipping_options[0][shipping_rate]': 'shr_1Rs4yUL4RMbs0zdIIWlZeG8J',

        // ✅ Redirect URLs
        success_url: returnUrls.success,
        cancel_url: returnUrls.cancel
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
    console.error('❌ Stripe session creation failed:', err.message);
    if (err.response?.data) {
      console.error('🔎 Stripe Error Response:', JSON.stringify(err.response.data, null, 2));
    }
    res.status(500).json({ error: 'Stripe API call failed' });
  }
});

app.get('/remaining-count', (req, res) => {
  res.json({ remaining: remainingInventory });
});

app.post('/decrement-count', (req, res) => {
  if (remainingInventory > 0) {
    remainingInventory--;
    console.log(`📉 Inventory decremented. Remaining: ${remainingInventory}`);
    res.json({ remaining: remainingInventory });
  } else {
    res.json({ remaining: 0 });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
