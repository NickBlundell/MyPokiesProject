#!/bin/bash

# Script to set up Fundist OneWallet secrets in Supabase
# Run this after getting your credentials from Fundist

echo "========================================"
echo "Fundist OneWallet Secret Configuration"
echo "========================================"
echo ""

# Prompt for HMAC secret
echo "Enter your Fundist HMAC secret key:"
echo "(You'll get this from Fundist's admin panel or support)"
read -s HMAC_SECRET

if [ -z "$HMAC_SECRET" ]; then
    echo "Error: HMAC secret cannot be empty"
    exit 1
fi

# Prompt for allowed IPs
echo ""
echo "Enter Fundist callback server IPs (comma-separated, or leave blank to skip):"
echo "Example: 192.168.1.1,192.168.1.2"
read ALLOWED_IPS

# Set the secrets
echo ""
echo "Setting Supabase secrets..."

supabase secrets set FUNDIST_HMAC_SECRET="$HMAC_SECRET"

if [ -n "$ALLOWED_IPS" ]; then
    supabase secrets set FUNDIST_ALLOWED_IPS="$ALLOWED_IPS"
    echo "IP whitelist enabled: $ALLOWED_IPS"
else
    echo "Warning: No IP whitelist configured (anyone can call your endpoint)"
fi

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "Next steps:"
echo "1. Give this URL to Fundist: https://hupruyttzgeytlysobar.supabase.co/functions/v1/onewallet-callback"
echo "2. Make sure the HMAC secret in Fundist matches what you just entered"
echo "3. Test the integration using Fundist's test tool"
echo ""
