import { AbstractGrant } from "./abstract.grant.js";

export abstract class CustomGrant extends AbstractGrant {
  abstract readonly identifier: `custom:${string}`;
}
