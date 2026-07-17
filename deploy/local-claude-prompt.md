# Paste this into Claude Code running on YOUR PC

Copy everything in the box below into your local Claude Code (the one on your Windows machine),
then give it the FTP password from your ServerByt panel when it asks.

---

```
You are deploying my Mozon Broast website to my ServerByt (20i StackCP) hosting over FTP.

Repo: https://github.com/mozondubai-code/Mozon
Branch: claude/mozon-broast-website-canva-xrcevv
The website lives in the repo's `website/` folder. The offers page (`website/offers.html`)
must be deployed as `index.html` on the offersmozon.ae subdomain.

FTP details (from ServerByt → Service Overview → FTP Details):
  Host: ftp.us.mozonbroast.ae
  User: mozonbroast.ae
  Pass: <I will paste it here>
Main web root:   /public_html
Offers web root: /public_html/offersmozon.ae   (or the offersmozon.ae subdomain's own folder)

Do this:
1. Clone (or pull) the repo and check out the branch above.
2. Upload everything in `website/` to /public_html — index.html, assets/, robots.txt,
   sitemap.xml, site.webmanifest, .htaccess. Skip the .md files.
3. Upload `website/offers.html` to the offers web root as `index.html`.
4. Verify: fetch https://mozonbroast.ae and confirm it returns the Mozon Broast page,
   and that clicking Order points to https://offersmozon.ae.
5. Tell me if the offersmozon.ae subdomain doesn't exist yet so I can create it in the panel.

Use WinSCP, lftp, or the ftp client available. The repo already includes a script at
deploy/deploy-ftp.sh you can use directly on Linux/Mac/WSL:
  FTP_HOST=ftp.us.mozonbroast.ae FTP_USER=mozonbroast.ae FTP_PASS='...' ./deploy/deploy-ftp.sh
```
