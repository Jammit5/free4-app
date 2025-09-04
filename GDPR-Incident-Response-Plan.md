# GDPR Incident Response Plan - Free4 App

**Verantwortlicher:** Benjamin Lange, jammit@gmail.com  
**Letzte Aktualisierung:** 04.09.2025  
**Status:** Aktiv

## 🚨 Sofortmaßnahmen bei Datenschutzvorfall

### Phase 1: Erkennung & Bewertung (0-2 Stunden)

#### Incident Detection Channels:
- [ ] Supabase Dashboard Alerts
- [ ] Vercel Error Monitoring  
- [ ] User Support E-Mails (jammit@gmail.com)
- [ ] GitHub Security Alerts
- [ ] Manuelle Entdeckung

#### Risikobewertung:
```
Niedrig: Technische Logs, keine personenbezogenen Daten
Mittel: Begrenzte Nutzerdaten, kein Identitätsdiebstahl-Risiko
Hoch: Umfangreiche Nutzerdaten, Identitäten, Standorte betroffen
```

### Phase 2: Eindämmung (2-6 Stunden)

#### Sofort-Checklist:
- [ ] Betroffene Services identifizieren
- [ ] Supabase RLS-Policies prüfen
- [ ] Vercel Deployment pausieren/rollback
- [ ] API-Keys rotieren (Supabase, Mapbox, Resend)
- [ ] Betroffene User-Accounts temporär sperren
- [ ] Screenshots/Logs für Forensik sichern

#### Technische Maßnahmen:
```bash
# Notfall-Deployment stoppen
vercel --prod --pause

# Database Connection prüfen
# Supabase Dashboard -> Settings -> API

# Monitoring intensivieren
# Vercel Dashboard -> Functions -> Errors
```

### Phase 3: Meldungen (6-72 Stunden)

#### Behörden-Meldung (DSGVO Art. 33):
**Zuständig:** Berliner Beauftragte für Datenschutz und Informationsfreiheit

- **Website:** https://www.datenschutz-berlin.de
- **E-Mail:** mailbox@datenschutz-berlin.de  
- **Online-Meldung:** https://www.datenschutz-berlin.de/meldung-datenpanne

**Frist:** 72 Stunden nach Kenntniserlangung

#### Nutzer-Information (DSGVO Art. 34):
**Erforderlich bei:** Hohem Risiko für Rechte und Freiheiten

**Kanäle:**
- E-Mail an betroffene Nutzer
- In-App Notification (falls System verfügbar)
- Website-Banner auf free4-app.vercel.app

**Frist:** Unverzüglich

---

## 📧 E-Mail Templates

### Template 1: Behörden-Meldung

```
An: mailbox@datenschutz-berlin.de
Betreff: Meldung Datenschutzverstoß gemäß Art. 33 DSGVO - Free4 App

Sehr geehrte Damen und Herren,

hiermit melde ich gemäß Art. 33 DSGVO einen Datenschutzverstoß:

VERANTWORTLICHER:
Benjamin Lange
Höchste Str. 12, 10249 Berlin
E-Mail: jammit@gmail.com
App: Free4 (https://free4-app.vercel.app)

INCIDENT DETAILS:
- Zeitpunkt: [Datum, Uhrzeit]
- Art des Vorfalls: [Beschreibung]
- Betroffene Daten: [Kategorien]
- Geschätzte Anzahl Betroffener: [Zahl]

URSACHE:
[Technische/Organisatorische Ursache]

BEREITS ERGRIFFENE MASSNAHMEN:
- [Maßnahme 1]
- [Maßnahme 2]
- [Maßnahme 3]

GEPLANTE MASSNAHMEN:
- [Maßnahme 1]
- [Maßnahme 2]

RISIKOBEWERTUNG:
[ ] Niedriges Risiko
[ ] Mittleres Risiko  
[ ] Hohes Risiko

Begründung: [Erläuterung]

Mit freundlichen Grüßen
Benjamin Lange
```

### Template 2: Nutzer-Information (Hohes Risiko)

```
Betreff: Wichtige Sicherheitsinformation zu Ihrem Free4-Account

Liebe Free4-Nutzerin, lieber Free4-Nutzer,

wir informieren Sie über einen Sicherheitsvorfall, der Ihre Daten betreffen könnte.

WAS IST PASSIERT?
Am [Datum] haben wir einen Vorfall in unserem System entdeckt: [Beschreibung]

WELCHE IHRER DATEN SIND BETROFFEN?
- [Datenart 1: z.B. Name, E-Mail]
- [Datenart 2: z.B. Standortdaten]
- [Datenart 3: z.B. Event-Informationen]

RISIKO FÜR SIE:
[Konkrete Risikobewertung]

WAS WIR UNTERNOMMEN HABEN:
- Sicherheitslücke sofort geschlossen
- Betroffene Systeme isoliert
- Zusätzliche Sicherheitsmaßnahmen implementiert
- Behörden informiert

WAS SIE TUN SOLLTEN:
- [Konkrete Handlungsempfehlung]
- Bei Fragen kontaktieren Sie uns: jammit@gmail.com

Wir entschuldigen uns für diesen Vorfall und die Unannehmlichkeiten.

Mit freundlichen Grüßen
Benjamin Lange
Free4 App Team

--
Benjamin Lange
Höchste Str. 12, 10249 Berlin
jammit@gmail.com
```

### Template 3: Nutzer-Information (Niedriges Risiko)

```
Betreff: Sicherheitsupdate für die Free4 App

Liebe Free4-Nutzerin, lieber Free4-Nutzer,

wir möchten Sie über ein Sicherheitsupdate informieren.

Am [Datum] haben wir eine technische Schwachstelle in unserem System entdeckt und behoben. Ihre persönlichen Daten waren zu keinem Zeitpunkt unbefugt zugänglich.

BETROFFENE BEREICHE:
[Technische Details]

UNSERE MASSNAHMEN:
- Sofortige Behebung der Schwachstelle
- Verstärkte Sicherheitsüberwachung
- Zusätzliche Schutzmaßnahmen implementiert

IHR KONTO:
Ihr Account und Ihre Daten sind sicher. Sie müssen nichts unternehmen.

Bei Fragen stehen wir gerne zur Verfügung: jammit@gmail.com

Mit freundlichen Grüßen
Benjamin Lange
Free4 App Team
```

---

## 📞 Wichtige Kontakte

### Datenschutzbehörde Berlin
- **Name:** Berliner Beauftragte für Datenschutz und Informationsfreiheit
- **Adresse:** Friedrichstr. 219, 10969 Berlin
- **Telefon:** 030 13889-0
- **E-Mail:** mailbox@datenschutz-berlin.de
- **Website:** https://www.datenschutz-berlin.de
- **Online-Meldung:** https://www.datenschutz-berlin.de/meldung-datenpanne

### Technische Dienstleister
- **Supabase Support:** https://supabase.com/support
- **Vercel Support:** https://vercel.com/help
- **Mapbox Support:** https://support.mapbox.com
- **Resend Support:** https://resend.com/support

---

## ✅ Post-Incident Checklist

### Innerhalb 7 Tagen:
- [ ] Root-Cause Analysis dokumentieren
- [ ] Security-Patches implementieren  
- [ ] Monitoring-Regeln anpassen
- [ ] Incident Report erstellen

### Innerhalb 30 Tagen:
- [ ] Lessons Learned Workshop
- [ ] Präventive Maßnahmen definieren
- [ ] Incident Response Plan aktualisieren
- [ ] Security-Audit durchführen

### Dokumentation:
- [ ] Incident Timeline erstellt
- [ ] Alle E-Mails/Meldungen archiviert
- [ ] Technische Logs gesichert
- [ ] Rechtliche Compliance bestätigt

---

## 🔧 Technische Monitoring-Setup

### Supabase Alerts:
```sql
-- Ungewöhnliche API-Aktivität überwachen
-- Dashboard -> Settings -> API -> Rate Limiting
```

### Vercel Monitoring:
```javascript
// In next.config.js für Error Tracking
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
}
```

### GitHub Security:
- Dependabot Alerts aktiviert
- Security Advisories abonniert
- Code Scanning aktiviert

---

**WICHTIG:** Dieser Plan muss regelmäßig (mindestens jährlich) überprüft und aktualisiert werden.

**Notfall-Kontakt:** Benjamin Lange, jammit@gmail.com, +49 [Telefon]