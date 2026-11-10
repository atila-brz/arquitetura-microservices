# Arquitetura de Microsserviços - Consulta de Clima

Projeto de consulta de clima usando Node.js, Express e a API Open-Meteo.

## Estrutura

- `gateway` - API Gateway na porta 3000. Também serve o frontend que fica em `gateway/public`.
- `services/localizacao` - porta 3001. Busca latitude e longitude da cidade na Open-Meteo Geocoding.
- `services/meteorologia` - porta 3002. Busca o clima atual e a previsão de 5 dias na Open-Meteo Forecast.
- `services/historico` - porta 3003. Guarda as últimas 5 cidades consultadas.

O frontend chama `GET /api/clima?cidade=...` no gateway. O gateway chama a localização, depois a meteorologia, registra a cidade no histórico e devolve tudo em um JSON.

## Respostas do gateway

- 200: consulta feita com sucesso
- 400: cidade vazia, com menos de 2 ou mais de 100 caracteres
- 404: cidade não encontrada
- 502: algum serviço ou a Open-Meteo fora do ar ou demorando

Em caso de erro a resposta vem como `{ "erro": "mensagem" }`.

## Rotas

- `GET /api/clima?cidade=Salvador`
- `GET /api/historico`

## Como rodar

Precisa do Node.js 18 ou superior.

```bash
npm install
npm start
```

Depois é só abrir http://localhost:3000.

Também dá para subir cada serviço separado:

```bash
npm run start:localizacao
npm run start:meteorologia
npm run start:historico
npm run start:gateway
```

## Testes

```bash
npm test
```
