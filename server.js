const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

const app = express();

const https = require('https');
const agent = new https.Agent({ family: 4 }); // Force IPv4
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  httpAgent: agent
});

// ✅ Enable CORS
app.use(cors());

/** 🛑 Webhook must come BEFORE express.json() */
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const sessionId = session.id;

    console.log('✅ Preorder complete:', email);

    // ✅ Send to Google Apps Script for logging + confirmation email
    try {
      await axios.post('https://script.google.com/macros/s/AKfycbyD6ouOju5KS1wo2l-UgrHmB8VcwIy5GZfwG1JpFTN9Z7tdgW5L5xncIqC7A2tzWa1R/exec', null, {
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

// ✅ Safe to parse JSON after webhook
app.use(express.json());
app.use(express.static('public')); // Optional: serve static assets

// ✅ Checkout session creator
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1RkXk3L4RMbs0zdIZUKnLgmB', // Replace with your actual Stripe Price ID
          quantity: 1,
        },
      ],
      success_url: 'https://chatrbox.petitek.com/success',
      cancel_url: 'https://chatrbox.petitek.com/cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

