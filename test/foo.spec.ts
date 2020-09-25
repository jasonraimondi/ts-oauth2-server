import { inMemoryAuthorizationServer } from "../examples/in_memory/main";

it("works", () => {
  const foo = inMemoryAuthorizationServer
  console.log(foo)
  expect(true).toBe(true);
});
