npm install -> En el directorio base para descargar dependencias <br>
npm start -> En el directorio base para correr <br> <br>

Si aparece el error "The SUID sandbox helper binary was found, but is not configured correctly...", hacer:<br>

cd node_modules/electron/dist/ <br>
sudo chown root chrome-sandbox <br>
sudo chmod 4755 chrome-sandbox <br>
