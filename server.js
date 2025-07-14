const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// ✅ Enable CORS
app.use(cors());

// ✅ Parse JSON request bodies
app.use(express.json());

// ✅ Serve static files if needed
app.use(express.static('public'));

// ✅ Stripe Checkout Session Endpoint
app.post('/create-checkout-session', async (req, res) => {
  console.log('🔁 Creating Stripe checkout session...');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1RkXk3L4RMbs0zdIZUKnLgmB', // ⚠️ Replace with a valid Stripe Price ID
          quantity: 1,
        },
      ],
      success_url: 'https://chatrbox.petitek.com/success',
      cancel_url: 'https://chatrbox.petitek.com/cancel',
    });

    console.log('✅ Session created:', session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});



