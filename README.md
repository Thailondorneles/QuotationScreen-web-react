# Projeto Tela Cotacao

## Documentação funcional e técnica

A documentação completa do simulador está disponível em [`docs/README.md`](docs/README.md), incluindo fluxo da tela, regras de cálculo, APIs, payload ERP, propostas, suporte e matriz de testes.

Aplicacao com:
- frontend React
- backend Node/Express em `backend-simfrete`
- publicacao pronta com Podman e Podman Compose

## Desenvolvimento local

### Frontend
```bash
npm install
npm start
```

O frontend abre em `http://localhost:3000`.

### Backend
```bash
cd backend-simfrete
npm install
node server.js
```

O backend sobe em `http://localhost:3001`.

## Producao com Podman

Em producao, o fluxo fica assim:
- o `nginx` serve o frontend React
- o `nginx` encaminha `/api/*` para o backend
- o backend chama o SimFrete e a API da Unimed

Arquivos usados:
- `Dockerfile.frontend`
- `backend-simfrete/Dockerfile`
- `docker-compose.yml`
- `docker/nginx/default.conf`

## Arquivos de ambiente

### Frontend

Copie `.env.example` para `.env` se quiser sobrescrever as URLs de build:

```bash
cp .env.example .env
```

Valores padrao:
```env
REACT_APP_SIMFRETE_API_BASE_URL=/
REACT_APP_UNIMED_API_BASE_URL=/api/unimed/
```

Na configuracao atual, o frontend usa o proprio `nginx` como entrada e nao precisa conhecer o IP interno do backend.

### Backend

Copie o exemplo:

```bash
cp backend-simfrete/.env.example backend-simfrete/.env
```

Preencha o arquivo `backend-simfrete/.env`:

```env
PORT=3001
HOST=0.0.0.0
SIMFRETE_USER=seu_usuario
SIMFRETE_PASS=sua_senha
UNIMED_API_BASE_URL=https://nl-homolog.unimedcentralrs.com.br/ords/nl/unimed/
```

## Como subir no Linux

### 1. Instalar Docker

```bash
sudo dnf module install -y container-tools:ol8
podman version
podman info
```

Confira:

```bash
podman --version
podman compose version
```

### 2. Enviar o projeto para o servidor

Voce pode:
- clonar com `git clone`
- copiar a pasta com WinSCP
- usar `scp`

Depois entre na pasta do projeto:

```bash
cd projeto-tela-cotacao
```

### 3. Criar os arquivos `.env`

```bash
cp .env.example .env
cp backend-simfrete/.env.example backend-simfrete/.env
```

Edite `backend-simfrete/.env` com suas credenciais reais.

### 4. Construir e subir

```bash
podman compose up -d --build
```

Esse comando:
- builda o frontend React
- builda o backend Node
- sobe os dois containers

### 5. Verificar se subiu

```bash
podman ps
```

Para ver logs:

```bash
podman compose logs -f
```

Logs so do backend:

```bash
podman compose logs -f backend
```

### 6. Acessar a aplicacao

Abra no navegador:

```text
http://172.20.3.37
```

## Como atualizar depois de publicar

Sempre que mudar o codigo:

```bash
git pull
podman compose up -d --build
```

## Comandos uteis

Parar os containers:

```bash
podman compose down
```

Reiniciar:

```bash
podman compose restart
```

Ver containers:

```bash
podman compose ps
```

## Estrategia usada aqui

### Frontend
- buildado com `npm run build`
- servido por `nginx`

### Backend
- rodando com `node server.js`
- exposto apenas dentro da rede do `podman compose`

### Proxy
- requisicoes `/api/cotacao` e `/api/unimed/*` passam pelo `nginx`
- o navegador fala so com a porta `80`

## Observacoes importantes

- `npm start` e so para desenvolvimento
- em producao, o React deve usar `npm run build`
- o arquivo `backend-simfrete/.env` nao deve ir para o Git
- a porta publicada hoje e a `80`; se ja existir outro servico nela, troque no `docker-compose.yml`

## Primeira publicacao resumida

1. Instale Podman no Linux.
2. Copie o projeto para o servidor.
3. Crie `backend-simfrete/.env`.
4. Rode `podman compose up -d --build`.
5. Abra `http://172.20.3.37`.
