
# Familien Wichteln - Anleitung & Projekt

Dieses kleine Projekt implementiert ein einfaches Wichtel-System:
- Benutzer wählen beim Login ihren Namen aus (kein Passwort nötig).
- Admin wählt "Admin" und muss das Passwort `admin` eingeben.
- Nach dem Einloggen öffnet sich ein Glücksrad (Dashboard), das einen zufälligen Wichtelpartner auswählt.
- Admin kann Teilnehmer hinzufügen, löschen, Paare setzen und Ziehungen zurücksetzen.

## Dateien
- `server.js` - Express-Backend (Node.js)
- `db.sqlite` - SQLite Datenbank (wird automatisch angelegt)
- `public/` - Frontend-Dateien (`index.html`, `dashboard.html`, `admin.html`, `style.css`)

## Lokal starten (Schritt für Schritt, für Einsteiger)

1. **Node.js installieren**
   - Lade Node.js (Empfohlen LTS) von https://nodejs.org herunter und installiere es.

2. **Projekt entpacken**
   - Entpacke die ZIP in einen Ordner auf deinem Rechner.

3. **Abhängigkeiten installieren**
   - Öffne ein Terminal / Eingabeaufforderung und wechsle in den Projektordner:
     ```
     cd pfad/zum/familien-wichteln
     ```
   - Führe aus:
     ```
     npm install express sqlite3 express-session
     ```

4. **Server starten**
   - Im selben Ordner:
     ```
     node server.js
     ```
   - Du siehst die Meldung `Server läuft auf port 3000`.

5. **Website öffnen**
   - Öffne deinen Browser und gehe zu `http://localhost:3000`
   - Wähle im Login dein Name oder "Admin" (Passwort `admin`).

6. **Erste Schritte in der App**
   - Als Admin: Teilnehmer hinzufügen, ggf. Paare setzen (Partner).
   - Als Teilnehmer: Namen auswählen, Drehen drücken — der gezogene Name wird gespeichert.

## Deployment (kurze Hinweise)
- Für öffentliches Hosten kannst du Plattformen wie Render.com oder Railway.app nutzen.
- Dort musst du Node.js als Service anlegen und die Dateien hochladen / aus einem Git-Repository deployen.
- Achte darauf, dass `PORT` von der Plattform verwendet wird (mein Server nutzt `process.env.PORT`).

Viel Spaß beim Wichteln! 🎄
