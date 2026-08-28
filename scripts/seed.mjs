/**
 * Seed generator for the AddisSuq JSON "database".
 *
 *   node scripts/seed.mjs
 *
 * Deterministic: a fixed PRNG seed means every run produces byte-identical
 * files, apart from order/notification timestamps which are anchored to "now"
 * so the vendor dashboards always have a few orders from today.
 *
 * Volumes (per the prototype spec §5):
 *   6 categories, 5 shops (one pending), 104 products, 15 customers,
 *   25 orders covering every status and payment method, ~90 notifications.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

/* ---------------------------------------------------------------- */
/* Deterministic PRNG                                                */
/* ---------------------------------------------------------------- */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260828);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));

const iso = (d) => d.toISOString();
const daysAgoAt = (days, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, between(0, 59), 0);
  return d;
};
const plusMinutes = (isoStr, minutes, seconds = 0) =>
  new Date(new Date(isoStr).getTime() + minutes * 60000 + seconds * 1000);

/* ---------------------------------------------------------------- */
/* Business rules (mirrors lib/rules.ts)                             */
/* ---------------------------------------------------------------- */

const FREE_DELIVERY_THRESHOLD = 2000;
const FEE_BANDS = [
  { maxKm: 3, fee: 40 },
  { maxKm: 5, fee: 60 },
  { maxKm: 7, fee: 90 },
];

function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(h));
  return Math.round(km * 10) / 10;
}

function deliveryFeeFor(distanceKm, fulfilmentType, subtotal) {
  if (fulfilmentType === "pickup") return 0;
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  const band = FEE_BANDS.find((b) => distanceKm <= b.maxKm);
  return band ? band.fee : 130;
}

/* ---------------------------------------------------------------- */
/* Categories                                                        */
/* ---------------------------------------------------------------- */

const categories = [
  { id: "cat_fashion", nameEn: "Fashion & Lifestyle", nameAm: "ፋሽንና ልብስ", icon: "Shirt", accent: "#d86b46" },
  { id: "cat_electronics", nameEn: "Electronics", nameAm: "ኤሌክትሮኒክስ", icon: "Zap", accent: "#4d7c8a" },
  { id: "cat_beauty", nameEn: "Beauty & Personal Care", nameAm: "ውበትና እንክብካቤ", icon: "Sparkles", accent: "#c9573f" },
  { id: "cat_stationery", nameEn: "Stationery & Gifts", nameAm: "የጽሕፈት ዕቃዎች", icon: "Pencil", accent: "#7b8f52" },
  { id: "cat_groceries", nameEn: "Mini-market", nameAm: "ሚኒ ማርኬት", icon: "ShoppingBasket", accent: "#2f7d62" },
  { id: "cat_home", nameEn: "Home & Living", nameAm: "ቤትና እቃ", icon: "Home", accent: "#b0714c" },
];

/* ---------------------------------------------------------------- */
/* Shops                                                             */
/* ---------------------------------------------------------------- */

const shops = [
  {
    id: "shop_01",
    name: "Zema Boutique",
    nameAm: "ዜማ ቦቲክ",
    ownerName: "Hanna Girma",
    phone: "+251911234567",
    email: "hanna@zemaboutique.et",
    subCity: "Bole",
    address: "Bole Medhanialem, next to Brass Hospital, Addis Ababa",
    lat: 9.01,
    lng: 38.795,
    category: "cat_fashion",
    tradingHours: { open: "08:30", close: "20:00", days: "Mon – Sat" },
    status: "approved",
    tagline: "Handwoven Ethiopian textiles and modern everyday wear.",
    tradeLicenceNo: "TL-2016-08821",
    tinNumber: "0012458796",
    documents: { tradeLicence: true, tinCertificate: true },
    deliveryRadiusKm: 7,
    offersDelivery: true,
    offersPickup: true,
    createdAt: iso(daysAgoAt(220, 9, 15)),
    reviewedAt: iso(daysAgoAt(217, 11, 5)),
    reviewedBy: "admin",
    rejectionReason: null,
  },
  {
    id: "shop_02",
    name: "Kera Electronics",
    nameAm: "ቄራ ኤሌክትሮኒክስ",
    ownerName: "Dawit Kebede",
    phone: "+251911345678",
    email: "dawit@keraelectronics.et",
    subCity: "Kirkos",
    address: "Kazanchis, behind UNECA, Meshu Building 1st floor",
    lat: 8.983,
    lng: 38.765,
    category: "cat_electronics",
    tradingHours: { open: "08:30", close: "19:30", days: "Mon – Sat" },
    status: "approved",
    tagline: "Phones, accessories and small electronics with a real warranty.",
    tradeLicenceNo: "TL-2016-09114",
    tinNumber: "0025874120",
    documents: { tradeLicence: true, tinCertificate: true },
    deliveryRadiusKm: 6,
    offersDelivery: true,
    offersPickup: true,
    createdAt: iso(daysAgoAt(205, 10, 0)),
    reviewedAt: iso(daysAgoAt(203, 14, 30)),
    reviewedBy: "admin",
    rejectionReason: null,
  },
  {
    id: "shop_03",
    name: "Liya Beauty Corner",
    nameAm: "ልያ ውበት ማዕከል",
    ownerName: "Selam Tadesse",
    phone: "+251911456789",
    email: "selam@liyabeauty.et",
    subCity: "Arada",
    address: "Piassa, Taitu Hotel street, Amber Building shop 4",
    lat: 9.04,
    lng: 38.753,
    category: "cat_beauty",
    tradingHours: { open: "09:00", close: "19:00", days: "Mon – Sat" },
    status: "approved",
    tagline: "Skincare, haircare and cosmetics from brands Addis trusts.",
    tradeLicenceNo: "TL-2017-10032",
    tinNumber: "0036985214",
    documents: { tradeLicence: true, tinCertificate: true },
    deliveryRadiusKm: 5,
    offersDelivery: true,
    offersPickup: true,
    createdAt: iso(daysAgoAt(190, 9, 45)),
    reviewedAt: iso(daysAgoAt(188, 10, 10)),
    reviewedBy: "admin",
    rejectionReason: null,
  },
  {
    id: "shop_04",
    name: "Addis Paper & Pen",
    nameAm: "አዲስ ወረቀትና ብዕር",
    ownerName: "Yonatan Alemu",
    phone: "+251911567890",
    email: "yonatan@addispaper.et",
    subCity: "Yeka",
    address: "Megenagna, Dhaka roundabout, Getu Commercial 3rd floor",
    lat: 9.03,
    lng: 38.8,
    category: "cat_stationery",
    tradingHours: { open: "08:00", close: "18:30", days: "Mon – Sat" },
    status: "approved",
    tagline: "Everything for school and office — from pens to printers' paper.",
    tradeLicenceNo: "TL-2017-10770",
    tinNumber: "0047852369",
    documents: { tradeLicence: true, tinCertificate: true },
    deliveryRadiusKm: 7,
    offersDelivery: true,
    offersPickup: true,
    createdAt: iso(daysAgoAt(175, 11, 20)),
    reviewedAt: iso(daysAgoAt(173, 9, 55)),
    reviewedBy: "admin",
    rejectionReason: null,
  },
  {
    id: "shop_05",
    name: "Mimi Mini-Market",
    nameAm: "ሚሚ ሚኒ ማርኬት",
    ownerName: "Mekdes Haile",
    phone: "+251911678901",
    email: "mekdes@mimimarket.et",
    subCity: "Nifas Silk-Lafto",
    address: "Sar Bet, Abinet road, opposite St. Paul pharmacy",
    lat: 8.975,
    lng: 38.755,
    category: "cat_groceries",
    tradingHours: { open: "07:30", close: "21:00", days: "Mon – Sun" },
    status: "pending",
    tagline: "Fresh and packaged groceries for the neighbourhood.",
    tradeLicenceNo: "TL-2018-11245",
    tinNumber: "0058941725",
    documents: { tradeLicence: true, tinCertificate: false },
    deliveryRadiusKm: 4,
    offersDelivery: true,
    offersPickup: true,
    createdAt: iso(daysAgoAt(5, 13, 40)),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  },
];

for (const s of shops) {
  s.logoUrl = `/api/art/logo/${s.id}?c=${s.category}`;
  s.coverUrl = `/api/art/shop/${s.id}?c=${s.category}`;
}

/* ---------------------------------------------------------------- */
/* Products                                                          */
/* ---------------------------------------------------------------- */

// [nameEn, nameAm, price, compareAt|null, unit, qty, flags]
// flags: "o" = out of stock (auto-hide demo), "u" = unpublished
const catalogues = {
  shop_01: [
    ["Habesha kemis — modern cut", "ዘመናዊ የሐበሻ ቀሚስ", 4800, 5600, "each", 14],
    ["Handwoven cotton netela", "የእጅ ተሰራ ጥምብ ነጠላ", 1450, 1800, "each", 26],
    ["Shemma cotton scarf", "የሸማ ጥምብ ሻል", 850, null, "each", 40],
    ["Men's gabbi wrap", "የወንድ ጋቢ", 1900, null, "each", 18],
    ["Linen blend shirt", "የበፍታ ቅልቅል ሸሚዝ", 1250, 1500, "each", 30],
    ["Tilet embroidered scarf", "ጥለት ያለው ሻል", 990, null, "each", 22],
    ["Leather handbag", "የቆዳ እጅ ቦርሳ", 2600, 3100, "each", 9],
    ["Suede desert boots", "የስዊድ ዲዛርቦት ጫማ", 2200, null, "pair", 11],
    ["Traditional kaba jacket", "ባህላዊ ካባ", 5600, 6400, "each", 6],
    ["Silk-touch evening dress", "የሐረግ ድንቅ የምሽት ቀሚስ", 3850, null, "each", 7],
    ["Men's two-piece suit", "የወንድ የኹለት ክፍል ሱት", 7200, 8500, "set", 4],
    ["Leather strap wristwatch", "የቆዳ ገመድ ያለው የእጅ ሰዓት", 1750, 2100, "each", 15],
    ["Beaded jewellery set", "የዶቄት ጌጣጌጥ ስብስብ", 780, null, "set", 0],
    ["Silver earrings", "የብር ጉላድ ጌጣጌጥ", 650, null, "pair", 20],
    ["Women's cotton blouse", "የሴቶች ጥምብ ሸሚዝ", 1150, 1400, "each", 24],
    ["Men's selate trousers", "የወንድ ሰላጤ ሱሪ", 1600, null, "each", 16],
    ["Kids' habesha dress", "የልጆች ሐበሻ ቀሚስ", 2200, null, "each", 12],
    ["Woven cotton throw", "የእጅ ተሰራ ጥምብ ሽፋን", 2400, null, "each", 8],
    ["Leather belt", "የቆዳ ቀበቶ", 680, null, "each", 28],
    ["Weekend canvas tote", "የጨርቅ ቦርሳ", 620, null, "each", 0],
    ["Embroidered table runner", "ጥለት ያለው የጠረጴዛ ሽፋን", 1250, null, "each", 10],
    ["Jebena & finjal coffee set", "ጀበናና ፊንጃል የቡና ስብስብ", 3200, 3600, "set", 5],
  ],
  shop_02: [
    ["Wireless earbuds (ANC)", "የሽቦ አልባ የጆሮ ማዳመጫ", 2400, 2800, "pair", 17],
    ["Power bank 20,000 mAh", "ባትሪ ባንክ 20,000 mAh", 2600, 3100, "each", 9],
    ["Fast charger 33W (USB-C)", "ፈጣን ቻርጀር 33W", 950, null, "each", 25],
    ["Braided USB-C cable", "የተሸፈነ USB-C ኬብል", 380, null, "each", 48],
    ["LED bulb 12W (pack of 2)", "LED መብራት 12W (2 ጥቅል)", 560, null, "pack", 34],
    ["Extension socket 4-way", "የኤሌክትሪክ ሶኬት 4 ቦታ", 780, null, "each", 19],
    ["Bluetooth party speaker", "ብሉቱዝ ስፒከር", 3400, 3900, "each", 7],
    ["Smartwatch (fitness band)", "ስማርት ወይት", 2900, null, "each", 10],
    ["Phone holder (dashboard)", "የስልክ ተንጠልጣይ መያዣ", 420, null, "each", 31],
    ["Rechargeable desk fan", "ተመላ የጠረጴዛ ፋን", 1850, 2100, "each", 12],
    ["Portable FM radio", "ተንቀሳቃሽ ሬዲዮ", 1200, null, "each", 14],
    ["Scientific calculator", "ሳይንሳዊ ካልኩሌተር", 980, null, "each", 22],
    ["Cordless hair clipper", "የሽቦ አልባ የጸጉር መክሰሻ", 2100, 2450, "each", 8],
    ["Karaoke microphone", "የካራኦኬ ማይክሮፎን", 1550, null, "each", 9],
    ["Flash drive 64GB", "ፍላሽ ዲስክ 64GB", 850, null, "each", 0],
    ["WiFi router (dual band)", "ዋይፋይ ሮውተር", 4200, 4700, "each", 5],
    ["Tempered screen protector", "የስልክ ስክሪን ጋርድ", 250, null, "each", 60],
    ["AA batteries (pack of 4)", "የAA ባትሪ (4 ጥቅል)", 180, null, "pack", 45],
    ["Aluminium laptop stand", "የአሉሚኒየም ላፕቶፕ መቆሚያ", 1450, null, "each", 6],
    ["Mini tripod (phone)", "ሚኒ ትሪፖድ", 620, null, "each", 0],
    ["Electric kettle 1.7L", "የኤሌክትሪክ ውሃ ማሞቂያ 1.7ለ", 2200, null, "each", 13],
    ["Rechargeable torch", "ተመላ የእጅ መብራት", 760, null, "each", 23],
  ],
  shop_03: [
    ["Raw shea butter 250g", "ጥሬ ሺማ ቅቤ 250ግ", 680, null, "jar", 30],
    ["Traditional black soap", "ባህላዊ ጥቁር ሳሙና", 350, null, "each", 44],
    ["Argan hair oil", "የአርጋን የፀጉር ዘይት", 1250, 1450, "bottle", 16],
    ["Aloe body lotion", "የአሎዌ የሰውነት ሎሽን", 720, null, "bottle", 27],
    ["Floral perfume 50ml", "የአበባ መዓዛ ሽቶ 50ሚል", 2300, 2700, "bottle", 8],
    ["Matte lipstick", "ማት ሊፕስቲክ", 550, null, "each", 36],
    ["Nail polish set (6 shades)", "የጥፍር ፖሊሽ ስብስብ (6 ቀለም)", 980, null, "set", 15],
    ["Clay face mask", "የሸክላ ፊሺያል ማስክ", 640, null, "tube", 21],
    ["Gentle shampoo 400ml", "ለስላሳ ሻምፑ 400ሚል", 590, null, "bottle", 29],
    ["Hair conditioner 400ml", "የፀጉር ኮንዲሽነር 400ሚል", 610, null, "bottle", 24],
    ["Petroleum jelly", "ቫዘሊን", 320, null, "jar", 38],
    ["Hand cream", "የእጅ ክሬም", 480, null, "tube", 26],
    ["Roll-on deodorant", "ሮል ኦን ዴዮዶራንት", 540, null, "each", 33],
    ["Waterproof mascara", "ውሃ የማያሳልፍ ማስካራ", 760, null, "each", 18],
    ["Natural-tone foundation", "የተፈጥሮ ቀለም ፉንዴሽን", 1150, 1350, "bottle", 11],
    ["Toothbrush soft (pack of 3)", "ለስላሳ የጥርስ ብሩሽ (3 ጥቅል)", 260, null, "pack", 0],
    ["Mint toothpaste", "የሚንት ጣዕም የጥርስ ማጽጃ", 310, null, "tube", 40],
    ["Hair brush", "የፀጉር ብሩሽ", 520, null, "each", 19],
    ["Facial cleanser gel", "የፊት ማጽጃ ጄል", 690, null, "tube", 17],
    ["Body care gift set", "የሰውነት እንክብካቤ የስጦታ ስብስብ", 1950, 2300, "set", 9],
  ],
  shop_04: [
    ["A4 notebook 160 pages", "A4 ማስታወሻ ደብተር 160 ገጽ", 340, null, "each", 52],
    ["Gel pens (pack of 5)", "ጄል ብዕር (5 ጥቅል)", 220, null, "pack", 47],
    ["Ballpoint pens blue (10)", "ሰማያዊ ቦልፖይንት ብዕር (10)", 180, null, "pack", 60],
    ["HB pencils (12)", "የHB እርሳስ (12)", 150, null, "pack", 55],
    ["Whiteboard markers (4)", "የሰሌዳ ማርከር (4)", 360, null, "pack", 26],
    ["Permanent markers (2)", "ቋሚ ማርከር (2)", 190, null, "pack", 38],
    ["Stapler with pins", "ስቴፕለር ከፒን ጋር", 420, null, "each", 21],
    ["Box file folders (5)", "የፋይል ሳጥን (5)", 550, null, "pack", 24],
    ["A4 envelopes (25)", "የA4 ኤንቬሎፕ (25 ጥቅል)", 280, null, "pack", 0],
    ["Sticky notes (3 pads)", "ስቲኪ ማስታወሻ (3)", 210, null, "set", 41],
    ["Desktop calculator", "የጠረጴዛ ካልኩሌተር", 620, null, "each", 15],
    ["Paper cutter", "የወረቀት መቁረጫ", 380, null, "each", 18],
    ["A4 paper ream 80g", "የA4 ወረቀት ሪም 80ግ", 850, 950, "ream", 33],
    ["Greeting cards (pack of 6)", "የስጦታ ካርድ (6 ጥቅል)", 450, null, "pack", 0],
    ["School backpack", "የትምህርት ቤት ባክፓክ", 1650, 1900, "each", 13],
    ["Geometry instrument set", "የጂኦሜትሪ መሣሪያ ስብስብ", 330, null, "set", 28],
    ["Academic planner 2026", "የ2026 የትምህርት ካለንደር", 480, null, "each", 20],
    ["Pencil sharpener", "እርሳስ መላጫ", 120, null, "each", 65],
    ["Laminating pouches A4 (20)", "ላሚናት ማሸጊያ A4 (20)", 390, null, "pack", 14],
    ["Scratch pad set", "ስካች ፓድ ስብስብ", 160, null, "set", 36],
  ],
  shop_05: [
    ["Wheat flour 5kg", "የስንዴ ዱቄት 5ኪግ", 620, null, "bag", 30],
    ["Sugar 1kg", "ስኳር 1ኪግ", 145, null, "pack", 80],
    ["Cooking oil 1.8L", "የምግብ ዘይት 1.8ለ", 480, null, "bottle", 42],
    ["Rice 1kg", "ሩዝ 1ኪግ", 190, null, "pack", 55],
    ["Pasta 500g", "ማኪናሮኒ 500ግ", 95, null, "pack", 90],
    ["Berbere 250g", "በርበሬ 250ግ", 220, null, "pack", 46],
    ["Shiro powder 500g", "ሺሮ ፓውደር 500ግ", 260, null, "pack", 38],
    ["Yirgacheffe coffee 1kg", "የይርጋጨፌ ቡና 1ኪግ", 980, 1150, "bag", 21],
    ["Tea leaves 250g", "የሻይ ቅጠል 250ግ", 170, null, "pack", 52],
    ["Injera (pack of 10)", "እንጀራ (10 ጥቅል)", 300, null, "pack", 35],
    ["Sliced bread", "ተከፍሎ ዳቦ", 65, null, "loaf", 0],
    ["Milk 1L", "ወተት 1ለ", 85, null, "bottle", 48],
    ["Eggs (tray of 30)", "እንቁላል (30 ጥቅል)", 480, null, "tray", 26],
    ["Raw honey 500g", "ጥሬ ማር 500ግ", 750, null, "jar", 18],
    ["Bottled water (pack of 6)", "ባንቲ ውሃ (6 ጥቅል)", 180, null, "pack", 64],
    ["Mango juice 1L", "የማንጎ ጭማቂ 1ለ", 210, null, "bottle", 39],
    ["Family-pack biscuits", "የቤተሰብ ጥቅል ብስኩት", 160, null, "pack", 57],
    ["Chocolate bar", "ቸኮሌት", 90, null, "each", 0],
    ["Laundry detergent 1kg", "የልብስ አጽጃ ሳሙና 1ኪግ", 340, null, "pack", 44],
    ["Tissue box", "ቲሹ ፓፐር ሳጥን", 195, null, "box", 61],
  ],
};

const descEn = {
  cat_fashion: "Cut and finished in-house from fabric sourced from weavers we know.",
  cat_electronics: "Genuine stock with a 6-month in-shop warranty.",
  cat_beauty: "Original product, batch-checked on arrival.",
  cat_stationery: "Everyday quality for school and office.",
  cat_groceries: "Fresh stock, fair price, packed carefully.",
};
const descAm = {
  cat_fashion: "በስድሳችን የተሰፈ እና ከሚታወቁ ተሸማቾች የተገኘ ጨርቅ።",
  cat_electronics: "ትክክለኛ ዕቃ ከ6 ወር ዋስትና ጋር።",
  cat_beauty: "ቦታዋኛ ዕቃ፣ ሲመጣ በምርመራ የተረጋገጠ።",
  cat_stationery: "ለትምህርት ቤትና ለቢሮ የዕለት ጥራት።",
  cat_groceries: "ትኩስ ዕቃ፣ ተመጣጣኝ ዋጋ፣ በጥንቃቄ የታሸገ።",
};

const products = [];
const byShop = {};
let prodSeq = 0;
for (const shop of shops) {
  byShop[shop.id] = [];
  const rows = catalogues[shop.id];
  rows.forEach((row, i) => {
    const [nameEn, nameAm, price, compareAt, unit, qty] = row;
    const flags = row[6] ?? "";
    prodSeq += 1;
    const id = `prod_${String(prodSeq).padStart(3, "0")}`;
    const created = daysAgoAt(between(30, 215), between(9, 18), between(0, 59));
    const product = {
      id,
      shopId: shop.id,
      nameEn,
      nameAm,
      category: shop.category,
      description: `${nameEn} — ${descEn[shop.category]}`,
      descriptionAm: `${nameAm} — ${descAm[shop.category]}`,
      price,
      compareAtPrice: compareAt,
      unit,
      photos: [`/api/art/product/${id}?c=${shop.category}`],
      quantity: qty,
      lowStockThreshold: 5,
      isPublished: !flags.includes("u"),
      sku: `${shop.id.slice(-2).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      createdAt: iso(created),
      updatedAt: iso(created),
    };
    products.push(product);
    byShop[shop.id].push(product);
  });
}

/* ---------------------------------------------------------------- */
/* Customers                                                         */
/* ---------------------------------------------------------------- */

const customerSeed = [
  ["cust_01", "Hanna Bekele", "+251911223344", "hanna.bekele@example.com",
    [["Home", "Bole Medhanialem, Awlo Building 3rd floor", "Bole", 8.996, 38.7905],
     ["Work", "Kazanchis, UNECA compound gate", "Kirkos", 9.018, 38.77]]],
  ["cust_02", "Abel Tesfaye", "+251911556677", "abel.tesfaye@example.com",
    [["Home", "Kazanchis, behind Ministry of Education", "Kirkos", 9.016, 38.768]]],
  ["cust_03", "Rahel Mekonnen", "+251912334455", "rahel.mekonnen@example.com",
    [["Home", "Sar Bet, Abinet road", "Nifas Silk-Lafto", 8.996, 38.752]]],
  ["cust_04", "Yonas Girma", "+251913445566", "yonas.girma@example.com",
    [["Home", "Gerji, Bethlehem area", "Bole", 9.021, 38.793]]],
  ["cust_05", "Selamawit Abebe", "+251914556677", "selamawit.abebe@example.com",
    [["Home", "Old Airport, Tsegaye street", "Bole", 8.983, 38.769],
     ["Work", "Bole airport road, Skylight area", "Bole", 8.978, 38.789]]],
  ["cust_06", "Michael Tadesse", "+251915667788", "michael.tadesse@example.com",
    [["Home", "Piassa, Arada street 12", "Arada", 9.034, 38.75]]],
  ["cust_07", "Tigist Alemu", "+251916778899", "tigist.alemu@example.com",
    [["Home", "Megenagna, Dhaka area", "Yeka", 9.012, 38.806]]],
  ["cust_08", "Dawit Haile", "+251917889900", "dawit.haile@example.com",
    [["Home", "Summit, Safari building", "Bole", 9.029, 38.799]]],
  ["cust_09", "Bethelehem Solomon", "+251918990011", "bethelehem.solomon@example.com",
    [["Home", "Haile Garment, house 44", "Nifas Silk-Lafto", 8.975, 38.766]]],
  ["cust_10", "Nathan Kassa", "+251919101112", "nathan.kassa@example.com",
    [["Home", "CMC road, St. Michael church", "Bole", 9.028, 38.817]]],
  ["cust_11", "Meron Assefa", "+251920202020", "meron.assefa@example.com",
    [["Home", "Ayat, Menaharia area", "Yeka", 9.045, 38.826]]],
  ["cust_12", "Samuel Negash", "+251921212121", "samuel.negash@example.com",
    [["Home", "Gurd Shola, near Tabote Building", "Bole", 9.021, 38.81]]],
  ["cust_13", "Eden Wolde", "+251922323232", "eden.wolde@example.com",
    [["Home", "Kality, behind the brewery", "Akaky Kaliti", 8.954, 38.768]]],
  ["cust_14", "Liya Girmay", "+251923434343", "liya.girmay@example.com",
    [["Home", "Shiro Meda, weavers street", "Gulele", 9.047, 38.764]]],
  ["cust_15", "Firaol Bekele", "+251924545454", "firaol.bekele@example.com",
    [["Home", "Lebu, Mebrathayllem area", "Nifas Silk-Lafto", 8.965, 38.735]]],
];

const customers = customerSeed.map(([id, name, phone, email, addrs]) => {
  const savedAddresses = addrs.map(([label, address, subCity, lat, lng], j) => ({
    id: `${id}_addr_${j + 1}`,
    label,
    address,
    subCity,
    lat,
    lng,
  }));
  return {
    id,
    name,
    phone,
    email,
    savedAddresses,
    defaultAddressId: savedAddresses[0].id,
    phoneVerified: true,
    createdAt: iso(daysAgoAt(between(40, 330), 10, 15)),
  };
});
const customerById = Object.fromEntries(customers.map((c) => [c.id, c]));
const shopById = Object.fromEntries(shops.map((s) => [s.id, s]));

/* ---------------------------------------------------------------- */
/* Orders                                                            */
/* ---------------------------------------------------------------- */

const WINDOWS = ["Morning (9 – 12)", "Midday (12 – 3)", "Afternoon (3 – 6)", "Evening (6 – 8)"];

// [shopId, customerId, status, paymentMethod, fulfilment, daysAgo, hour, minute, note]
const orderSpecs = [
  ["shop_01", "cust_02", "delivered", "telebirr", "delivery", 14, 10, 15, ""],
  ["shop_02", "cust_01", "delivered", "chapa", "delivery", 13, 16, 40, "Please call when you arrive."],
  ["shop_03", "cust_05", "collected", "cod", "pickup", 13, 11, 20, ""],
  ["shop_04", "cust_03", "delivered", "cbebirr", "delivery", 12, 9, 30, "Leave with the guard."],
  ["shop_01", "cust_06", "collected", "telebirr", "pickup", 12, 15, 5, ""],
  ["shop_02", "cust_04", "cancelled", "chapa", "delivery", 11, 14, 22, ""],
  ["shop_03", "cust_07", "delivered", "cod", "delivery", 11, 18, 10, "Ring the bell twice."],
  ["shop_04", "cust_08", "collected", "cbebirr", "pickup", 10, 12, 45, ""],
  ["shop_01", "cust_09", "delivered", "telebirr", "delivery", 9, 17, 35, ""],
  ["shop_02", "cust_10", "collected", "cod", "pickup", 9, 10, 50, ""],
  ["shop_03", "cust_01", "delivered", "cbebirr", "delivery", 8, 13, 25, "Gift wrap if possible."],
  ["shop_04", "cust_11", "collected", "telebirr", "pickup", 7, 16, 30, ""],
  ["shop_01", "cust_12", "delivered", "cod", "delivery", 6, 19, 5, ""],
  ["shop_02", "cust_13", "collected", "chapa", "pickup", 6, 11, 15, ""],
  ["shop_03", "cust_02", "cancelled", "telebirr", "delivery", 5, 10, 40, ""],
  ["shop_04", "cust_14", "delivered", "chapa", "delivery", 4, 15, 55, ""],
  ["shop_02", "cust_15", "delivered", "cod", "delivery", 2, 12, 30, ""],
  ["shop_03", "cust_03", "packed", "cbebirr", "delivery", 1, 16, 45, ""],
  ["shop_04", "cust_06", "ready_for_pickup", "telebirr", "pickup", 1, 10, 20, ""],
  ["shop_01", "cust_04", "out_for_delivery", "telebirr", "delivery", 0, 13, 5, "Call before arriving."],
  ["shop_02", "cust_07", "packed", "chapa", "delivery", 0, 11, 30, ""],
  ["shop_04", "cust_09", "ready_for_pickup", "cod", "pickup", 0, 10, 45, ""],
  ["shop_01", "cust_05", "confirmed", "cbebirr", "delivery", 0, 12, 10, ""],
  ["shop_03", "cust_10", "placed", "telebirr", "delivery", 0, 12, 40, ""],
  ["shop_01", "cust_08", "placed", "cod", "delivery", 0, 12, 55, ""],
];

const DELIVERY_STEPS = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"];
const PICKUP_STEPS = ["placed", "confirmed", "packed", "ready_for_pickup", "collected"];

const STATUS_BLURB = {
  placed: "Order received, waiting for the shop to confirm",
  confirmed: "The shop accepted your order",
  packed: "Your items are packed and labelled",
  out_for_delivery: "A rider picked up your order and is on the way",
  ready_for_pickup: "Your order is ready at the shop",
  delivered: "Order handed over — enjoy!",
  collected: "Order collected from the shop — enjoy!",
  cancelled: "This order was cancelled",
};

const orders = [];
const notifications = [];

function addNotification(userId, userType, channel, subject, message, orderId, createdAt, read) {
  notifications.push({
    id: `notif_${String(notifications.length + 1).padStart(3, "0")}`,
    userId,
    userType,
    channel,
    subject,
    message,
    orderId,
    read,
    createdAt: iso(createdAt),
  });
}

orderSpecs.forEach((spec, idx) => {
  const [shopId, customerId, status, paymentMethod, fulfilmentType, daysAgo, hour, minute, note] = spec;
  const shop = shopById[shopId];
  const customer = customerById[customerId];

  const placedAt = daysAgoAt(daysAgo, hour, minute);
  const catalogue = byShop[shopId];

  // 1–3 items, deterministic
  const itemCount = idx % 3 === 0 ? 2 : idx % 4 === 0 ? 3 : 1;
  const chosen = [];
  let guard = 0;
  while (chosen.length < itemCount && guard++ < 50) {
    const p = catalogue[Math.floor(rnd() * catalogue.length)];
    if (!chosen.find((c) => c.product.id === p.id)) {
      chosen.push({ product: p, qty: between(1, 3) });
    }
  }

  const items = chosen.map(({ product, qty }) => ({
    productId: product.id,
    nameEn: product.nameEn,
    nameAm: product.nameAm,
    qty,
    price: product.price,
  }));
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const address = fulfilmentType === "delivery" ? customer.savedAddresses.find((a) => a.id === customer.defaultAddressId) ?? customer.savedAddresses[0] : null;
  const distKm = address ? distanceKm({ lat: address.lat, lng: address.lng }, { lat: shop.lat, lng: shop.lng }) : 0;
  const deliveryFee = deliveryFeeFor(distKm, fulfilmentType, subtotal);
  const total = subtotal + deliveryFee;

  // Build the status history for the final status.
  const steps = fulfilmentType === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  let history;
  if (status === "cancelled") {
    // One cancels from placed (payment failure), one from confirmed (customer).
    history = idx % 2 === 0 ? ["placed"] : ["placed", "confirmed"];
  } else {
    history = steps.slice(0, steps.indexOf(status) + 1);
  }

  const confirmationSeconds = between(3, 14);
  const statusHistory = history.map((step, i) => {
    let at;
    if (i === 0) at = placedAt;
    else if (step === "confirmed") at = plusMinutes(placedAt, 0, confirmationSeconds);
    else if (step === "packed") at = plusMinutes(placedAt, between(12, 45));
    else if (step === "out_for_delivery") at = plusMinutes(placedAt, between(25, 60));
    else if (step === "delivered") at = plusMinutes(placedAt, between(45, 110));
    else if (step === "ready_for_pickup") at = plusMinutes(placedAt, between(15, 50));
    else if (step === "collected") at = plusMinutes(placedAt, between(120, 300));
    else at = plusMinutes(placedAt, between(6, 90)); // cancelled
    return { status: step, at: iso(at), by: step === "placed" ? "customer" : "vendor" };
  });
  if (status === "cancelled") {
    const reason = paymentMethod === "chapa"
      ? "Payment could not be verified, so the order was cancelled."
      : "Customer asked to cancel before packing.";
    statusHistory.push({
      status: "cancelled",
      at: iso(plusMinutes(placedAt, between(6, 90))),
      by: paymentMethod === "chapa" ? "vendor" : "customer",
      note: reason,
    });
  }

  let paymentStatus;
  const online = paymentMethod !== "cod";
  const isTerminal = ["delivered", "collected"].includes(status);
  if (status === "cancelled") {
    paymentStatus = paymentMethod === "chapa" ? "failed" : online ? "refunded" : "pending";
  } else if (online) {
    paymentStatus = "paid";
  } else {
    paymentStatus = isTerminal ? "paid" : "pending";
  }

  const orderId = `ord_${String(idx + 1).padStart(3, "0")}`;
  const slotDate = new Date(placedAt);
  if (fulfilmentType === "delivery") {
    // Same-day for morning orders, next day for afternoon ones.
    if (placedAt.getHours() >= 15) slotDate.setDate(slotDate.getDate() + 1);
  } else {
    slotDate.setDate(slotDate.getDate() + 1);
  }
  const slot = {
    date: slotDate.toISOString().slice(0, 10),
    window: fulfilmentType === "delivery" ? pick(WINDOWS) : "Any time during trading hours",
    label: fulfilmentType === "delivery" ? "Delivery" : "Pickup",
  };

  const order = {
    id: orderId,
    customerId,
    shopId,
    items,
    subtotal,
    deliveryFee,
    total,
    fulfilmentType,
    slot,
    deliveryAddress: address
      ? { id: address.id, label: address.label, address: address.address, subCity: address.subCity, lat: address.lat, lng: address.lng }
      : null,
    distanceKm: distKm,
    paymentMethod,
    paymentStatus,
    paymentRef: paymentStatus === "paid" ? `PAY-${orderId.toUpperCase()}-${between(1000, 9999)}` : null,
    status,
    statusHistory,
    cancellationReason: status === "cancelled" ? statusHistory[statusHistory.length - 1]?.note ?? null : null,
    customerNote: note,
    confirmationMs: history.includes("confirmed") ? confirmationSeconds * 1000 : null,
    createdAt: iso(placedAt),
  };
  orders.push(order);

  /* ---- Notifications that mirror this order's journey ---- */
  const customerName = customer.name.split(" ")[0];
  const readAll = daysAgo >= 3;

  // Vendor is told about the new order.
  addNotification(
    shopId,
    "vendor",
    "sms",
    "New order",
    `New order ${orderId} from ${customerName} — ${total.toLocaleString("en-US")} ETB (${items.length} item${items.length > 1 ? "s" : ""}, ${fulfilmentType}).`,
    orderId,
    placedAt,
    true
  );
  // Customer's own confirmation of placement.
  addNotification(
    customerId,
    "customer",
    "sms",
    "Order placed",
    `We sent your order ${orderId} to ${shop.name}. You'll get an update as soon as they confirm (usually within 10 seconds in this demo).`,
    orderId,
    placedAt,
    readAll
  );
  // One notification per subsequent status.
  for (let i = 1; i < statusHistory.length; i++) {
    const ev = statusHistory[i];
    const at = new Date(ev.at);
    const subject = ev.status === "cancelled" ? "Order cancelled" : "Order update";
    const message =
      ev.status === "cancelled"
        ? `Order ${orderId} was cancelled. ${ev.note ?? ""}`.trim()
        : `Your order ${orderId} from ${shop.name} is ${STATUS_BLURB[ev.status].toLowerCase()}.`;
    addNotification(
      customerId,
      "customer",
      ev.status === "packed" ? "email" : "sms",
      subject,
      message,
      orderId,
      at,
      readAll || (daysAgo >= 1 && i === statusHistory.length - 1)
    );
  }
});

/* ---------------------------------------------------------------- */
/* Write everything                                                  */
/* ---------------------------------------------------------------- */

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = {
    categories,
    shops,
    products,
    customers,
    orders,
    notifications,
  };
  for (const [name, rows] of Object.entries(files)) {
    const p = path.join(DATA_DIR, `${name}.json`);
    await fs.writeFile(p, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    console.log(`wrote ${p} (${rows.length} rows)`);
  }
  const gmvs = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  console.log(`\nDone. GMV of seed orders: ${gmvs.toLocaleString("en-US")} ETB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
