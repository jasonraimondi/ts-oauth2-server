import { OAuthScope } from "./scope.entity";


export interface OAuthDeviceUserCode {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    creationTime: Date;
    expiresIn: number, 
    interval?: number;
    status: 'allow'|'pending'|'slow_down'|'access_denied'|'expired_token';
    userId?: string;
    scopes?: OAuthScope[];
}