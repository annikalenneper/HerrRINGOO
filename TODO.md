# TODO

## Instagram-Anbindung (Posts per Meta-API einplanen) – später

Technischer Plan: [`netlify/instagram-publish-plan.md`](netlify/instagram-publish-plan.md).
Das Einplanen und das automatische Verschieben laufen bereits. Es fehlt nur der eigentliche
Instagram-Aufruf. Den Code setzt Claude um, sobald die folgenden Schritte erledigt sind.

### Einmalig bei Meta (Anni)

- [ ] Instagram-Konto ist ein **Business- oder Creator-Konto** (kein privates Konto)
- [ ] **Meta-Entwicklerkonto** anlegen (developers.facebook.com)
- [ ] **App anlegen** und das Produkt „Instagram API with Instagram Login“ hinzufügen (keine Facebook-Seite nötig)
- [ ] Instagram-Konto der App **als Rolle zuordnen** und die Einladung in Instagram bestätigen
- [ ] **Access Token** erzeugen mit `instagram_business_basic` + `instagram_business_content_publish`
- [ ] Token gegen einen **Langzeit-Token (60 Tage)** tauschen
- [ ] Token in **Netlify** als Umgebungsvariable `INSTAGRAM_ACCESS_TOKEN` hinterlegen (nicht im Chat/Repo teilen)
- [ ] **Erinnerung einrichten:** Token etwa alle 50 Tage erneuern (wer ist zuständig?)

### In GitHub prüfen (Settings → Secrets and variables → Actions)

- [ ] Repository-Secret `CREATE_POST_SECRET` (gleicher Wert wie in Netlify)
- [ ] Repository-Variable `NETLIFY_SITE_URL` (z. B. `https://….netlify.app`, ohne Slash am Ende)

Ohne beides läuft der 15-Minuten-Job zum Veröffentlichen ins Leere.

### Danach (Claude)

- [ ] Prüfen, ob `medien/` öffentlich erreichbar ist (Instagram lädt die Bilder selbst per URL)
- [ ] Instagram-Anbindung umsetzen (Einzelbild + Karussell, max. 10 Bilder, nur JPG)
- [ ] In „Jetzt veröffentlichen“ und den automatischen Job einbauen, Media-ID im Post speichern
- [ ] Test mit einem echten Post
