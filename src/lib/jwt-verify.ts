/**
 * JWT署名検証ユーティリティ
 * AWS CognitoのJWTを検証します
 */

import { getEnvConfig } from './env';

interface JWK {
  alg: string;
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
}

interface JWKS {
  keys: JWK[];
}

interface JWTHeader {
  alg: string;
  kid: string;
}

interface JWTPayload {
  sub: string;
  iss: string;
  client_id?: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  'cognito:groups'?: string[];
  [key: string]: unknown;
}

// JWKSのキャッシュ（メモリ内）
let jwksCache: JWKS | null = null;
let jwksCacheTime: number = 0;
const JWKS_CACHE_DURATION = 3600000; // 1時間

/**
 * Base64URLをArrayBufferにデコード
 */
function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Padded = base64 + padding;
  
  const binaryString = atob(base64Padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Base64URLをJSONにデコード
 */
function decodeBase64UrlToJson<T>(base64Url: string): T {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const jsonString = atob(base64 + padding);
  return JSON.parse(jsonString);
}

/**
 * CognitoのJWKSエンドポイントからキーを取得
 */
async function getJwks(userPoolId: string, region: string): Promise<JWKS> {
  const now = Date.now();
  
  // キャッシュが有効な場合はキャッシュを返す
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_DURATION) {
    return jwksCache;
  }
  
  const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  
  const response = await fetch(jwksUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`JWKSの取得に失敗しました: ${response.status}`);
  }
  
  jwksCache = await response.json();
  jwksCacheTime = now;
  
  return jwksCache!;
}

/**
 * JWKからCryptoKeyを作成
 */
async function jwkToCryptoKey(jwk: JWK): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: jwk.alg,
      use: jwk.use,
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['verify']
  );
}

/**
 * JWT署名を検証
 */
async function verifySignature(
  token: string,
  jwk: JWK
): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  const [headerB64, payloadB64, signatureB64] = parts;
  const signedContent = `${headerB64}.${payloadB64}`;
  
  try {
    const cryptoKey = await jwkToCryptoKey(jwk);
    const signature = base64UrlToArrayBuffer(signatureB64);
    const data = new TextEncoder().encode(signedContent);
    
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      data
    );
  } catch (error) {
    console.error('署名検証エラー:', error);
    return false;
  }
}

/**
 * JWTの検証結果
 */
export interface VerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Cognito JWTを検証
 * @param token - JWTトークン
 * @param tokenUse - トークンの用途（'access' または 'id'）
 */
export async function verifyCognitoToken(
  token: string,
  tokenUse: 'access' | 'id' = 'access'
): Promise<VerifyResult> {
  try {
    const config = getEnvConfig();
    
    if (!config.userPoolId || !config.region) {
      return { valid: false, error: 'Cognito設定が見つかりません' };
    }
    
    // トークンをパース
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: '無効なトークン形式です' };
    }
    
    // ヘッダーとペイロードをデコード
    const header = decodeBase64UrlToJson<JWTHeader>(parts[0]);
    const payload = decodeBase64UrlToJson<JWTPayload>(parts[1]);
    
    // issuer（発行者）を検証
    const expectedIssuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
    if (payload.iss !== expectedIssuer) {
      return { valid: false, error: '無効な発行者です' };
    }
    
    // token_useを検証
    if (payload.token_use !== tokenUse) {
      return { valid: false, error: `無効なトークン用途です（期待: ${tokenUse}）` };
    }
    
    // 有効期限を検証
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'トークンの有効期限が切れています' };
    }
    
    // JWKSを取得
    const jwks = await getJwks(config.userPoolId, config.region);
    
    // kidに対応するキーを検索
    const jwk = jwks.keys.find(key => key.kid === header.kid);
    if (!jwk) {
      return { valid: false, error: '対応する公開鍵が見つかりません' };
    }
    
    // 署名を検証
    const isValidSignature = await verifySignature(token, jwk);
    if (!isValidSignature) {
      return { valid: false, error: '署名が無効です' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    console.error('JWT検証エラー:', error);
    return { valid: false, error: 'トークンの検証に失敗しました' };
  }
}

/**
 * Cookieからトークンを取得して検証
 */
export async function verifyAuthFromCookies(
  accessToken: string,
  idToken: string
): Promise<VerifyResult & { groups?: string[] }> {
  // アクセストークンを検証
  const accessResult = await verifyCognitoToken(accessToken, 'access');
  if (!accessResult.valid) {
    return accessResult;
  }
  
  // IDトークンを検証してグループを取得
  const idResult = await verifyCognitoToken(idToken, 'id');
  if (!idResult.valid) {
    return idResult;
  }
  
  return {
    valid: true,
    payload: accessResult.payload,
    groups: idResult.payload?.['cognito:groups'] || [],
  };
}



