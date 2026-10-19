# When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email, third-party)
- Time / randomness
- Databases and filesystems — sometimes; prefer a real test DB / tmp dir when cheap

Don't mock:

- Your own classes / modules
- Internal collaborators
- Anything you control

Use the project's test runner and its mock helpers. Do not invent a second
runner.

## Designing for mockability

**1. Pass the boundary in** — only when a second adapter is real (production + test, or two backends).

```typescript
// Easy to mock
function processPayment(order: Order, paymentClient: PaymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order: Order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

Don't invent `IFoo` for an in-process collaborator you own just so a test can mock it.

**2. Prefer SDK-style interfaces over a generic fetcher**

```typescript
// GOOD: each function is independently mockable
const api = {
  getUser: (id: string) => fetch(`/users/${id}`),
  createOrder: (data: OrderInput) =>
    fetch("/orders", { method: "POST", body: JSON.stringify(data) }),
};

// BAD: mock needs conditional logic
const api = {
  fetch: (endpoint: string, options?: RequestInit) => fetch(endpoint, options),
};
```
