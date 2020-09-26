import { DateInterval } from "@jmondi/date-interval";
import type { Response } from "express";

import { AbstractGrant } from "./abstract.grant";
import { OAuthException } from "../exceptions";
import { IRequest, IResponse } from "../requests/interface";

export class RefreshTokenGrant extends AbstractGrant {
  readonly identifier = "refresh_token";

  async respondToAccessTokenRequest(
    request: IRequest,
    response: IResponse,
    accessTokenTTL: DateInterval,
  ): Promise<Response> {
    const client = await this.validateClient(request);
    const oldRefreshToken = this.validateOldRefreshToken(request, client.id);
    console.log({ oldRefreshToken });
  }

  private async validateOldRefreshToken(request: IRequest, clientId: string) {
    const encryptedRefreshToken = this.getRequestParameter("refresh_token", request);

    if (!encryptedRefreshToken) {
      throw OAuthException.invalidRequest("refresh_token");
    }

    // @todo remove any here
    const refreshTokenData: any = this.decrypt(encryptedRefreshToken);

    if (refreshTokenData.client_id !== clientId) {
      throw OAuthException.invalidRequest("refresh_token", "Token is not linked to client");
    }

    if (refreshTokenData.expire_time < Date.now() / 1000) {
      throw OAuthException.invalidRequest("refresh_token", "Token has expired");
    }

    const isRefreshTokenRevoked = await this.refreshTokenRepository.isRefreshTokenRevoked(
      refreshTokenData.refresh_token_id,
    );

    if (!isRefreshTokenRevoked) {
      throw OAuthException.invalidRequest("refresh_token", "Token has been revoked");
    }

    return refreshTokenData;
  }
}
