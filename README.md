# 📁 Dateikonverter

> **Konvertiere Bilder, Texte, Audio- und Videodateien direkt im Browser — einfach und schnell.**

---

## 📖 Über das Projekt

**Dateikonverter** ist eine webbasierte Anwendung zum Umwandeln verschiedener Dateiformate. Lade eine Datei per Drag & Drop oder Klick hoch, wähle das gewünschte Zielformat und lade das Ergebnis mit einem Klick herunter.

---

## ✨ Funktionen

| Feature | Beschreibung |
|--------|---------------|
| 🖱️ **Drag & Drop** | Dateien einfach in den Upload-Bereich ziehen oder per Klick auswählen |
| 🖼️ **Bilder** | JPEG, PNG, WebP untereinander konvertieren |
| 📄 **Texte** | TXT, HTML, JSON, XML — inkl. JSON↔XML und HTML→TXT |
| 🎵 **Audio** | MP3, WAV, OGG, WebM (Konvertierung über FFmpeg) |
| 🎬 **Video** | MP4, WebM, OGG (Konvertierung über FFmpeg) |
| 📊 **Fortschritt** | Fortschrittsbalken während der Konvertierung |

---

## 🛠️ Technologie-Stack

| Bereich | Technologie |
|--------|-------------|
| **Backend** | Node.js, Express |
| **Upload** | Multer |
| **Media-Konvertierung** | FFmpeg (fluent-ffmpeg) |
| **Frontend** | Vanilla HTML, CSS, JavaScript |

---

## 📋 Unterstützte Formate

### 🖼️ Bilder
- **Eingabe:** JPEG, PNG, WebP, GIF, BMP, SVG, ICO  
- **Ausgabe:** JPEG, PNG, WebP  

### 📄 Texte
- **Eingabe:** TXT, HTML, JSON, XML, CSS, JS, Markdown, CSV  
- **Ausgabe:** TXT, HTML, JSON, XML  

### 🎵 Audio
- **Eingabe:** MP3, WAV, OGG, WebM, AAC  
- **Ausgabe:** MP3, WAV, OGG, WebM  

### 🎬 Video
- **Eingabe:** MP4, WebM, OGG, AVI, MKV  
- **Ausgabe:** MP4, WebM, OGG  

---

## ⚙️ Voraussetzungen

- **Node.js** (v14 oder neuer)
- **FFmpeg** (für Audio- und Videokonvertierung) — muss im System installiert und im `PATH` verfügbar sein

<details>
<summary>🔧 FFmpeg installieren</summary>

- **macOS:** `brew install ffmpeg`  
- **Ubuntu/Debian:** `sudo apt install ffmpeg`  
- **Windows:** [FFmpeg herunterladen](https://ffmpeg.org/download.html) und ins PATH setzen  

</details>

---

## 🚀 Installation & Start

```bash
# Repository klonen
git clone https://github.com/SaweliKudasow/FileConverter.git
cd FileConverter

# Abhängigkeiten installieren
npm install

# Server starten
npm start
```

Die App läuft unter **http://localhost:3000** (oder dem konfigurierten `PORT`).

---

## 📌 Verwendung

1. **Datei auswählen** — in den Upload-Bereich ziehen oder klicken und Datei wählen  
2. **Zielformat wählen** — im Dropdown das gewünschte Ausgabeformat auswählen  
3. **Konvertieren** — auf *Konvertieren* klicken und auf den Fortschritt warten  
4. **Herunterladen** — konvertierte Datei über den Download-Link speichern  

---

## 📁 Projektstruktur

```
FileConverter/
├── index.html      # Frontend-Seite (DE)
├── main.js         # Client-Logik, Upload & Konvertierungsaufrufe
├── style.css       # Styling
├── server.js       # Express-Server, Konvertierungs-API (FFmpeg, Text, Bilder)
├── package.json
└── README.md
```

---

## 📜 Lizenz

ISC 

---

*Mit ❤️ und Node.js gebaut.*
