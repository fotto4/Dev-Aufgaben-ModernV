# Aufgabe 3

## Was fertig ist:
- /report öffnet das Formular: Kategorie (Bug, Spieler melden, Frage, Sonstiges), Text mit 10 bis 300 Zeichen, bei "Spieler melden" zusätzlich die Server-ID
- Reports liegen in einer Lua-Tabelle (laufende Nummer, Absender mit Name und ID, Kategorie, Text, Uhrzeit)
-  Speicherung auf einer JSON datei
- Spieler mit dem ACE-Recht report.view bekommen bei einem neuen Report eine Chatnachricht

## Was Fehlt oder Einschränkungen:
- Die Cooldown-Tabelle wird nie aufgeräumt (wächst langsam mit der Spielerzahl)
- Keine Seiten oder Filter in der Report-Liste
- Erledigte Reports bleiben in der JSON-Datei

## MIt mehr Zeit:
- Filter und Seiten für die Liste
- Konfiguration (Cooldown, Textlänge, Kategorien) in eine eigene Datei
- Datenbank statt JSON

## Zeitaufwand
ca. 5-6 Stunden