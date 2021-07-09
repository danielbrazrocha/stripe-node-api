const express = require("express");
const cors = require('cors')
const app = express();
require('dotenv/config');
// This is your real test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

app.use(require('body-parser').text({type: '*/*'}));
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.use(express.static("."));
app.use(express.json());
app.use(cors());

const calculateOrderAmount = items => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  // Valor multiplica-se por 100 => 2200 é 22,00
  return 3500;
};

app.post("/create-payment-intent", async (req, res) => {
  //console.log(['paymentIntentFull'], paymentIntent)
  const { items } = req.body;
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: "brl",
    metadata: {
      order_id: '6735'
    },
  });
  console.log(['paymentIntentFull'], paymentIntent)

  res.send({
    
    clientSecret: paymentIntent.client_secret
  });
});

app.get("/products", async (req, res) => {
  //List all products
  const products = await stripe.products.list({
    active: true, //apenas os ativos, produtos desabilitados nao mais vendidos nao aparecerão
    limit: 15, //limita o total de resultados
  });

  res.send({
    products
  });
});

// app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
//   const event = request.body;
//   console.log(["webhook return"], request.body)
//   // Handle the event
//   switch (event.type) {
//     case 'payment_intent.succeeded':
//       const paymentIntent = event.data.object;
//       console.log(["webhook return"], paymentIntent)
//       console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
//       // Then define and call a method to handle the successful payment intent.
//       // handlePaymentIntentSucceeded(paymentIntent);
//       break;
//     case 'payment_method.attached':
//       const paymentMethod = event.data.object;
//       // Then define and call a method to handle the successful attachment of a PaymentMethod.
//       // handlePaymentMethodAttached(paymentMethod);
//       break;
//     default:
//       // Unexpected event type
//       console.log(`Unhandled event type ${event.type}.`);
//   }
//   // Return a 200 response to acknowledge receipt of the event
//   response.send();
// });

app.post('/webhook', function(request, response) {
  const sig = request.headers['stripe-signature'];
  const body = request.body;
  console.log(["webhook return"], body)

  let event = null;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    // invalid signature
    response.status(400).end();
    return;
  }

  let intent = null;
  // eslint-disable-next-line default-case
  switch (event['type']) {
    case 'payment_intent.succeeded':
      intent = event.data.object;
      console.log("Succeeded:", intent.id);
      break;
    case 'payment_intent.payment_failed':
      intent = event.data.object;
      const message = intent.last_payment_error && intent.last_payment_error.message;
      console.log('Failed:', intent.id, message);
      break;
  }

  response.sendStatus(200);
});

app.listen(4242, () => console.log('Node server listening on port 4242!'));
