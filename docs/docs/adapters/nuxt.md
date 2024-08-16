# Nuxt

This code is used to transform a Nuxt response or to construct a new Nuxt HTTP response.

## Source Code

```ts
import type { OAuthResponse } from '@jmondi/oauth2-server'
import { ErrorType, OAuthException, OAuthRequest } from '@jmondi/oauth2-server'
import { getHeaders, getQuery, readBody, sendError, type H3Event } from 'h3'

export function responseWithH3(event: H3Event, oauthResponse: OAuthResponse, wrapResp?: string): void {
  if (oauthResponse.status === 302) {
    if (typeof oauthResponse.headers.location !== 'string' || oauthResponse.headers.location === '') {
      throw new OAuthException(`missing redirect location`, ErrorType.InvalidRequest)
    }
    event.respondWith(
      new Response(null, {
        status: 302,
        headers: {
          Location: oauthResponse.headers.location
        }
      })
    )
  }

  let body = oauthResponse.body
  if (wrapResp) {
    body = { [wrapResp]: body }
  }

  event.respondWith(
    new Response(JSON.stringify(body), {
      status: oauthResponse.status,
      headers: oauthResponse.headers
    })
  )
}

export async function requestFromH3(event: H3Event, updatedBody?: Record<string, any>): Promise<OAuthRequest> {
  let query: Record<string, any> = {}
  let body: Record<string, any> = {}
  if (['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(event.method.toUpperCase())) {
    query = getQuery(event) as Record<string, any>
  }
  if (['POST', 'PUT', 'PATCH'].includes(event.method.toUpperCase())) {
    if (updatedBody) {
      body = updatedBody
    } else {
      body = await readBody(event)
    }
  }
  return new OAuthRequest({
    query: query,
    body: body,
    headers: getHeaders(event) ?? {}
  })
}

export function handleErrorWithH3(event: H3Event, e: unknown | OAuthException): void {
  if (isOAuthError(e)) {
    sendError(event, e)
    return
  }
  throw e
}

export function isOAuthError(error: unknown): error is OAuthException {
  if (!error) return false
  if (typeof error !== 'object') return false
  return 'oauth' in error
}
```

## Functions

```ts
 function responseWithH3(event: H3Event, oauthResponse: OAuthResponse, wrapResp?: string): void 
```

```ts
export async function requestFromH3(event: H3Event, updatedBody?: Record<string, any>): Promise<OAuthRequest> 
```

```ts
export function handleErrorWithH3(event: H3Event, e: unknown | OAuthException)
```


## Example


```ts
import { requestFromH3, handleErrorWithH3, responseWithH3 } from '../../tools/converts'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  body.grant_type = 'password'
  body.client_id = useRuntimeConfig().oauth.client.clientId
  body.client_secret = useRuntimeConfig().oauth.client.secret
  try {
    // Here is an instance of new AuthorizationServer.
    const oauthServer = useOAuthServer()
    // A transformation is applied here.
    const oauthResponse = await oauthServer.respondToAccessTokenRequest(await requestFromH3(event, body))
    // The response is directly forwarded here.
    responseWithH3(event, oauthResponse, 'data')
  } catch (e) {
    console.error(e)
    handleErrorWithH3(event, e)
  }
})
```