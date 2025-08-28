# MapBox Integration Setup

Die Free4-App unterstützt **MapBox** für kommerzielle Nutzung mit einem großzügigen Free Tier (50.000 Requests/Monat).

## 🚀 MapBox Account erstellen

1. Gehe zu https://account.mapbox.com/auth/signup/
2. Erstelle einen kostenlosen Account
3. Bestätige deine E-Mail-Adresse

## 🔑 API Token erstellen

1. Gehe zu https://account.mapbox.com/access-tokens/
2. Klicke "Create a token"
3. **Name**: `Free4-App-Production`
4. **Token scope**: Stelle sicher dass folgende aktiviert sind:
   - `styles:read`
   - `fonts:read` 
   - `datasets:read`
   - `vision:read` (optional)
5. **URL restrictions** (für Sicherheit):
   - Entwicklung: `http://localhost:3000`
   - Production: `https://yourapp.com`
6. Klicke "Create token"
7. **Kopiere den Token** (beginnt mit `pk.`)

## 📝 Token in App konfigurieren

1. Öffne `.env.local` in deinem Projekt
2. Ersetze den Platzhalter:
   ```env
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.dein_echter_token_hier
   ```
3. Starte die App neu: `npm run dev`

## ✅ Funktionstest

1. Gehe zu http://localhost:3000
2. Erstelle ein neues Free4
3. Wähle "Vor Ort" als Ort
4. Tippe einen Ortsnamen → MapBox Vorschläge erscheinen
5. Klicke den Globe-Button → Interaktive MapBox Karte öffnet sich

## 💰 Kosten & Limits

### Free Tier (kostenlos):
- **50.000 Map Loads** pro Monat
- **50.000 Geocoding Requests** pro Monat
- Keine Kreditkarte erforderlich

### Nach Free Tier:
- **Map Loads**: $0.50 per 1.000 requests
- **Geocoding**: $0.75 per 1.000 requests
- Sehr günstig für kleine bis mittlere Apps

## 🔄 Fallback System

Wenn kein MapBox Token konfiguriert ist, verwendet die App automatisch:
- **OpenStreetMap** für Ortssuche (kostenlos, aber nur für light usage)
- **Leaflet** für interaktive Karten (kostenlos)

## 📈 Monitoring

- Überwache deine Usage: https://account.mapbox.com/
- Setze Billing Alerts für Kostenkontrolle
- Upgrade bei Bedarf auf höhere Tiers

## 🛡️ Sicherheit

- **Public Token**: Sicher für Frontend-Usage
- **URL Restrictions**: Verhindert Missbrauch
- **Rotate Tokens**: Regelmäßig für Production Apps

## 🆘 Support

- MapBox Docs: https://docs.mapbox.com/
- Community Support: https://support.mapbox.com/
- Pricing: https://www.mapbox.com/pricing/