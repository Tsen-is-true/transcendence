#!/bin/sh
CERT_DIR="/etc/nginx/certs"
if [ ! -f "$CERT_DIR/server.crt" ]; then
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.crt" \
        -subj "/C=KR/ST=Seoul/L=Seoul/O=Transcendence/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"
    echo "SSL certificates generated."
else
    echo "SSL certificates already exist, skipping generation."
fi
exec nginx -g 'daemon off;'
