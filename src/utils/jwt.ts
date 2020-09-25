export interface JwtService {
  signAsync(unencryptedData: string): Promise<string>;
  decode(encryptedData: string): any;
  sign(data: object, param2: { expiresIn: number }): string;
}
