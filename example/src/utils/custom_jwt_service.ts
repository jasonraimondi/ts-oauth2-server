import { ExtraAccessTokenFieldArgs, JwtService } from "@jmondi/oauth2-server";

export class MyCustomJwtService extends JwtService {
  extraTokenFields({ user, client }: ExtraAccessTokenFieldArgs) {
    return {
      email: user?.email,
      client: client.name,
    };
  }
}
