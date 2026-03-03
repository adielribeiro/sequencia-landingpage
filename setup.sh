#!/usr/bin/env bash
set -e

echo "[setup] Instalando dependências do SERVER..."
cd "$(dirname "$0")/server"
npm install

echo "[setup] Instalando dependências do CLIENT..."
cd "../client"
npm install

echo "[setup] Pronto!"
echo "- Para iniciar o servidor:  (cd server && npm start)"
echo "- Para iniciar o client:    (cd client && npm run dev)"
