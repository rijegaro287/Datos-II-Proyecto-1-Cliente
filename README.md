npm install -> En el directorio base para descargar dependencias
npm start -> En el directorio base para correr

Si aparece el error "The SUID sandbox helper binary was found, but is not configured correctly...", hacer:

cd node_modules/electron/dist/
sudo chown root chrome-sandbox
sudo chmod 4755 chrome-sandbox
