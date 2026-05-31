import { describe, expect, it } from "vitest";
import { filterOidcClaimsByScope, OIDC_SCOPE_CLAIMS, type OidcUserClaims } from "../../../src/index.js";

const allClaims: OidcUserClaims = {
  sub: "user-1",
  name: "Jane Doe",
  family_name: "Doe",
  given_name: "Jane",
  middle_name: "Q",
  nickname: "janie",
  preferred_username: "jane",
  profile: "https://issuer.example/users/user-1",
  picture: "https://issuer.example/users/user-1.jpg",
  website: "https://jane.example",
  gender: "female",
  birthdate: "1990-01-01",
  zoneinfo: "America/New_York",
  locale: "en-US",
  updated_at: 1700000000,
  email: "jane@example.com",
  email_verified: true,
  address: {
    formatted: "123 Main St\nSpringfield, IL 62704\nUS",
    street_address: "123 Main St",
    locality: "Springfield",
    region: "IL",
    postal_code: "62704",
    country: "US",
  },
  phone_number: "+1 555 0100",
  phone_number_verified: false,
  roles: ["admin"],
};

describe("OIDC Core scope-to-claim mapping", () => {
  it("matches OIDC Core §5.4", () => {
    expect(OIDC_SCOPE_CLAIMS).toStrictEqual({
      profile: [
        "name",
        "family_name",
        "given_name",
        "middle_name",
        "nickname",
        "preferred_username",
        "profile",
        "picture",
        "website",
        "gender",
        "birthdate",
        "zoneinfo",
        "locale",
        "updated_at",
      ],
      email: ["email", "email_verified"],
      address: ["address"],
      phone: ["phone_number", "phone_number_verified"],
    });
  });

  it("returns only sub for openid alone", () => {
    expect(filterOidcClaimsByScope(allClaims, ["openid"])).toEqual({ sub: "user-1" });
  });

  it("returns only sub, email, and email_verified for openid plus email", () => {
    expect(filterOidcClaimsByScope(allClaims, ["openid", "email"])).toEqual({
      sub: "user-1",
      email: "jane@example.com",
      email_verified: true,
    });
  });

  it("preserves address as a structured object", () => {
    expect(filterOidcClaimsByScope(allClaims, ["openid", "address"])).toEqual({
      sub: "user-1",
      address: allClaims.address,
    });
  });

  it("returns every standard scope-derived claim for all standard OIDC scopes", () => {
    const filtered = filterOidcClaimsByScope(allClaims, ["openid", "profile", "email", "address", "phone"]);

    expect(filtered).toEqual({
      sub: "user-1",
      name: "Jane Doe",
      family_name: "Doe",
      given_name: "Jane",
      middle_name: "Q",
      nickname: "janie",
      preferred_username: "jane",
      profile: "https://issuer.example/users/user-1",
      picture: "https://issuer.example/users/user-1.jpg",
      website: "https://jane.example",
      gender: "female",
      birthdate: "1990-01-01",
      zoneinfo: "America/New_York",
      locale: "en-US",
      updated_at: 1700000000,
      email: "jane@example.com",
      email_verified: true,
      address: allClaims.address,
      phone_number: "+1 555 0100",
      phone_number_verified: false,
    });
    expect(filtered).not.toHaveProperty("roles");
  });

  it("ignores unknown scopes silently", () => {
    expect(filterOidcClaimsByScope(allClaims, ["openid", "email", "roles"])).toEqual({
      sub: "user-1",
      email: "jane@example.com",
      email_verified: true,
    });
  });

  it("drops consumer claims that no granted scope authorizes", () => {
    expect(filterOidcClaimsByScope(allClaims, ["openid", "phone"])).toEqual({
      sub: "user-1",
      phone_number: "+1 555 0100",
      phone_number_verified: false,
    });
  });
});
