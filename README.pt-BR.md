<div align="center">

# RavenDB — n8n Community Node

[🇺🇸 English](README.md) · **🇧🇷 Português (Brasil)**

Um **n8n community node para o RavenDB** que permite aos seus workflows ler,
escrever e consultar documentos em um banco RavenDB — incluindo suporte a um
**cluster RavenDB protegido por mTLS (certificado de cliente)**.

[![CI](https://img.shields.io/github/actions/workflow/status/leadsoftlucas/n8n-nodes-ravendb/ci.yml?branch=main&label=CI)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/n8n-nodes-ravendb)](https://www.npmjs.com/package/n8n-nodes-ravendb)
[![RavenDB](https://img.shields.io/badge/RavenDB-REST%20API-b3131e)](https://ravendb.net)

</div>

Ele existe para que um workflow do [n8n](https://n8n.io) possa conversar com um
banco [RavenDB](https://ravendb.net) real — buscar, criar/atualizar e apagar
documentos por ID, e rodar consultas [RQL](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
— usando a própria API REST documentada do RavenDB, sem depender do SDK oficial
`ravendb` e, quando a instância exige, com suporte completo à **autenticação
por certificado de cliente (mTLS)**.

> **Projeto independente, não é um lançamento oficial da RavenDB.** Este node é
> construído e mantido por [Lucas R. Tavares](https://github.com/leadsoftlucas),
> funcionário da RavenDB, por iniciativa própria e na sua conta pessoal do
> GitHub. Ele **não é publicado pela empresa RavenDB e não tem cobertura do
> suporte oficial da RavenDB.** Use, faça fork, ou copie partes dele — só não
> assuma que ele carrega o respaldo institucional da RavenDB.

## O que ele faz

O node **RavenDB** expõe dois recursos:

| Recurso    | Operação           | Chamada REST                                    |
| ---------- | ------------------- | ------------------------------------------------ |
| Document   | Get                 | `GET /databases/{db}/docs?id={id}`               |
| Document   | Create or Update    | `PUT /databases/{db}/docs?id={id}`               |
| Document   | Delete              | `DELETE /databases/{db}/docs?id={id}`            |
| Query      | Run Query           | `POST /databases/{db}/queries` com um corpo RQL |

Toda operação usa um campo **Database Name** no node, então uma única
credencial (um servidor ou cluster RavenDB) pode operar contra qualquer
quantidade de bancos de dados no mesmo workflow.

## Por que não usar o SDK `ravendb`

As regras de verificação de community nodes da n8n exigem **zero dependências
de runtime** além de `devDependencies`. O pacote npm oficial
[`ravendb`](https://www.npmjs.com/package/ravendb) é um cliente completo com
sua própria árvore de dependências, então este node chama diretamente a
[API REST](https://docs.ravendb.net) do RavenDB, através do próprio cliente
HTTP embutido da n8n (`this.helpers.httpRequestWithAuthentication`).

## Credenciais

Crie uma credencial **RavenDB API** com:

| Campo                            | Obrigatório                  | Descrição                                                        |
| --------------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| Server URL                       | Sim                           | URL base do servidor ou node do cluster RavenDB, ex.: `https://a.ravendb.cluster:8080` |
| Authenticate With Mutual TLS     | Não (desligado por padrão)    | Ative para uma instância RavenDB protegida por certificado de cliente (mTLS) |
| CA Certificate                   | Só se o campo acima estiver ativo | Certificado CA em PEM, se o servidor não for assinado por uma CA pública |
| Client Certificate               | Só se o campo acima estiver ativo | Certificado de cliente X.509 em PEM, emitido pelo cluster RavenDB |
| Client Private Key               | Só se o campo acima estiver ativo | Chave privada em PEM, correspondente ao certificado de cliente  |
| Private Key Passphrase           | Não                           | Senha da chave privada, se ela estiver criptografada             |

Os quatro campos de certificado/chave são colados como **texto PEM direto na
credencial** — nunca como caminho de arquivo ou referência a variável de
ambiente. Veja [Avançado: configuração de mTLS](#-avançado-configuração-de-mtls)
abaixo para entender o porquê, e como extrair esses valores de um cluster
RavenDB.

## Início rápido

1. Adicione uma credencial **RavenDB API** com a URL do seu servidor.
2. Adicione um node **RavenDB**, escolha **Document → Get**, preencha
   **Database Name** e **Document ID**.
3. Execute o node — o JSON do documento volta como saída do item.

<details>
<summary>Exemplo: consultando com RQL</summary>

- Resource: `Query`
- Operation: `Run Query`
- Database Name: `Northwind`
- RQL Query:
  ```
  from "Orders" where Company = $company
  ```
- Query Parameters:
  ```json
  { "company": "companies/1-A" }
  ```

Isso espelha o próprio endpoint de consulta documentado do RavenDB:
`POST /databases/Northwind/queries` com corpo `{"Query": "...", "QueryParameters": {...}}`.
Veja a [documentação de RQL do RavenDB](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
para a sintaxe de consultas.

</details>

<details>
<summary>Avançado: configuração de mTLS</summary>

### Por que não dá para reaproveitar a credencial nativa "SSL Certificate" da n8n

Isso foi confirmado pela própria n8n em uma
[thread no fórum da comunidade](https://community.n8n.io/t/custom-node-with-client-certificate-mtls-authentication/313155):
não existe forma suportada de um community node reaproveitar o tipo de
credencial nativo SSL Certificate da n8n. Este node, em vez disso, traz seu
próprio tipo de credencial **RavenDB API**, com campos dedicados de
CA/certificado de cliente/chave privada/senha (veja [Credenciais](#credenciais)
acima), e monta o equivalente a um `https.Agent` do Node.js (via a opção
`agentOptions` da própria n8n) a partir desses valores, no momento da
requisição — sem biblioteca externa, sem acesso ao sistema de arquivos.

### Por que texto PEM, nunca um caminho de arquivo

A verificação de community nodes proíbe explicitamente ler credenciais do
sistema de arquivos ou de variáveis de ambiente em tempo de execução — uma
credencial precisa ser autocontida no que o usuário cola na interface da n8n.
É por isso que cada campo de certificado/chave acima é texto PEM puro
(`-----BEGIN CERTIFICATE-----…`), nunca um caminho como
`/etc/ravendb/certs/client.pem`.

### Obtendo o certificado de cliente do seu RavenDB como texto PEM

Se o seu cluster RavenDB emitiu um pacote de certificado de cliente
`.pfx`/`.p12` (a saída padrão do assistente de configuração do RavenDB),
extraia as partes PEM com o OpenSSL:

```bash
# Certificado de cliente
openssl pkcs12 -in client.pfx -clcerts -nokeys -out client-cert.pem

# Chave privada (adicione -nodes para não proteger a chave extraída com senha,
# ou omita e use a senha que você definiu no campo "Private Key Passphrase")
openssl pkcs12 -in client.pfx -nocerts -out client-key.pem

# Certificado da CA, se o seu cluster usa uma CA privada
openssl pkcs12 -in client.pfx -cacerts -nokeys -chain -out ca-cert.pem
```

Cole o conteúdo de cada arquivo `.pem` resultante no campo de credencial
correspondente.

</details>

<details>
<summary>Solução de problemas</summary>

- **O botão de teste de "Authenticate With Mutual TLS" não valida meu certificado.**
  O testador de credenciais embutido da n8n dispara uma requisição HTTP
  genérica e não anexa o `agentOptions` customizado deste node — então o teste
  só consegue confirmar que a **Server URL** está acessível, não que seu
  certificado é válido. Execute uma operação real do node para validar o
  handshake mTLS completo.
- **`RavenDB request ... failed with status 404`.** O ID do documento não
  existe no banco de destino - confira **Database Name** e **Document ID**.
- **`RavenDB request ... failed with status 403` em um cluster protegido por mTLS.**
  O certificado de cliente fornecido não está autorizado para aquele banco ou
  operação na configuração de segurança do próprio RavenDB - confira as
  permissões do certificado no RavenDB Studio (`Manage Server → Certificates`).
- **Erros de conexão contra um servidor sem segurança (`http://`).**
  "Authenticate With Mutual TLS" só se aplica a URLs `https://` - deixe
  desligado para uma instância de desenvolvimento HTTP simples.

</details>

## Requisitos

- n8n `1.x` (community nodes API version 1)
- Um servidor ou cluster RavenDB acessível - veja o
  [guia de containers/Docker do RavenDB](https://docs.ravendb.net/start/containers/general-guide)
  ou [docs.ravendb.net](https://docs.ravendb.net) para configuração local

## Contribuindo

Issues e pull requests são bem-vindos. Este node foi construído por
[Lucas R. Tavares](https://github.com/leadsoftlucas) com o [Claude Code](https://claude.com/claude-code)
como colaborador de par de programação. Por favor, mantenha as mudanças
alinhadas com os dois recursos descritos acima (Document, Query), em vez de
expandir o escopo sem discutir antes.

## Licença

[MIT](LICENSE) © 2026 Lucas R. Tavares

## Links relacionados

- [Documentação da RavenDB](https://docs.ravendb.net)
- [Referência da API REST do RavenDB](https://docs.ravendb.net/client-api/rest-api/documents/get)
- [RavenDB Query Language (RQL)](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
- [Documentação de community nodes da n8n](https://docs.n8n.io/integrations/creating-nodes/)
- [Diretrizes de verificação de community nodes da n8n](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/)
