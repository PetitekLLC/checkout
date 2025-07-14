const express = require('express');
const cors = require('cors');
const https = require('https');

// ✅ Force IPv4 (optional — you can remove this if you want to go fully pre-axios v1.1)
const agent = new https.Agent({ family: 4 });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { httpAgent: agent });

const app = express();

// ✅ Enable CORS
app.use(cors());

/** 🛑 Webhook must come BEFORE express.json() */
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
    console.log('✅ Preorder complete:', session.customer_email);
    // No axios — just basic logging
  }

  res.status(200).send('Received');
});

// ✅ JSON body parsing must come after raw webhook
app.use(express.json());
app.use(express.static('public'));

// ✅ Stripe Checkout session creator
app.post('/create-checkout-session', async (req, res) => {
  console.log('🔁 Creating Stripe checkout session...');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1RkXk3L4RMbs0zdIZUKnLgmB', // Make sure this is valid
          quantity: 1,
        },
      ],
      success_url: 'https://chatrbox.petitek.com/success',
      cancel_url: 'https://chatrbox.petitek.com/cancel',
    });

    console.log('✅ Session created:', session.id);
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
