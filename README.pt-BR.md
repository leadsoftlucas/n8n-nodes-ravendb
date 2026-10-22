<div align="center">

# RavenDB — n8n Community Node

[🇺🇸 English](README.md) · **🇧🇷 Português (Brasil)**

Um **n8n community node para o RavenDB** que permite aos seus workflows ler,
escrever e consultar documentos em um banco RavenDB — incluindo suporte a um
**cluster RavenDB protegido por mTLS (certificado de cliente)**.

[![CI](https://img.shields.io/github/actions/workflow/status/leadsoftlucas/n8n-nodes-ravendb/ci.yml?branch=main&label=CI)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
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

## Status e instalação

**Status: versão inicial (0.1.0), ainda não publicada no npm.** Ela não pode
ser instalada pela interface do n8n (Settings > Community Nodes) até ser
publicada. Para testar hoje, instale a partir do código-fonte em um n8n
self-hosted:

```bash
git clone https://github.com/leadsoftlucas/n8n-nodes-ravendb.git
cd n8n-nodes-ravendb
npm ci
npm run build          # compila para ./dist
npm run dev            # opcional: sobe um n8n local com este node carregado
```

Para carregá-lo em um n8n self-hosted já existente, copie ou crie um link do
projeto na pasta de extensões customizadas do n8n (`~/.n8n/custom`) e
reinicie o n8n.

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
ambiente. Veja a seção **Avançado: configuração de mTLS**
abaixo para entender o porquê, e como extrair esses valores de um cluster
RavenDB.

## Início rápido

1. Adicione uma credencial **RavenDB API** com a URL do seu servidor.
2. Adicione um node **RavenDB**, escolha **Document → Get**, preencha
   **Database Name** e **Document ID**.
3. Execute o node — o JSON do documento volta como saída do item.
   (Em **Query**, cada linha de resultado é emitida como um item separado.)

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

### O que foi verificado e a versão mínima da n8n

Testado contra um servidor RavenDB 7.2.2 real (Docker) protegido por um
certificado de servidor autoassinado, também registrado como certificado de
cliente admin: o código `execute()` do node, rodando com o cliente HTTP da
própria n8n (`@n8n/backend-network` 1.12.2 e 1.18.4), executou Get / Create or
Update / Delete / Query via mTLS; chave privada criptografada com o campo
**Private Key Passphrase** funcionou; e o mesmo servidor respondeu `403` quando
nenhum certificado de cliente foi enviado. Isto **não** foi executado dentro de
uma instância n8n completa (sem workflow nem credential store).

Pelo código-fonte da n8n, `agentOptions` só é respeitado por
`httpRequestWithAuthentication` no **n8n-core 2.19.0 ou superior**; no n8n-core
1.122.51, 2.0.0, 2.16.1, 2.17.0 e 2.18.0 as opções são convertidas para axios
sem `agentOptions`, e o certificado de cliente **não** seria enviado. Use n8n
2.19 ou superior para mTLS (assumindo que a versão do app n8n acompanha a do
pacote n8n-core, o que não foi checado).

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
  genérica e provavelmente não anexa o `agentOptions` customizado deste node (não verificado em uma n8n em execução) — então o teste
  só consegue confirmar que a **Server URL** está acessível, não que seu
  certificado é válido. Execute uma operação real do node para validar o
  handshake mTLS completo.
- **Erro 404 em Get/Delete.** O documento ou o banco não
  existe - confira **Database Name** e **Document ID**.
- **Erro 403 em um cluster protegido por mTLS.**
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
  [guia de containers/Docker do RavenDB](https://docs.ravendb.net/7.2/start/containers/general-guide)
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
- [Referência da API REST do RavenDB](https://docs.ravendb.net/7.2/client-api/rest-api/rest-api-intro)
- [RavenDB Query Language (RQL)](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
- [Documentação de community nodes da n8n](https://docs.n8n.io/integrations/creating-nodes/)
- [Diretrizes de verificação de community nodes da n8n](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/)
