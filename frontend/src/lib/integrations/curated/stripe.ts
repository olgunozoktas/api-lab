/** Olgun Özoktaş geliştirdi · API Lab */
// Stripe — curated essentials. A hand-picked slice of the API (the
// full `spec3.json` is ~7.8 MB / 500+ operations). Covers the everyday
// surfaces: customers, payment intents, charges, subscriptions,
// invoices. Stripe takes `application/x-www-form-urlencoded` bodies —
// the curated skeletons use `form` mode (key=value&key=value), not JSON.
import type { CuratedProvider } from "./types";

export const stripeCurated: CuratedProvider = {
  baseUrl: "https://api.stripe.com/v1",
  endpoints: [
    {
      group: "Customers",
      name: "List customers",
      method: "GET",
      path: "/customers",
      description: "List customers, most recent first.",
    },
    {
      group: "Customers",
      name: "Create customer",
      method: "POST",
      path: "/customers",
      description: "Create a new customer.",
      body: { mode: "form", text: "email=jenny@example.com&name=Jenny Rosen&description=" },
    },
    {
      group: "Customers",
      name: "Retrieve customer",
      method: "GET",
      path: "/customers/{customer}",
      description: "Fetch a single customer by id.",
    },
    {
      group: "Customers",
      name: "Update customer",
      method: "POST",
      path: "/customers/{customer}",
      description: "Update an existing customer's fields.",
      body: { mode: "form", text: "email=&name=&description=" },
    },
    {
      group: "Customers",
      name: "Delete customer",
      method: "DELETE",
      path: "/customers/{customer}",
      description: "Permanently delete a customer.",
    },
    {
      group: "Payments",
      name: "List payment intents",
      method: "GET",
      path: "/payment_intents",
      description: "List payment intents, most recent first.",
    },
    {
      group: "Payments",
      name: "Create payment intent",
      method: "POST",
      path: "/payment_intents",
      description: "Start a payment — amount is in the smallest currency unit (cents).",
      body: { mode: "form", text: "amount=2000&currency=usd&payment_method_types[]=card" },
    },
    {
      group: "Payments",
      name: "Confirm payment intent",
      method: "POST",
      path: "/payment_intents/{intent}/confirm",
      description: "Confirm a payment intent to attempt the charge.",
      body: { mode: "form", text: "payment_method=pm_card_visa" },
    },
    {
      group: "Charges",
      name: "List charges",
      method: "GET",
      path: "/charges",
      description: "List charges, most recent first.",
    },
    {
      group: "Charges",
      name: "Retrieve charge",
      method: "GET",
      path: "/charges/{charge}",
      description: "Fetch a single charge by id.",
    },
    {
      group: "Subscriptions",
      name: "List subscriptions",
      method: "GET",
      path: "/subscriptions",
      description: "List subscriptions, most recent first.",
    },
    {
      group: "Subscriptions",
      name: "Create subscription",
      method: "POST",
      path: "/subscriptions",
      description: "Subscribe a customer to one or more prices.",
      body: { mode: "form", text: "customer={customer}&items[0][price]={price_id}" },
    },
    {
      group: "Subscriptions",
      name: "Cancel subscription",
      method: "DELETE",
      path: "/subscriptions/{subscription_exposed_id}",
      description: "Cancel a subscription immediately.",
    },
    {
      group: "Invoices",
      name: "List invoices",
      method: "GET",
      path: "/invoices",
      description: "List invoices, most recent first.",
    },
  ],
};
