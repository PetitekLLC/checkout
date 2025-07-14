const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1RkXk3L4RMbs0zdIZUKnLgmB',
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

app.get('/test-stripe', async (req, res) => {
  try {
    const result = await stripe.products.list({ limit: 1 });
    res.send(`✅ Stripe connected. Product count: ${result.data.length}`);
  } catch (err) {
    console.error('❌ Test Stripe connection failed:', err.message);
    res.status(500).send(`❌ Stripe error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});




