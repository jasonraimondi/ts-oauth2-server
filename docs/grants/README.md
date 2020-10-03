---
title: Grants
---

# {{ $frontmatter.title }}

Grants are different ways a [client](../glossary/README.md#client) can obtain an `access_token` that will authorize it to use the [resource server](../glossary/README.md#resource-server).

## Which Grant?

Deciding which grant to use depends on the type of client the end user will be using.

```
+-------+
| Start |
+-------+
    V
    |
    
    |
+------------------------+              +-----------------------+
| Have a refresh token?  |>----Yes----->|  Refresh Token Grant  |
+------------------------+              +-----------------------+
    V
    |
    No
    |
+---------------------+                
|     Who is the      |                  +--------------------------+
| Access token owner? |>---A Machine---->| Client Credentials Grant |
+---------------------+                  +--------------------------+
    V
    |
    |
   A User
    |
    |
+----------------------+                
| What type of client? |   
+----------------------+     
    |
    |                                 +---------------------------+
    |>-----------Server App---------->| Auth Code Grant with PKCE |
    |                                 +---------------------------+
    |
    |                                 +---------------------------+
    |>-------Browser Based App------->| Auth Code Grant with PKCE |
    |                                 +---------------------------+
    |
    |                                 +---------------------------+
    |>-------Native Mobile App------->| Auth Code Grant with PKCE |
                                      +---------------------------+

```
