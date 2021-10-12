import { inMemoryDatabase } from "../../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryDeviceCodeRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import {
  DeviceCodeGrant,
  DateInterval,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthResponse,
  OAuthScope,
  OAuthUser,
} from "../../../src";
import { OAuthDeviceUserCode } from "src/entities/device_user_code.entity";

describe("device_code grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;
  let scope1: OAuthScope;
  let grant: DeviceCodeGrant;

  let request: OAuthRequest;


  beforeEach(() => {
    request = new OAuthRequest();

    user = { id: "abc123", email: "jason@example.com" };
    scope1 = { name: "scope-1" };

    client = {
      id: "devicecodeclient",
      name: "test devicecode client",
      secret: undefined,
      redirectUris: [],
      allowedGrants: ["urn:ietf:params:oauth:grant-type:device_code"],
      scopes: [],
    };
    

    grant = new DeviceCodeGrant(
      inMemoryAuthCodeRepository,
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      inMemoryDeviceCodeRepository,
      new JwtService("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.id] = user;
    inMemoryDatabase.scopes[scope1.name] = scope1;
  });

  describe("respond to device authorization request", () => {
    let validBodyData: any;

    beforeEach(() => {
      validBodyData = {
        client_id: client.id,
      };
    });

    it("respond for valid request", async () => {
      request = new OAuthRequest({ body: validBodyData });

      const response = await grant.respondToDeviceAuthorizationRequest(request)
      expect(response.body['device_code']).toBeDefined();
      expect(response.body['user_code']).toBeDefined();
      expect(response.body['expires_in']).toBeDefined();
    });

    it("produce error on absence of client id", async () => {
      request = new OAuthRequest({
        body: {
          ...validBodyData,
          client_id: undefined,
        },
      });

      expect(grant.respondToDeviceAuthorizationRequest(request)).rejects.toThrow()
    });

    
  });

  
  describe("respond to access token request", () => {
    let deviceAuthRequest: OAuthRequest;
    let deviceAuthResponse: OAuthResponse;
    let deviceCode: string;
    let userCode: string;
    let foundRecord: OAuthDeviceUserCode|undefined;
    let accessTokenRequest: OAuthRequest;

    beforeEach(async () => {
        deviceAuthRequest = new OAuthRequest({
            body: {
                client_id: client.id
            }   
        });
        deviceAuthResponse = await grant.respondToDeviceAuthorizationRequest(deviceAuthRequest);
        deviceCode = deviceAuthResponse.body['device_code'] as string;
        userCode = deviceAuthResponse.body['user_code'] as string;
        foundRecord = undefined;
        for(const searchCode of Object.keys(inMemoryDatabase.deviceCodes) ) {
            if (searchCode === deviceCode) {
                foundRecord = inMemoryDatabase.deviceCodes[deviceCode];
                break;
            }
        }
        expect(foundRecord).toBeDefined();
        expect(foundRecord?.userCode).toEqual(userCode); 

        accessTokenRequest = new OAuthRequest({
            body: {
               grant_type: "urn:ietf:params:oauth:grant-type:device_code",
               device_code: deviceCode,
               client_id: client.id
            }
        });
        
    });
  

    it("is successful when status is allowed in repo", async () => {
    
        if (foundRecord === undefined) {
            return;
        }
        
        foundRecord.status = 'allow';
        const accessTokenResponce = await grant.respondToAccessTokenRequest(accessTokenRequest, new OAuthResponse({}), new DateInterval('1h') ); 
        expect(accessTokenResponce.body['token_type']).toEqual('Bearer');
        
    });

    it("is pending when status is not changed in repo", async () => {

        const responcePromise = grant.respondToAccessTokenRequest(accessTokenRequest, new OAuthResponse({}), new DateInterval('1h') ); 
        
        expect(responcePromise).rejects.toThrowError("authorization_pending");

    });


    it("is reject when denied", async () => {
        if (foundRecord === undefined) {
            return;
        }
        foundRecord.status = 'access_denied';
        const responcePromise = grant.respondToAccessTokenRequest(accessTokenRequest, new OAuthResponse({}), new DateInterval('1h') );         
        expect(responcePromise).rejects.toThrowError( "The resource owner or authorization server denied the request");
    });

    it("is reject when device_code is absent in token request", async () => {
      
      accessTokenRequest.body['device_code'] = undefined;
      
      const responcePromise = grant.respondToAccessTokenRequest(accessTokenRequest, new OAuthResponse({}), new DateInterval('1h') );         
      expect(responcePromise).rejects.toThrow( RegExp('.*parameter.*device_code.*') );
    });

    it("is reject when device_code is other in token request", async () => {
      
      accessTokenRequest.body['device_code'] = 'other-code';
      
      const responcePromise = grant.respondToAccessTokenRequest(accessTokenRequest, new OAuthResponse({}), new DateInterval('1h') );         
      expect(responcePromise).rejects.toThrow(  );
    });


  });  

});
