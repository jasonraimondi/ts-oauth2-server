# Custom Grant

To write a custom grant, extend the `CustomGrant` class.

:::warning

This is an advanced procedure. Read and understand the OAuth 2.0 specification before you write a custom grant.

:::

:::info Enable this grant

```ts
const customGrant = new MyCustomGrant(...);

authorizationServer.enableGrantTypes(
  [{ grant: customGrant }, new DateInterval("1d")],
);
```

:::

## Extend the CustomGrant Class

```ts
export class MyCustomGrant extends CustomGrant {
  readonly identifier = "custom:my_custom_grant";

  ... // Implement required methods
}
```

