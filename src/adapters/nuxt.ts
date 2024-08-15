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
