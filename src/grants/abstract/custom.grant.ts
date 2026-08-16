import { AbstractGrant } from "./abstract.grant.js";

/**
 * The base class for a grant of your own. It is an {@link AbstractGrant} that
 * narrows the identifier to the `custom:` prefix, so your grant cannot collide
 * with a standard one.
 *
 * Enable your instance with `enableGrantType({ grant: myGrant })`.
 *
 * @see https://tsoauth2server.com/docs/grants/custom
 */
export abstract class CustomGrant extends AbstractGrant {
  abstract readonly identifier: `custom:${string}`;
}
