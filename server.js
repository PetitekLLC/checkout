const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Setup SendGrid Transport
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey', // Required by SendGrid
    pass: process.env.SENDGRID_API_KEY
  }
});

// ✅ Email Sender Function
async function sendConfirmationEmail(toEmail) {
  const mailOptions = {
    from: `"ChatrBox Support" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    replyTo: process.env.REPLY_TO || process.env.EMAIL_FROM,
    subject: 'Thanks for Preordering ChatrBox!',
    text: `Thanks for preordering ChatrBox! 🎉\n\nWe'll notify you when your order ships.\n\n– The Petitek Team 🐾`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to: ${toEmail}`);
  } catch (err) {
    console.error('❌ Email send error:', err.message);
  }
}

// ✅ Stripe Checkout Session Creator
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1RkXk3L4RMbs0zdIZUKnLgmB', // Update this if needed
          quantity: 1,
        },
      ],
      success_url: 'https://chatrbox.petitek.com/success',
      cancel_url: 'https://chatrbox.petitek.com/cancel',
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Stripe Webhook for Completed Checkout
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
    const email = session.customer_email;

    console.log('✅ Stripe checkout complete for:', email);
    await sendConfirmationEmail(email);
  }

  res.status(200).send('Webhook received');
});

// ✅ Start server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


