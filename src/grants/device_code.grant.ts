
import { OAuthUser } from "../entities/user.entity";
import { OAuthException } from "../exceptions/oauth.exception";
import { RequestInterface } from "../requests/request";
import { OAuthResponse, ResponseInterface } from "../responses/response";
import { DateInterval } from "../utils/date_interval";
import { AbstractGrant } from "./abstract/abstract.grant";



export class DeviceCodeGrant extends AbstractGrant {
    readonly identifier = "urn:ietf:params:oauth:grant-type:device_code";
  

    async respondToAccessTokenRequest(request: RequestInterface, _ : ResponseInterface,
      accessTokenTTL: DateInterval,
    ): Promise<ResponseInterface> {
       
        const deviceCode = this.getRequestParameter("device_code", request);
        if (deviceCode === undefined) {
          throw OAuthException.invalidRequest("device_code");
        }

        const clientId = this.getRequestParameter ("client_id",request);
        if (clientId === undefined) {
          throw OAuthException.invalidRequest("client_id");
        }
        const client = await this.clientRepository.getByIdentifier(clientId);
        if (client === undefined) {
          throw OAuthException.invalidRequest("client_id");
        }

        const deviceUserCode = await this.deviceUserCodeRepository.getByIdentifier(deviceCode);
        if (deviceUserCode === undefined || deviceUserCode === null) {
          throw OAuthException.invalidRequest("device_code");
        }

        let user: OAuthUser | undefined;
        switch(deviceUserCode.status) {
          case 'allow':
            const expirationTime = deviceUserCode.creationTime.getTime()+deviceUserCode.expiresIn*1000;
            if (expirationTime <= Date.now()) {
              await this.deviceUserCodeRepository.revoke(deviceCode);
              throw OAuthException.expiredToken();
            }
            if (deviceUserCode.userId !== undefined) {
              user = await this.userRepository.getUserByIdentifiers(deviceUserCode.userId, client);
            }
            break;
          case 'access_denied':
            await this.deviceUserCodeRepository.revoke(deviceCode);
            throw OAuthException.accessDenied();  
          case 'pending':
            throw OAuthException.authorizationPending();
          case 'slow_down':
            throw OAuthException.slowDown();  
          case 'expired_token':
            await this.deviceUserCodeRepository.revoke(deviceCode);
            throw OAuthException.expiredToken();
        }

        let scopes = deviceUserCode.scopes;
        if (scopes !== undefined) {
          scopes = await this.scopeRepository.finalize(scopes,this.identifier,client, deviceUserCode.userId);
        } else {
          scopes = [ ];
        }
        let accessToken = await this.issueAccessToken(accessTokenTTL, client, user, scopes);
        accessToken = await this.issueRefreshToken(accessToken);
        await this.deviceUserCodeRepository.revoke(deviceCode);
        const extraJwtFields = user ? await this.userRepository.extraAccessTokenFields?.(user) : undefined;
        return await this.makeBearerTokenResponse(client, accessToken, scopes, extraJwtFields);
    
    }
  
    canRespondToDeviceAuthorizationRequest(_request: RequestInterface): boolean {
      return true;
    }

    async respondToDeviceAuthorizationRequest(request: RequestInterface): Promise<ResponseInterface> {
        const clientId = this.getRequestParameter("client_id", request);
        if (!clientId) {
          throw OAuthException.invalidRequest("client_id");
        }
    
        const client = await this.clientRepository.getByIdentifier(clientId);
    
        if (!client) {
          throw OAuthException.invalidClient();
        }
      
        const scopes = await this.validateScopes(
          this.getRequestParameter("scope", request, []),
        );
    
        const data = await this.deviceUserCodeRepository.issueDeviceUserCode(client, scopes);

        const response = new OAuthResponse();
        response.body = {
          device_code: data.deviceCode,
          user_code: data.userCode,
          verification_uri: data.verificationUri
        }
        if (data.verificationUriComplete !== undefined) {
          response.body["verification_uri_complete"]=data.verificationUriComplete;
        }
        if (data.expiresIn === undefined) {
          response.body["expires_in"] = 1800;
        } else {
          response.body["expires_in"] =  data.expiresIn;
        }
        if (data.interval !== undefined) {
          response.body["interval"] =  data.interval;
        }
        
        return response;
    }
    
    
}
