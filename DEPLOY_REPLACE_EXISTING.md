# WAY ONE - sostituire l'app attuale con il nuovo pacchetto

## 1. Backup veloce sul server
```bash
cd /home/ubuntu
cp -a wayone-app wayone-app-backup-$(date +%F-%H%M)
```

## 2. Carica il nuovo zip sul server
Carica questo zip nella home del server come hai già fatto la prima volta.

## 3. Sostituisci i file del progetto
```bash
cd /home/ubuntu
rm -rf wayone-next
mkdir -p wayone-next
unzip -o wayone-production-rebuild-ready.zip -d wayone-next
rm -rf /home/ubuntu/wayone-app/wayone-production
mkdir -p /home/ubuntu/wayone-app
cp -a /home/ubuntu/wayone-next/. /home/ubuntu/wayone-app/wayone-production
```

## 4. Controlla `.env`
Mantieni il tuo file backend `.env` attuale. Se hai già un `.env` funzionante, ricopialo dopo la sostituzione.

Esempio:
```bash
cp /home/ubuntu/wayone-app-backup-YYYY-MM-DD-HHMM/wayone-production/backend/.env /home/ubuntu/wayone-app/wayone-production/backend/.env
```

## 5. Applica migrazione + rebuild completo
```bash
cd /home/ubuntu/wayone-app/wayone-production
bash scripts/replace_existing_install.sh
```

## 6. Test rapidi
```bash
curl http://127.0.0.1/api/health
curl -I http://127.0.0.1
pm2 status
sudo nginx -t
```

## 7. Se qualcosa va storto
Ripristino rapido:
```bash
rm -rf /home/ubuntu/wayone-app
cp -a /home/ubuntu/wayone-app-backup-YYYY-MM-DD-HHMM /home/ubuntu/wayone-app
cd /home/ubuntu/wayone-app/wayone-production/backend && pm2 restart wayone-api
sudo systemctl reload nginx
```

## Note importanti
- Questo pacchetto porta configurazione livelli e piani su DB.
- I prelievi restano approvati manualmente da admin.
- I depositi restano principalmente gestiti con review/admin, con base per automazione supportata.
- Prima del go-live finale cambia password admin, JWT secret e wallet di produzione.
