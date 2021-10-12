import { OAuthDeviceUserCode } from "../entities/device_user_code.entity";
import { OAuthClient } from "../entities/client.entity";
import { OAuthScope } from "../entities/scope.entity";




export interface OAuthDeviceUserCodeRepository {

    getByIdentifier(deviceCode: string): Promise<OAuthDeviceUserCode|undefined>;

    issueDeviceUserCode(client: OAuthClient,  scopes: OAuthScope[]): Promise<OAuthDeviceUserCode>;

    revoke(deviceCode: string): Promise<void>;
 
}