const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const dbFile = path.join(__dirname, "db.sqlite");
const db = new sqlite3.Database(dbFile);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "wichtel-geheimnis-123",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// initialize DB
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    partnerId INTEGER,
    drawnId INTEGER,
    isAdmin INTEGER DEFAULT 0
  )`);

  // seed example users if empty
  db.get("SELECT COUNT(*) as c FROM users", (err, row) => {
    if (row && row.c === 0) {
      const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
      ["Anna","Ben","Clara","David","Eva","Frank"].forEach(n => stmt.run(n));
      stmt.finalize();
    }
  });
});

// --- Helper middleware
function requireLogin(req, res, next){
  if (!req.session.user) return res.status(401).json({ error: "Nicht eingeloggt" });
  next();
}
function requireAdmin(req, res, next){
  if (!req.session.user || !req.session.user.isAdmin) return res.status(403).json({ error: "Admin Zugriff erforderlich" });
  next();
}

// --- API: get users (public list for login)
app.get("/api/users", (req, res) => {
  db.all("SELECT id, name FROM users ORDER BY name", (err, rows) => {
    res.json(rows || []);
  });
});

// --- Login: users select their name; admin requires password 'admin'
app.post("/api/login", (req, res) => {
  const { id, password } = req.body;
  if (!id) return res.status(400).json({ error: "id benötigt" });

  // check if id corresponds to the special Admin choice (id = "admin")
  if (id === "admin") {
    if (password !== "admin") return res.status(401).json({ error: "Falsches Admin-Passwort" });
    req.session.user = { id: "admin", name: "Admin", isAdmin: true };
    return res.json({ ok: true, isAdmin: true });
  }

  db.get("SELECT id, name, partnerId, drawnId FROM users WHERE id = ?", [id], (err, user) => {
    if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });
    req.session.user = { id: user.id, name: user.name, partnerId: user.partnerId || null, drawnId: user.drawnId || null, isAdmin: false };
    res.json({ ok: true, isAdmin: false });
  });
});

// --- Get current user
app.get("/api/me", (req, res) => {
  res.json(req.session.user || null);
});

// --- Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// --- Draw endpoint
app.post("/api/draw", requireLogin, (req, res) => {
  const me = req.session.user;
  if (me.id === "admin") return res.status(400).json({ error: "Admin kann nicht ziehen" });

  // check if already drawn
  db.get("SELECT drawnId FROM users WHERE id = ?", [me.id], (err, row) => {
    if (row && row.drawnId) {
      db.get("SELECT id, name FROM users WHERE id = ?", [row.drawnId], (err2, partner) => {
        return res.json({ id: partner.id, name: partner.name, already: true });
      });
      return;
    }

    // Build candidate list: not self, not partner, and not already drawn by someone
    const partnerId = me.partnerId || 0;
    db.all("SELECT id, name FROM users WHERE id != ? AND id != ? AND id NOT IN (SELECT drawnId FROM users WHERE drawnId IS NOT NULL)", [me.id, partnerId], (err3, candidates) => {
      if (!candidates || candidates.length === 0) {
        return res.status(400).json({ error: "Keine verfügbaren Kandidaten zum Ziehen" });
      }
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      // store drawnId for this user
      db.run("UPDATE users SET drawnId = ? WHERE id = ?", [choice.id, me.id], function(err4){
        if (err4) return res.status(500).json({ error: "DB Fehler" });
        // update session
        req.session.user.drawnId = choice.id;
        res.json({ id: choice.id, name: choice.name, already: false });
      });
    });
  });
});

// --- Admin: add user
app.post("/api/admin/add", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name benötigt" });
  db.run("INSERT INTO users (name) VALUES (?)", [name], function(err){
    if (err) return res.status(500).json({ error: "Konnte Nutzer nicht hinzufügen (vielleicht existiert Name bereits)" });
    res.json({ id: this.lastID, name });
  });
});

// --- Admin: delete user
app.post("/api/admin/delete", requireAdmin, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id benötigt" });
  db.run("DELETE FROM users WHERE id = ?", [id], function(err){
    if (err) return res.status(500).json({ error: "Löschen fehlgeschlagen" });
    // clear references
    db.run("UPDATE users SET partnerId = NULL WHERE partnerId = ?", [id]);
    db.run("UPDATE users SET drawnId = NULL WHERE drawnId = ?", [id]);
    res.json({ ok: true });
  });
});

// --- Admin: set partners (pairing) (send {a, b} to set them as partners)
app.post("/api/admin/setpartner", requireAdmin, (req, res) => {
  const { a, b } = req.body;
  if (!a || !b) return res.status(400).json({ error: "a und b benötigt" });
  db.run("UPDATE users SET partnerId = ? WHERE id = ?", [b, a]);
  db.run("UPDATE users SET partnerId = ? WHERE id = ?", [a, b]);
  res.json({ ok: true });
});

// --- Admin: reset draws (for new year)
app.post("/api/admin/reset", requireAdmin, (req, res) => {
  db.run("UPDATE users SET drawnId = NULL", [], function(err){
    if (err) return res.status(500).json({ error: "Reset fehlgeschlagen" });
    res.json({ ok: true });
  });
});

// --- Admin: list full users for admin table
app.get("/api/admin/users", requireAdmin, (req, res) => {
  db.all("SELECT id, name, partnerId, drawnId FROM users ORDER BY name", (err, rows) => {
    res.json(rows || []);
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server läuft auf port", port));