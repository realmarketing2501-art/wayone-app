# WAY ONE - rebuild ready package

Questo pacchetto sostituisce la versione deployata e include una migrazione DB da v1.

# WAY ONE — Guida Completa: Build e Deploy

## Struttura del progetto

```text
wayone-production/
├── frontend/                       # React + Vite + PWA
├── backend/                        # Node.js + Express + PostgreSQL
├── nginx/
│   ├── wayone.conf                 # Config finale HTTPS
│   └── wayone-http-bootstrap.conf  # Config iniziale HTTP per il primo avvio
├── ecosystem.config.cjs            # PM2 config pronta
├── docker-compose.yml              # Sviluppo locale
└── README.md
```

---

## 1. Sviluppo locale con Docker

```bash
cd wayone-production
docker-compose up --build

# Prima esecuzione: seed del database
docker exec wayone-api npm run seed
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`
- Admin iniziale: `admin@wayone.io / admin123`
- Demo iniziale: `demo@wayone.io / test123`

**Importante:** cambia subito la password admin dopo il deploy.

---

## 2. Build manuale senza Docker

### Prerequisiti
- Node.js 20+
- PostgreSQL 16+
- npm

### Backend

```bash
cd backend
npm install
cp .env.example .env
nano .env

npm run build
psql "postgresql://wayone:TUAPASSWORD@127.0.0.1:5432/wayone_db" -f schema.sql
npm run seed
npm start
```

### Frontend

```bash
cd frontend
npm install
printf 'VITE_API_URL=http://localhost:3001/api\n' > .env
npm run build
```

---

## 3. Deploy server Ubuntu 24.04 (generico / AWS EC2 / Lightsail)

### 3.1 Pacchetti server

```bash
sudo apt update && sudo apt upgrade -y

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

sudo apt install -y \
  nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib \
  unzip git curl

sudo npm install -g pm2
```

### 3.2 Caricamento codice

**Via zip:**

```bash
scp -i tua-chiave.pem wayone-production.zip ubuntu@IP_SERVER:/home/ubuntu/
```

Sul server:

```bash
cd /home/ubuntu
unzip -o wayone-production.zip
sudo mkdir -p /var/www
sudo mv /home/ubuntu/wayone-production /var/www/wayone
sudo chown -R $USER:$USER /var/www/wayone
```

### 3.3 PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER wayone WITH PASSWORD 'PASSWORD_SICURA';"
sudo -u postgres psql -c "CREATE DATABASE wayone_db OWNER wayone;"
```

### 3.4 Backend

```bash
cd /var/www/wayone/backend
cp .env.example .env
nano .env
```

Valori minimi consigliati:

```env
NODE_ENV=production
PORT=3001
API_URL=https://tuodominio.com/api
FRONTEND_URL=https://tuodominio.com
DATABASE_URL=postgresql://wayone:PASSWORD_SICURA@127.0.0.1:5432/wayone_db
JWT_SECRET=<genera con openssl rand -base64 64>
JWT_REFRESH_SECRET=<genera con openssl rand -base64 64>
```

Poi:

```bash
cd /var/www/wayone/backend
npm install
npm run build
psql "postgresql://wayone:PASSWORD_SICURA@127.0.0.1:5432/wayone_db" -f schema.sql
npm run seed
pm2 start /var/www/wayone/ecosystem.config.cjs
pm2 save
pm2 startup
```

Test API:

```bash
curl http://127.0.0.1:3001/api/health
```

### 3.5 Frontend

```bash
cd /var/www/wayone/frontend
npm install
printf 'VITE_API_URL=https://tuodominio.com/api\n' > .env
npm run build
```

### 3.6 Nginx: primo avvio corretto

**Primo avvio senza SSL**

```bash
sudo cp /var/www/wayone/nginx/wayone-http-bootstrap.conf /etc/nginx/sites-available/wayone
sudo nano /etc/nginx/sites-available/wayone   # sostituisci il dominio
sudo ln -s /etc/nginx/sites-available/wayone /etc/nginx/sites-enabled/wayone
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Dopo che il dominio punta al server:**

```bash
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com
```

**Config finale HTTPS (opzionale ma consigliata):**

```bash
sudo cp /var/www/wayone/nginx/wayone.conf /etc/nginx/sites-available/wayone
sudo nano /etc/nginx/sites-available/wayone   # sostituisci il dominio
sudo nginx -t
sudo systemctl reload nginx
```

### 3.7 PM2 utili

```bash
pm2 status
pm2 logs wayone-api
pm2 restart wayone-api
pm2 save
```

---

## 4. Deploy su AWS

### Opzione A — Lightsail

Più semplice da gestire. Crea una istanza Ubuntu, apri `22`, `80`, `443`, assegna IP statico e poi segui i passaggi della sezione 3.

### Opzione B — EC2

Impostazioni consigliate:
- AMI: Ubuntu Server 24.04 LTS
- Security Group: `22`, `80`, `443`
- Disco: 20–30 GB
- Utente SSH: `ubuntu`

Connessione:

```bash
ssh -i tua-chiave.pem ubuntu@IP_PUBBLICO
```

Poi segui la sezione 3 usando sempre `sudo` dove necessario.

---

## 5. File importanti

- `backend/.env.example` → template variabili ambiente
- `backend/schema.sql` → schema database da importare
- `nginx/wayone-http-bootstrap.conf` → config iniziale HTTP
- `nginx/wayone.conf` → config finale HTTPS
- `ecosystem.config.cjs` → avvio PM2 del backend

---

## 6. Configurazione successiva dal pannello Admin

Questi valori possono essere inseriti dopo il deploy dal pannello Admin:
- TronGrid API key
- Infura API key
- SendGrid API key
- Wallet crypto aziendali

Non è necessario modificare il codice per questi valori, se l'applicazione è stata deployata correttamente.
