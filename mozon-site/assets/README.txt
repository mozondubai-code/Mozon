MOZON BROAST — ASSETS FOLDER
============================

Drop these files here before going live (names must match exactly):

  favicon.png     32x32  (browser tab icon)
  icon-192.png    192x192 (PWA / Add to Home Screen)
  icon-512.png    512x512 (PWA splash)

The website currently pulls food + shop photos live from your Google Drive
(via drive.google.com/thumbnail links) so it looks complete immediately.

FOR BEST SPEED / SEO (recommended before final launch):
  1. Export your best photos from Drive as WebP (or compressed JPG, <200KB each).
  2. Put them in this /assets folder, e.g. hero.webp, dish-8pcs.webp, gallery-1.webp ...
  3. In index.html, replace the DRIVE(...) image URLs with local paths
     like  assets/hero.webp  — local images rank better and load faster than
     Drive-hosted ones.

IMPORTANT — for the Drive images to show for everyone:
  Each Drive photo folder must be shared as "Anyone with the link — Viewer".
  (Drive > right-click folder > Share > General access > Anyone with the link.)
  If images look broken, that sharing setting is why.
