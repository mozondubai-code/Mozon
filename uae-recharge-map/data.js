/* =============================================================================
   MOZON GIS — UAE Recharge Map  ·  DATA FILE
   ============================================================================= */

/* -----------------------------------------------------------------------------
   ⭐ LIVE GOOGLE SHEET — load thousands of machines without touching code.
   -----------------------------------------------------------------------------
   1. Put your machines in a Google Sheet with these column headers (row 1):
        name | building | area | emirate | lat | lng | services | hours | placement | around | verified
      - lat / lng : decimal numbers (from Google Maps / your export)
      - services  : separated by ; or ,   e.g.  du; Etisalat; iTunes; Botim
      - placement : where the machine sits — "Inside residential building" or
                    "In front of residential building" (this map lists only
                    residential-building machines)
      - verified  : yes/true to show the gold ✓ marker (optional, leave blank)
      - building / area / hours / around : optional text
   2. In the Sheet:  File → Share → Publish to web → (pick the sheet) →
      choose "Comma-separated values (.csv)" → Publish → copy the link.
   3. Paste that link between the quotes below, save, reload the page.

   Leave it "" to use the bundled sample data instead.
--------------------------------------------------------------------------- */
const CONFIG = {
  // Owner's Google Sheet — paste the normal sheet link, a bare ID, or a CSV link;
  // the app derives a working CSV endpoint automatically. The sheet's sharing must
  // be "Anyone with the link → Viewer" (or File → Publish to web). Falls back to the
  // sample data below (with an on-screen note) if the sheet is private/unreachable.
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/1pi6g4iMUkzn-bSW53Tky0419sAofyXKJFwVZcc419Yg/edit",
  LIST_LIMIT: 60,   // max machines listed in the sidebar at once (map shows all, clustered)
};

/* -----------------------------------------------------------------------------
   Everything below is SAMPLE data so the page works before your Sheet is set.

   HOW TO ADD A REAL RECHARGE MACHINE
   ----------------------------------
   Copy one { ... } block inside RECHARGE_POINTS and change the values:

   HOW TO ADD A REAL RECHARGE MACHINE
   ----------------------------------
   Copy one { ... } block inside RECHARGE_POINTS and change the values:

     coords:  [latitude, longitude]   ← get these from Google Maps:
              right-click the exact spot → the first line is "lat, lng".
     name:    the kiosk / shop name
     building:the building it sits in
     area:    must match one "id" in AREAS below (e.g. "al-nahda-2")
     services:pick from the SERVICES list (du, Etisalat, iTunes, Botim ...)
     around:  short note about the surroundings (what's next to it)

   HOW TO ADD A NEW AREA (so people can search it)
   -----------------------------------------------
   Add a block to AREAS with a unique id, the display name, its center
   coords and a zoom level (16 = street level).

   Save the file, refresh the page. That's it — no build step.
   ========================================================================== */

/* The recharge services a machine can offer. Add your own freely. */
const SERVICES = [
  "du",            // du mobile top-up
  "Etisalat",      // e& / Etisalat mobile top-up
  "Salik",         // Salik toll recharge
  "Nol",           // RTA Nol card top-up
  "iTunes",        // Apple / iTunes gift cards
  "Google Play",   // Google Play gift cards
  "Botim",         // Botim credit / data
  "PUBG UC",       // Game credits
  "DEWA",          // Utility bill payment
  "Cash Out",      // Money exchange / cash out
];

/* Colour + emoji shown for each service chip (optional cosmetics). */
const SERVICE_META = {
  "du":          { c: "#EC1C7D", e: "📱" },
  "Etisalat":    { c: "#00A651", e: "📶" },
  "Salik":       { c: "#0072BC", e: "🚗" },
  "Nol":         { c: "#E30613", e: "🚇" },
  "iTunes":      { c: "#000000", e: "🎵" },
  "Google Play": { c: "#00875F", e: "🎮" },
  "Botim":       { c: "#1E88E5", e: "💬" },
  "PUBG UC":     { c: "#F2A900", e: "🎯" },
  "DEWA":        { c: "#00693C", e: "💡" },
  "Cash Out":    { c: "#6D4C41", e: "💵" },
};

/* -----------------------------------------------------------------------------
   AREAS — searchable neighbourhoods across the UAE.
   Al Nahda 2 is filled in richly; others are starters you can grow.
--------------------------------------------------------------------------- */
const AREAS = [
  /* ===== EMIRATE-LEVEL AREAS for the real machines (search by emirate) ===== */
  {
    id: "dubai",
    name: "Dubai",
    name_ar: "دبي",
    emirate: "Dubai",
    aliases: ["dubai city", "دبي"],
    center: [25.214783, 55.244462],
    zoom: 15,
  },
  {
    id: "sharjah",
    name: "Sharjah",
    name_ar: "الشارقة",
    emirate: "Sharjah",
    aliases: ["sharjah city", "الشارقة"],
    center: [25.349027, 55.388262],
    zoom: 15,
  },
  {
    id: "ajman",
    name: "Ajman",
    name_ar: "عجمان",
    emirate: "Ajman",
    aliases: ["ajman city", "عجمان"],
    center: [25.394955, 55.454225],
    zoom: 15,
  },
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    name_ar: "أبوظبي",
    emirate: "Abu Dhabi",
    aliases: ["abu dhabi city", "أبوظبي"],
    center: [24.459227, 54.381018],
    zoom: 15,
  },
  {
    id: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    name_ar: "رأس الخيمة",
    emirate: "Ras Al Khaimah",
    aliases: ["rak", "ras al khaimah city", "رأس الخيمة"],
    center: [25.747238, 55.927540],
    zoom: 15,
  },
  {
    id: "fujairah",
    name: "Fujairah",
    name_ar: "الفجيرة",
    emirate: "Fujairah",
    aliases: ["fujairah city", "الفجيرة"],
    center: [25.121969, 56.347127],
    zoom: 15,
  },

  /* ===== NEIGHBOURHOOD SAMPLE AREAS (demo — safe to delete) ===== */
  {
    id: "al-nahda-2",
    name: "Al Nahda 2",
    name_ar: "النهدة 2",
    emirate: "Dubai",
    aliases: ["al nahda", "nahda 2", "al nahda dubai", "النهدة"],
    center: [25.2946, 55.3646],
    zoom: 16,
  },
  {
    id: "al-nahda-sharjah",
    name: "Al Nahda (Sharjah)",
    name_ar: "النهدة الشارقة",
    emirate: "Sharjah",
    aliases: ["nahda sharjah", "sahara centre", "ansar mall"],
    center: [25.3236, 55.3889],
    zoom: 16,
  },
  {
    id: "deira",
    name: "Deira",
    name_ar: "ديرة",
    emirate: "Dubai",
    aliases: ["al rigga", "naif", "gold souk"],
    center: [25.2710, 55.3140],
    zoom: 15,
  },
  {
    id: "bur-dubai",
    name: "Bur Dubai",
    name_ar: "بر دبي",
    emirate: "Dubai",
    aliases: ["meena bazaar", "al fahidi", "karama"],
    center: [25.2560, 55.2960],
    zoom: 15,
  },
  {
    id: "al-barsha",
    name: "Al Barsha 1",
    name_ar: "البرشاء",
    emirate: "Dubai",
    aliases: ["mall of the emirates", "barsha"],
    center: [25.1130, 55.1960],
    zoom: 15,
  },
  {
    id: "al-majaz",
    name: "Al Majaz",
    name_ar: "المجاز",
    emirate: "Sharjah",
    aliases: ["majaz waterfront", "sharjah corniche"],
    center: [25.3290, 55.3820],
    zoom: 15,
  },
  {
    id: "abu-dhabi-corniche",
    name: "Abu Dhabi Corniche",
    name_ar: "كورنيش أبوظبي",
    emirate: "Abu Dhabi",
    aliases: ["corniche", "abu dhabi city"],
    center: [24.4750, 54.3300],
    zoom: 14,
  },
];

/* -----------------------------------------------------------------------------
   AREA_GROUPS — the full UAE neighbourhood gazetteer (all 7 emirates).
   Every name here becomes searchable. Names have no stored coordinates: when
   searched, the app geocodes them live (OpenStreetMap) and caches the result,
   using each group's `center` (its city/emirate centre) as an instant fallback.
   `near` is the city appended to the geocode query for accuracy.
   Heavily-numbered series (Mussafah M1–M46, Al Warqa 1–5, Industrial Areas
   1–18, Al Nuaimiya 1/2/3 …) are listed by their base name — searching the
   base name still finds them. Add more names to any list freely.
--------------------------------------------------------------------------- */
const AREA_GROUPS = [
  // ===== ABU DHABI =====
  { emirate: "Abu Dhabi", near: "Abu Dhabi", center: [24.4539, 54.3773], names: [
    "Al Khalidiyah","Al Bateen","Corniche","Al Markaziyah","Al Zahiyah","Tourist Club",
    "Al Danah","Madinat Zayed","Al Mushrif","Al Karamah","Al Nahyan","Al Muroor",
    "Al Wahda","Al Manaseer","Al Rawdah" ] },
  { emirate: "Abu Dhabi", near: "Abu Dhabi", center: [24.3620, 54.5230], names: [
    "Mussafah","Shabiya","Mohammed Bin Zayed City","Khalifa City","Shakhbout City",
    "Al Shamkha","Al Falah","Baniyas","Bani Yas East","Al Wathba","Al Reef","Al Raha",
    "Al Bahia","Al Rahba","Al Shahama","Ghantoot","Zayed City" ] },
  { emirate: "Abu Dhabi", near: "Abu Dhabi", center: [24.4900, 54.4020], names: [
    "Yas Island","Saadiyat Island","Reem Island","Al Maryah Island","Lulu Island","Hudayriyat Island" ] },
  { emirate: "Abu Dhabi", near: "Al Ain", center: [24.2075, 55.7447], names: [
    "Al Jimi","Al Muwaiji","Al Towayya","Al Hili","Al Mutaredh","Al Sarooj","Zakher",
    "Al Yahar","Al Khabisi","Falaj Hazzaa","Al Qattara","Al Foah","Al Sanaiya",
    "Al Masoudi","Al Maqam" ] },
  { emirate: "Abu Dhabi", near: "Al Dhafra", center: [23.6560, 53.7000], names: [
    "Madinat Zayed (Al Dhafra)","Ruwais","Ghayathi","Liwa","Mirfa","Sila","Delma Island","Habshan" ] },

  // ===== DUBAI =====
  { emirate: "Dubai", near: "Dubai", center: [25.2710, 55.3140], names: [
    "Al Rigga","Al Muraqqabat","Naif","Al Sabkha","Al Ras","Hor Al Anz","Abu Hail",
    "Al Mamzar","Al Nahda 1","Al Qusais","Al Qusais Industrial","Muhaisnah","Sonapur",
    "Al Twar","Al Khawaneej" ] },
  { emirate: "Dubai", near: "Dubai", center: [25.2200, 55.4000], names: [
    "Mirdif","Al Warqa","Nad Al Hamar","Al Rashidiya","Umm Ramool","Al Garhoud",
    "Dubai Festival City","Al Jaddaf","Ras Al Khor","International City","Warsan",
    "Silicon Oasis","Academic City","Nad Al Sheba","Meydan" ] },
  { emirate: "Dubai", near: "Dubai", center: [25.2280, 55.2900], names: [
    "Karama","Mankhool","Al Fahidi","Oud Metha","Al Jafiliya","Al Satwa","Zabeel",
    "Trade Centre","Business Bay","Downtown Dubai","DIFC","Al Wasl","Al Safa" ] },
  { emirate: "Dubai", near: "Dubai", center: [25.1130, 55.1960], names: [
    "Jumeirah 1","Jumeirah 2","Jumeirah 3","Umm Suqeim","Al Sufouh","Palm Jumeirah",
    "Dubai Marina","JBR","JLT","Media City","Internet City","Knowledge Park",
    "Barsha Heights","Al Barsha 2","Al Barsha 3","Al Quoz" ] },
  { emirate: "Dubai", near: "Dubai", center: [25.0500, 55.2100], names: [
    "JVC","JVT","Motor City","Sports City","Arabian Ranches","Dubailand","Mudon",
    "Remraam","Damac Hills","Town Square","Discovery Gardens","Al Furjan","Jebel Ali",
    "DIP","Dubai South","Expo City","The Springs","The Meadows","The Lakes","Emirates Hills" ] },
  { emirate: "Dubai", near: "Dubai", center: [24.7990, 56.1180], names: [
    "Hatta","Margham","Al Lisaili" ] },

  // ===== SHARJAH =====
  { emirate: "Sharjah", near: "Sharjah", center: [25.3463, 55.4209], names: [
    "Al Nahda Sharjah","Al Taawun","Al Khan","Al Majaz 1","Al Majaz 2","Al Majaz 3",
    "Al Qasimia","Rolla","Al Ghuwair","Al Shuwaiheen","Al Layyah","Abu Shagara","Al Nud",
    "Al Qulayaa","Al Butina","Al Nabba","Halwan","Samnan","Al Azra","Al Ramtha","Al Yarmook",
    "Maysaloon","Muweilah","University City","Al Rahmaniya","Al Zahia","Al Suyoh","Al Tai",
    "Tilal City","Sharjah Industrial Area","Al Sajaa","Al Riqqa" ] },
  { emirate: "Sharjah", near: "Sharjah", center: [25.3350, 56.3420], names: [
    "Khor Fakkan","Kalba","Dibba Al Hisn","Al Dhaid","Mleiha","Al Badayer","Al Hamriyah",
    "Al Madam","Al Bataeh" ] },

  // ===== AJMAN =====
  { emirate: "Ajman", near: "Ajman", center: [25.4052, 55.5136], names: [
    "Al Nuaimiya","Al Rashidiya","Al Rumailah","Al Jurf","Al Mowaihat","Al Hamidiyah",
    "Al Bustan","Al Sawan","Al Zahra","Al Rawda","Ajman Corniche","Ajman Downtown",
    "Al Tallah","Musheirif","Al Helio","Al Nakhil","Ajman Industrial","Manama","Masfout" ] },

  // ===== UMM AL QUWAIN =====
  { emirate: "Umm Al Quwain", near: "Umm Al Quwain", center: [25.5647, 55.5551], names: [
    "UAQ Old Town","Al Salamah","Al Raas","Al Haditha","Al Maidan","Al Dar Al Baida",
    "Al Riqqah","Al Humrah","Al Salam City","Emirates Modern Industrial Area","UAQ Marina",
    "Falaj Al Mualla" ] },

  // ===== RAS AL KHAIMAH =====
  { emirate: "Ras Al Khaimah", near: "Ras Al Khaimah", center: [25.7895, 55.9432], names: [
    "Al Nakheel","Al Dhait North","Al Dhait South","Al Mairid","Al Uraibi","Al Qusaidat",
    "Khuzam","Al Seer","Julphar","Al Hamra","Al Jazirah Al Hamra","Mina Al Arab",
    "Al Marjan Island","Al Rams","Sha'am","Digdaga","Khatt","Al Ghail","Al Hamraniyah",
    "RAK Industrial" ] },

  // ===== FUJAIRAH =====
  { emirate: "Fujairah", near: "Fujairah", center: [25.1288, 56.3265], names: [
    "Fujairah City","Al Faseel","Merashid","Sakamkam","Al Gurfa","Madhab","Mirbah",
    "Murbah","Qidfa","Al Bidyah","Sharm","Al Hayl","Al Taween","Dibba Al Fujairah","Masafi" ] },
];

/* -----------------------------------------------------------------------------
   RECHARGE_POINTS — the machines / kiosks (the main thing this map shows).
   NOTE: sample coordinates are approximate, for demonstration. Replace with
   the exact right-click coordinates from Google Maps for production.
--------------------------------------------------------------------------- */
const RECHARGE_POINTS = [
  /* =========================================================================
     ✅ YOUR REAL MACHINES — verified locations from your 2GIS pins.
     Coordinates are exact. Fill in the real `building` name and adjust
     `services` / `hours` when you have them.
     ======================================================================= */
  {
    id: "mz-dubai",
    name: "Mozon Recharge Machine — Dubai",
    building: "",                      // ← add the exact building name
    area: "dubai",
    coords: [25.214783, 55.244462],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "24 hours",
    around: "Verified location pinned from your 2GIS link.",
    placement: "Residential building",
    verified: true,
  },
  {
    id: "mz-sharjah",
    name: "Mozon Recharge Machine — Sharjah",
    building: "",
    area: "sharjah",
    coords: [25.349027, 55.388262],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "24 hours",
    around: "Verified location pinned from your 2GIS link.",
    placement: "Residential building",
    verified: true,
  },
  {
    id: "mz-ajman",
    name: "Mozon Recharge Machine — Ajman",
    building: "",
    area: "ajman",
    coords: [25.394955, 55.454225],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "24 hours",
    around: "Verified location pinned from your 2GIS link.",
    placement: "Residential building",
    verified: true,
  },
  {
    id: "mz-abu-dhabi",
    name: "Mozon Recharge Machine — Abu Dhabi",
    building: "",
    area: "abu-dhabi",
    coords: [24.459227, 54.381018],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "24 hours",
    around: "Verified location pinned from your 2GIS link.",
    placement: "Residential building",
    verified: true,
  },
  {
    id: "mz-rak",
    name: "Mozon Recharge Machine — Ras Al Khaimah",
    building: "",
    area: "ras-al-khaimah",
    coords: [25.747238, 55.927540],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "24 hours",
    around: "Verified location pinned from your 2GIS link.",
    placement: "Residential building",
    verified: true,
  },
  {
    id: "mz-fujairah",
    name: "Mozon Recharge Machine — Fujairah",
    building: "",
    area: "fujairah",
    coords: [25.121969, 56.347127],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "24 hours",
    around: "Verified location pinned from your 2GIS link.",
    placement: "Residential building",
    verified: true,
  },

  /* =========================================================================
     SAMPLE / DEMO MACHINES — RESIDENTIAL BUILDINGS ONLY (in front of / inside).
     Safe to delete once your real list grows. Every entry here sits at a
     residential building, matching the machines you deploy.
     ======================================================================= */
  {
    id: "rp-101", name: "Tower A Lobby Recharge", building: "Al Nahda 2 Residential Tower A",
    area: "Al Nahda 2", coords: [25.2951, 55.3612],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"], hours: "24 hours",
    placement: "Inside residential building", type: "residential",
    around: "Ground-floor lobby of the residential tower, facing Al Nahda Pond Park.",
  },
  {
    id: "rp-102", name: "Tower B Entrance Kiosk", building: "Al Nahda 2 Residential Tower B",
    area: "Al Nahda 2", coords: [25.2938, 55.3624],
    services: ["du", "Etisalat", "Botim", "Google Play"], hours: "24 hours",
    placement: "In front of residential building", type: "residential",
    around: "At the main entrance of the residential building, next to the lifts.",
  },
  {
    id: "rp-103", name: "Pearl Residence Recharge", building: "Al Nahda Pearl Residence",
    area: "Al Nahda 2", coords: [25.2960, 55.3658],
    services: ["du", "Etisalat", "iTunes", "PUBG UC"], hours: "24 hours",
    placement: "Inside residential building", type: "residential",
    around: "Residential building lobby; pharmacy and clinic in the same tower.",
  },
  {
    id: "rp-104", name: "Sunrise Residence Kiosk", building: "Sunrise Residential Building",
    area: "Al Nahda 2", coords: [25.2919, 55.3705],
    services: ["du", "Etisalat", "Botim", "Google Play"], hours: "24 hours",
    placement: "In front of residential building", type: "residential",
    around: "Outside the residential building entrance, beside the cafeteria.",
  },
  {
    id: "rp-105", name: "Sky Tower Lobby Point", building: "Al Nahda Sky Tower",
    area: "Al Nahda 2", coords: [25.2972, 55.3599],
    services: ["du", "Etisalat", "iTunes", "Nol"], hours: "24 hours",
    placement: "Inside residential building", type: "residential",
    around: "Residential tower lobby near the south gate of the park.",
  },
  {
    id: "rp-106", name: "Muraqqabat Residence Recharge", building: "Al Muraqqabat Residential Building",
    area: "Deira", coords: [25.2662, 55.3231],
    services: ["du", "Etisalat", "iTunes", "Google Play"], hours: "24 hours",
    placement: "In front of residential building", type: "residential",
    around: "At the residential building entrance on Al Muraqqabat Road.",
  },
  {
    id: "rp-107", name: "Abu Hail Family Tower Kiosk", building: "Abu Hail Residential Tower",
    area: "Deira", coords: [25.2820, 55.3360],
    services: ["du", "Etisalat", "Botim"], hours: "24 hours",
    placement: "Inside residential building", type: "residential",
    around: "Residential tower ground floor near the family park.",
  },
  {
    id: "rp-108", name: "Karama Block Recharge", building: "Karama Residential Block 12",
    area: "Karama", coords: [25.2472, 55.3045],
    services: ["du", "Etisalat", "Botim", "DEWA"], hours: "24 hours",
    placement: "Inside residential building", type: "residential",
    around: "Inside the residential block entrance, opposite Karama Park.",
  },
  {
    id: "rp-109", name: "Mankhool Residence Kiosk", building: "Mankhool Residential Building",
    area: "Bur Dubai", coords: [25.2540, 55.2930],
    services: ["du", "Etisalat", "iTunes"], hours: "24 hours",
    placement: "In front of residential building", type: "residential",
    around: "In front of the residential building, near the grocery.",
  },
  {
    id: "rp-110", name: "Barsha Residence Point", building: "Al Barsha Residential Building",
    area: "Al Barsha 1", coords: [25.1109, 55.1978],
    services: ["du", "Etisalat", "iTunes", "Botim"], hours: "24 hours",
    placement: "In front of residential building", type: "residential",
    around: "At the residential building entrance near Sharaf DG metro.",
  },
  {
    id: "rp-111", name: "Taawun Tower Lobby Kiosk", building: "Al Taawun Residential Tower",
    area: "Al Taawun", coords: [25.3312, 55.3826],
    services: ["du", "Etisalat", "Botim", "iTunes"], hours: "24 hours",
    placement: "Inside residential building", type: "residential",
    around: "Residential tower lobby near Al Taawun corniche.",
  },
  {
    id: "rp-112", name: "Ajman Corniche Residence Kiosk", building: "Ajman Corniche Residential Tower",
    area: "Ajman Corniche", coords: [25.4118, 55.4372],
    services: ["du", "Etisalat", "iTunes", "Cash Out"], hours: "24 hours",
    placement: "In front of residential building", type: "residential",
    around: "Outside the residential tower facing the Ajman corniche.",
  },
];

/* -----------------------------------------------------------------------------
   PLACES — surrounding buildings / commercial landmarks shown for context
   (hotels, hospitals, malls, restaurants, supermarkets, parks).
   category: hotel | hospital | mall | restaurant | supermarket | park | landmark
--------------------------------------------------------------------------- */
const PLACES = [
  // Al Nahda 2 surroundings
  { name: "Al Nahda Pond Park", name_ar: "حديقة بحيرة النهدة", area: "al-nahda-2", category: "park",       coords: [25.2934, 55.3663] },
  { name: "Zulekha Hospital Dubai", area: "al-nahda-2", category: "hospital",   coords: [25.2968, 55.3641] },
  { name: "NMC Specialty Hospital Al Nahda", area: "al-nahda-2", category: "hospital", coords: [25.2921, 55.3708] },
  { name: "Al Nahda Metro Station (Green Line)", area: "al-nahda-2", category: "landmark", coords: [25.2896, 55.3672] },
  { name: "Grand Excelsior Hotel Al Nahda", area: "al-nahda-2", category: "hotel", coords: [25.2957, 55.3701] },
  { name: "Karachi Darbar Restaurant", area: "al-nahda-2", category: "restaurant", coords: [25.2955, 55.3620] },
  { name: "China Town Restaurant", area: "al-nahda-2", category: "restaurant", coords: [25.2941, 55.3631] },
  { name: "Union Coop Al Nahda", area: "al-nahda-2", category: "supermarket", coords: [25.2948, 55.3689] },

  // Al Nahda Sharjah surroundings
  { name: "Sahara Centre", area: "al-nahda-sharjah", category: "mall", coords: [25.3245, 55.3912] },
  { name: "Ansar Mall", area: "al-nahda-sharjah", category: "mall", coords: [25.3199, 55.3846] },
  { name: "Sahara Tower Residences", area: "al-nahda-sharjah", category: "landmark", coords: [25.3226, 55.3898] },

  // Deira
  { name: "Al Ghurair Centre", area: "deira", category: "mall", coords: [25.2716, 55.3182] },
  { name: "Hyatt Regency Dubai", area: "deira", category: "hotel", coords: [25.2820, 55.3120] },
  { name: "Gold Souk", area: "deira", category: "landmark", coords: [25.2716, 55.2975] },

  // Bur Dubai
  { name: "Al Fahidi Historical District", area: "bur-dubai", category: "landmark", coords: [25.2635, 55.2995] },
  { name: "BurJuman Mall", area: "bur-dubai", category: "mall", coords: [25.2545, 55.3030] },

  // Al Barsha
  { name: "Mall of the Emirates", area: "al-barsha", category: "mall", coords: [25.1181, 55.2003] },
  { name: "Kempinski Hotel MOE", area: "al-barsha", category: "hotel", coords: [25.1176, 55.1993] },

  // Al Majaz
  { name: "Al Majaz Waterfront", area: "al-majaz", category: "landmark", coords: [25.3268, 55.3789] },
  { name: "Al Noor Island", area: "al-majaz", category: "park", coords: [25.3300, 55.3860] },

  // Abu Dhabi
  { name: "Nation Towers", area: "abu-dhabi-corniche", category: "landmark", coords: [24.4758, 54.3325] },
  { name: "Corniche Beach", area: "abu-dhabi-corniche", category: "park", coords: [24.4720, 54.3260] },
];

/* Icons for the surrounding-place categories. */
const CATEGORY_META = {
  hotel:       { e: "🏨", label: "Hotel" },
  hospital:    { e: "🏥", label: "Hospital" },
  mall:        { e: "🛍️", label: "Mall" },
  restaurant:  { e: "🍽️", label: "Restaurant" },
  supermarket: { e: "🛒", label: "Supermarket" },
  park:        { e: "🌳", label: "Park" },
  landmark:    { e: "📍", label: "Landmark" },
};
