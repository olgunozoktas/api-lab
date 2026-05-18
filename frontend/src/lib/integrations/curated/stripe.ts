/** Olgun Özoktaş geliştirdi · API Lab */
// Stripe — curated essentials. A hand-picked slice of the API (the
// full `spec3.json` is ~7.8 MB / 500+ operations). Covers the everyday
// surfaces: customers, payment intents, charges, subscriptions,
// invoices.
import type { CuratedProvider } from "./types";

export const stripeCurated: CuratedProvider = {
  baseUrl: "https://api.stripe.com/v1",
  endpoints: [
    { group: "Customers", name: "List customers", method: "GET", path: "/customers" },
    { group: "Customers", name: "Create customer", method: "POST", path: "/customers" },
    { group: "Customers", name: "Retrieve customer", method: "GET", path: "/customers/{customer}" },
    { group: "Customers", name: "Update customer", method: "POST", path: "/customers/{customer}" },
    {
      group: "Customers",
      name: "Delete customer",
      method: "DELETE",
      path: "/customers/{customer}",
    },
    {
      group: "Payments",
      name: "List payment intents",
      method: "GET",
      path: "/payment_intents",
    },
    {
      group: "Payments",
      name: "Create payment intent",
      method: "POST",
      path: "/payment_intents",
    },
    {
      group: "Payments",
      name: "Confirm payment intent",
      method: "POST",
      path: "/payment_intents/{intent}/confirm",
    },
    { group: "Charges", name: "List charges", method: "GET", path: "/charges" },
    { group: "Charges", name: "Retrieve charge", method: "GET", path: "/charges/{charge}" },
    {
      group: "Subscriptions",
      name: "List subscriptions",
      method: "GET",
      path: "/subscriptions",
    },
    {
      group: "Subscriptions",
      name: "Create subscription",
      method: "POST",
      path: "/subscriptions",
    },
    {
      group: "Subscriptions",
      name: "Cancel subscription",
      method: "DELETE",
      path: "/subscriptions/{subscription_exposed_id}",
    },
    { group: "Invoices", name: "List invoices", method: "GET", path: "/invoices" },
  ],
};
