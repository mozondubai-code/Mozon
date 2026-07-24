/* =============================================================================
   MOZON GIS — UAE Recharge Map  ·  DATA FILE
   ============================================================================= */

/* -----------------------------------------------------------------------------
   ⭐ LIVE GOOGLE SHEET — load thousands of machines without touching code.
   -----------------------------------------------------------------------------
   1. Put your machines in a Google Sheet with these column headers (row 1):
        name | building | area | emirate | lat | lng | services | hours | around | verified
      - lat / lng : decimal numbers (from Google Maps / your export)
      - services  : separated by ; or ,   e.g.  du; Etisalat; iTunes; Botim
      - verified  : yes/true to show the gold ✓ marker (optional, leave blank)
      - building / area / hours / around : optional text
   2. In the Sheet:  File → Share → Publish to web → (pick the sheet) →
      choose "Comma-separated values (.csv)" → Publish → copy the link.
   3. Paste that link between the quotes below, save, reload the page.

   Leave it "" to use the bundled sample data instead.
--------------------------------------------------------------------------- */
const CONFIG = {
  SHEET_CSV_URL: "",
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
    verified: true,
  },

  /* =========================================================================
     SAMPLE / DEMO MACHINES below — safe to delete once your real list grows.
     ======================================================================= */
  // ---- AL NAHDA 2 (Dubai) --------------------------------------------------
  {
    id: "rp-101",
    name: "Al Nahda Star Grocery",
    building: "Al Nahda 2 Residential Tower A",
    area: "al-nahda-2",
    coords: [25.2951, 55.3612],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim"],
    hours: "8:00 AM – 1:00 AM",
    around: "Ground floor, facing Al Nahda Pond Park. Next to a laundry and a pharmacy.",
  },
  {
    id: "rp-102",
    name: "Quick Recharge Kiosk",
    building: "Union Coop Al Nahda",
    area: "al-nahda-2",
    coords: [25.2948, 55.3689],
    services: ["du", "Etisalat", "Salik", "Nol", "DEWA"],
    hours: "8:00 AM – 12:00 AM",
    around: "Just inside the Union Coop main entrance, beside the customer service desk.",
  },
  {
    id: "rp-103",
    name: "City Mart Supermarket",
    building: "Zulekha Plaza",
    area: "al-nahda-2",
    coords: [25.2965, 55.3638],
    services: ["du", "Etisalat", "Botim", "PUBG UC", "iTunes"],
    hours: "24 hours",
    around: "Opposite Zulekha Hospital, on the corner. Bus stop and taxi stand outside.",
  },
  {
    id: "rp-104",
    name: "Smart Pay Center",
    building: "Al Nahda Plaza",
    area: "al-nahda-2",
    coords: [25.2933, 55.3667],
    services: ["du", "Etisalat", "Salik", "Nol", "Cash Out", "DEWA"],
    hours: "9:00 AM – 11:00 PM",
    around: "Near Al Nahda Metro Station (Green Line). Money exchange and mobile shops nearby.",
  },
  {
    id: "rp-105",
    name: "Baqala Al Reef",
    building: "Sunrise Building",
    area: "al-nahda-2",
    coords: [25.2919, 55.3705],
    services: ["du", "Etisalat", "Botim", "Google Play"],
    hours: "7:00 AM – 2:00 AM",
    around: "Beside NMC Specialty Hospital Al Nahda. Cafeteria and salon in the same building.",
  },
  {
    id: "rp-106",
    name: "West Zone Fresh Kiosk",
    building: "Al Nahda 2 Tower C",
    area: "al-nahda-2",
    coords: [25.2972, 55.3599],
    services: ["du", "Etisalat", "iTunes", "Nol"],
    hours: "8:00 AM – 12:00 AM",
    around: "Residential cluster near the park's south gate. School and nursery across the road.",
  },

  // ---- AL NAHDA (Sharjah side) --------------------------------------------
  {
    id: "rp-201",
    name: "Digital Top-up Point",
    building: "Sahara Centre",
    area: "al-nahda-sharjah",
    coords: [25.3245, 55.3912],
    services: ["du", "Etisalat", "iTunes", "Google Play", "PUBG UC"],
    hours: "10:00 AM – 12:00 AM",
    around: "Food court level, near the cinema entrance in Sahara Centre.",
  },
  {
    id: "rp-202",
    name: "Ansar Recharge Desk",
    building: "Ansar Mall",
    area: "al-nahda-sharjah",
    coords: [25.3199, 55.3846],
    services: ["du", "Etisalat", "Botim", "Cash Out"],
    hours: "10:00 AM – 11:00 PM",
    around: "Ground floor kiosk row, opposite the electronics section.",
  },

  // ---- DEIRA ---------------------------------------------------------------
  {
    id: "rp-301",
    name: "Al Rigga Mobile Center",
    building: "Al Rigga Business Tower",
    area: "deira",
    coords: [25.2685, 55.3205],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Botim", "PUBG UC"],
    hours: "9:00 AM – 1:00 AM",
    around: "On Al Rigga Road, dense with restaurants and mobile shops. Metro exit nearby.",
  },
  {
    id: "rp-302",
    name: "Naif Grocery & Recharge",
    building: "Naif Souq Building",
    area: "deira",
    coords: [25.2735, 55.3078],
    services: ["du", "Etisalat", "Cash Out"],
    hours: "8:00 AM – 12:00 AM",
    around: "Inside Naif area, close to the textile souq and money exchanges.",
  },

  // ---- BUR DUBAI -----------------------------------------------------------
  {
    id: "rp-401",
    name: "Meena Bazaar Recharge",
    building: "Al Fahidi Shopping Complex",
    area: "bur-dubai",
    coords: [25.2588, 55.2975],
    services: ["du", "Etisalat", "iTunes", "Botim"],
    hours: "9:30 AM – 11:00 PM",
    around: "Textile market lanes, next to gold and tailoring shops.",
  },

  // ---- AL BARSHA -----------------------------------------------------------
  {
    id: "rp-501",
    name: "MOE Kiosk Point",
    building: "Mall of the Emirates",
    area: "al-barsha",
    coords: [25.1181, 55.2003],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Nol"],
    hours: "10:00 AM – 12:00 AM",
    around: "Metro-link level near the carpark travelator, beside the pharmacy.",
  },

  // ---- SHARJAH AL MAJAZ ----------------------------------------------------
  {
    id: "rp-601",
    name: "Majaz Corniche Kiosk",
    building: "Al Majaz Waterfront",
    area: "al-majaz",
    coords: [25.3268, 55.3789],
    services: ["du", "Etisalat", "Botim", "iTunes"],
    hours: "10:00 AM – 1:00 AM",
    around: "Promenade cafés and the musical fountain area.",
  },

  // ---- ABU DHABI -----------------------------------------------------------
  {
    id: "rp-701",
    name: "Corniche Recharge Stand",
    building: "Nation Towers",
    area: "abu-dhabi-corniche",
    coords: [24.4758, 54.3325],
    services: ["du", "Etisalat", "iTunes", "DEWA", "Cash Out"],
    hours: "9:00 AM – 11:00 PM",
    around: "Seafront near the beach entrance, food outlets on the podium level.",
  },

  // ---- MORE SAMPLE KIOSKS (spread across popular areas) --------------------
  {
    id: "rp-107", name: "Fresh Corner Recharge", building: "Al Nahda 2 Tower B",
    area: "al-nahda-2", coords: [25.2938, 55.3624],
    services: ["du", "Etisalat", "Botim", "Google Play"], hours: "24 hours",
    around: "Cafeteria block near the park's east gate; barber and laundry next door.",
  },
  {
    id: "rp-108", name: "Pond View Grocery", building: "Al Nahda Pearl Building",
    area: "al-nahda-2", coords: [25.2960, 55.3658],
    services: ["du", "Etisalat", "iTunes", "PUBG UC"], hours: "7:00 AM – 1:00 AM",
    around: "Facing Al Nahda Pond Park; pharmacy and clinic in the same tower.",
  },
  {
    id: "rp-303", name: "Rigga Express Top-up", building: "Al Muraqqabat Plaza",
    area: "deira", coords: [25.2662, 55.3231],
    services: ["du", "Etisalat", "iTunes", "Google Play", "Cash Out"], hours: "24 hours",
    around: "Busy restaurant strip on Al Muraqqabat Road; metro exit two minutes away.",
  },
  {
    id: "rp-402", name: "Karama Quick Pay", building: "Karama Shopping Complex",
    area: "bur-dubai", coords: [25.2472, 55.3045],
    services: ["du", "Etisalat", "Botim", "Nol", "DEWA"], hours: "9:00 AM – 12:00 AM",
    around: "Opposite Karama Park; cafeterias and mobile shops all around.",
  },
  {
    id: "rp-502", name: "Barsha Mart Kiosk", building: "Al Barsha Business Point",
    area: "al-barsha", coords: [25.1109, 55.1978],
    services: ["du", "Etisalat", "iTunes", "Botim"], hours: "8:00 AM – 12:00 AM",
    around: "Near Sharaf DG metro; supermarkets and clinics in the cluster.",
  },
  {
    id: "rp-503", name: "JLT Cluster Recharge", building: "JLT Cluster D",
    area: "al-barsha", coords: [25.0685, 55.1440],
    services: ["du", "Etisalat", "iTunes", "Google Play", "PUBG UC"], hours: "24 hours",
    around: "Lakeside retail podium; coffee shops and a supermarket adjacent.",
  },
  {
    id: "rp-203", name: "Taawun Mart Top-up", building: "Al Taawun Mall",
    area: "al-nahda-sharjah", coords: [25.3312, 55.3826],
    services: ["du", "Etisalat", "Botim", "iTunes"], hours: "10:00 AM – 12:00 AM",
    around: "Near Al Taawun bus station and the corniche.",
  },
  {
    id: "rp-204", name: "Ajman Corniche Kiosk", building: "Ajman Corniche Tower",
    area: "ajman", coords: [25.4118, 55.4372],
    services: ["du", "Etisalat", "iTunes", "Cash Out"], hours: "8:00 AM – 1:00 AM",
    around: "Beachfront cafés and the Ajman fish market nearby.",
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
