# Good and Bad Tests

## Good tests

Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: observable behavior
it("should confirm checkout for a valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

- Behavior callers care about
- Public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad tests

**Implementation-detail** — coupled to internal structure.

```typescript
// BAD
it("should call paymentService.process", async () => {
  const process = vi.fn();
  await checkout(cart, { process });
  expect(process).toHaveBeenCalledWith(cart.total);
});
```

Red flags: mocking internal collaborators, private methods, call counts/order, test name describes HOW, verifying through a side channel instead of the interface.

```typescript
// BAD: bypasses interface
it("should save the user to the database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: verifies through interface
it("should make a created user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Tautological** — expected value restates the implementation.

```typescript
// BAD
it("should sum line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: independent literal
it("should sum line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

**Low-value mapping tests** — asserting `.map` / array shape with no behavior.
Skip or drop them rather than warping production code so a test can reach
inside.

## Mutation check

A realistic production mutation (wrong branch, missing side effect, empty return) should fail at least one test. Nothing fails → tautological or untested.
