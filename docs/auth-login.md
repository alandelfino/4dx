# Endpoint de Login (Xano)

- URL: `https://x8ki-letl-twmt.n7.xano.io/api:aHWQkL67/auth/login`
- Método: `POST`
- Content-Type: `application/json`

## Requisição

```json
{
  "email": "comercialdieison@titaniumjeans.com.br",
  "password": "<sua-senha>"
}
```

## Resposta (200)

```json
{
  "authToken": "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.kSfodNdrRuK2E6jf0IWIpC_MS9fmrbZUww8B1lVRShRRTQfzmFpaeNV2oH-o0EUTMZFn7l6o-wQcdDbVBWrVc159jwdEpvSA.fISkaLjC1qT5MMyAtQDhaA.KhRum_lwuHsG_OwoU_QS43Ad_gJBAXf7A8JQZUW598bsoCx5UPg-dl1S3sG1lWB90tV38xUNHfwK3IUmJ1zDrI03i4v_ZZmHIN9sRyp0PuSMEDBDN9UBomk5ZMu0Da3mSFQxSdtbasLV5HBCSnAW3ff_NCQim3Y3TMxE7tivJNQ8bK_pb-dxFxwJtbw5woIqLB23jXD0xy6lYR3HCeE0XBWdzB0yjSRQYYaH6Ki2eHutu4umLGJ1mUebxZcgEAYoXfQG1tVylZrHYr065Z4VX9mWXeEbF_BwsLmY0xZN3MA.J_a5V8phAQVWQ-gOJ5QBOZN-vIykBJFjd1nykdLVTYQ",
  "user": {
    "id": 3,
    "created_at": 1763820962590,
    "name": "Dieison Gongora Padial",
    "email": "comercialdieison@titaniumjeans.com.br",
    "company_id": 1,
    "profile": "director"
  }
}
```

- `authToken`: token em formato JWE (5 partes base64url separadas por pontos).
- `user`: objeto com campos obrigatórios conforme acima.

## Erros

- 401/403 Credenciais inválidas
  - Exemplo: `{ "message": "Invalid credentials" }`
- 404 Rota indisponível
  - Exemplo: `{ "code": "ERROR_CODE_NOT_FOUND", "message": "Unable to locate request." }`

## Tratamento no cliente

- Validação de resposta via `zod` em `src/lib/auth.ts` (schema `loginResponseSchema`).
- Armazenamento:
  - Token em `${subdominio}-directa-authToken`.
  - Usuário em `${subdominio}-directa-user`.
- Feedback:
  - Toasters para erros de credenciais e indisponibilidade.

## Observações

- O cliente valida a estrutura da resposta em tempo de execução.