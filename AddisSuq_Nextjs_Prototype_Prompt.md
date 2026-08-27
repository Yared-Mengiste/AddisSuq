# Build Prompt: AddisSuq \u2014 Retail & Local E-Commerce Prototype (Next.js)

Copy everything below into your AI coding tool (Claude Code, Cursor, etc.) as the initial instruction.

---

## 1. Project context

Build a working **prototype** of "AddisSuq", a hyper-local retail marketplace for small and medium shops in Addis Ababa. This is a course demo (Software Project Management, SE341) covering **four MVP modules**:

- **Module A \u2014 Vendor Onboarding & Product Catalogue**: shop registration + admin approval, product catalogue/inventory.
- **Module B \u2014 Customer Accounts, Location & Discovery**: customer sign-up, location capture, distance-ranked search/browsing.
- **Module C \u2014 Shopping Cart, Checkout & Payment**: cart, order placement, payment method selection (Telebirr / CBE Birr / Chapa / Cash on Delivery \u2014 all simulated, no real gateway calls).
- **Module D \u2014 Delivery/Pickup, Order Tracking & Notifications**: delivery/pickup scheduling, order status timeline, simulated SMS/e-mail notifications (shown in-app as a "notification feed", not sent for real).

There are three user-facing roles: **Customer**, **Vendor**, **Admin** (approves shops). Ratings/reviews, a full vendor analytics dashboard, and a full admin console are OUT of scope \u2014 build only what's needed to demo Modules A\u2013D end to end.

## 2. Tech stack (required)

- **Next.js 14+ (App Router)**, TypeScript
- **Tailwind CSS** for styling
- **JSON file as the "database"**: store all data in `/data/*.json` (e.g. `shops.json`, `products.json`, `customers.json`, `orders.json`, `categories.json`). Read/write it from Next.js **Route Handlers** (`app/api/.../route.ts`) using Node's `fs/promises` \u2014 no real database, no ORM.
  - On write, read the JSON file, mutate in memory, write it back (pretty-printed) so changes persist across refresh during the demo.
  - Seed the JSON files with realistic demo data (see \u00a75) so the app looks alive on first run, not empty.
- Client state via React state/context (e.g. cart in a `CartContext`), refetching from the API routes rather than calling `fs` directly from client components.
- No auth provider needed \u2014 simulate login with a simple role/user picker (see \u00a76) stored in `localStorage`.
- Icons: `lucide-react`. Optional charts (for the tiny vendor summary) via `recharts`.

## 3. Data model (seed these JSON files in `/data`)

```
shops.json      -> { id, name, ownerName, phone, subCity, address, lat, lng,
                      category, tradingHours, status: "pending"|"approved"|"rejected",
                      logoUrl, createdAt }

products.json    -> { id, shopId, nameEn, nameAm, category, description,
                       price, photos: [url...], quantity, isPublished, createdAt }

customers.json    -> { id, name, phone, savedAddresses: [{label,address,lat,lng}],
                        defaultAddressId, createdAt }

orders.json       -> { id, customerId, shopId, items: [{productId, qty, price}],
                        subtotal, deliveryFee, total,
                        fulfilmentType: "delivery"|"pickup",
                        paymentMethod: "telebirr"|"cbebirr"|"chapa"|"cod",
                        paymentStatus: "pending"|"paid"|"failed",
                        status: "placed"|"confirmed"|"packed"|"out_for_delivery"|
                                "ready_for_pickup"|"delivered"|"collected"|"cancelled",
                        statusHistory: [{status, at}],
                        createdAt }

notifications.json -> { id, userId, userType: "customer"|"vendor",
                         channel: "sms"|"email", message, orderId, read, createdAt }

categories.json    -> { id, nameEn, nameAm, icon }
```

Keep IDs as short strings (e.g. `"shop_01"`, `"prod_014"`, `"ord_003"`) so seed data and screenshots stay readable.

## 4. Pages / routes to build

**Public / customer**
- `/` \u2014 landing: hero, search bar, category chips, "shops near you" grid (distance simulated from a fixed demo customer location), featured products.
- `/search` \u2014 results with filters (sub-city, category, price range, keyword) and a distance sort.
- `/shops/[id]` \u2014 shop profile + its published product catalogue.
- `/products/[id]` \u2014 product detail with add-to-cart, quantity picker.
- `/cart` \u2014 cart grouped by shop (one order per shop), quantity edit, remove.
- `/checkout` \u2014 delivery vs pickup, address/scheduling, payment method selection, order summary \u2192 places the order.
- `/checkout/confirmation/[orderId]` \u2014 order placed screen.
- `/orders` \u2014 customer's order list.
- `/orders/[id]` \u2014 order detail with a **visual status timeline** (Placed \u2192 Confirmed \u2192 Packed \u2192 Out for delivery/Ready \u2192 Delivered/Collected) and the simulated notification feed for that order.
- `/account` \u2014 customer profile, saved addresses, location setting.

**Vendor**
- `/vendor/onboarding` \u2014 multi-step shop registration form (shop info, category, trading hours, document upload placeholders) \u2192 submits with status "pending".
- `/vendor/dashboard` \u2014 pending-approval banner if not yet approved; once approved: quick stats (orders today, products, revenue \u2014 from seed data) + incoming orders list.
- `/vendor/products` \u2014 catalogue table: add/edit/publish/unpublish product, stock quantity, auto-hide at 0 stock.
- `/vendor/orders/[id]` \u2014 update order status (advances the same state machine customers see).

**Admin**
- `/admin/vendors` \u2014 list of pending shop applications with Approve/Reject actions.
- `/admin/overview` \u2014 simple counts: shops, products, orders, GMV (all computed from the JSON data).

**Shared**
- A role switcher in the header (Customer / Vendor / Admin) for demo purposes, plus a simulated "current user" picker so graders can see different accounts without a real login flow.

## 5. Seed data to ship with the repo

Seed enough to satisfy the project's own success criteria so the demo looks credible:
- **5 shops** (mixed categories: boutique, electronics, cosmetics, stationery, mini-market), all `status: "approved"` except one `"pending"` (so the admin approval flow has something to act on).
- **At least 100 products** spread across the 5 shops, with real-looking Amharic + English names, prices in ETB, and at least a few products at 0 stock (to demonstrate auto-hide).
- **~15 demo customers.**
- **~25 orders** spanning every status value and every payment method, so the order timeline and vendor order list both have varied examples to show off.
- **A matching notifications.json** log so the "notification feed" on an order detail page isn't empty.

## 6. UI/UX requirements (this matters as much as functionality)

- **Mobile-first and fully responsive** \u2014 most real users are on a phone; design the customer flow for a 375px viewport first, then scale up to tablet/desktop. Vendor/admin screens can be desktop-leaning but must still work on a tablet.
- **Clean, modern, "local marketplace" visual identity** \u2014 not a generic Bootstrap look. Suggested direction: warm, trustworthy palette (deep green or terracotta as primary, warm neutral background, one accent color for CTAs/status), generous whitespace, rounded cards, soft shadows, a distinctive heading font paired with a clean body font (e.g. via `next/font`).
- **Bilingual touch**: show product names with a small EN/\u12a0\u121b language toggle in the header (doesn't need full i18n routing \u2014 a client-side toggle swapping `nameEn`/`nameAm` is enough for the demo).
- Use **skeleton loaders**, not blank screens, while the JSON API routes respond.
- **Empty and pending states matter**: e.g., "no shops in this category yet", vendor dashboard before approval, empty cart \u2014 design these deliberately, don't leave them as bare text.
- **Order status timeline** should be a real visual component (stepper/progress line with icons and timestamps), not a plain table row.
- **Toast notifications** (e.g. `sonner` or a simple custom toast) for actions: added to cart, order placed, shop approved, product published, etc.
- Buttons, forms and cards should have visible hover/focus/disabled states and obey WCAG-reasonable color contrast.
- Use consistent spacing/typography scale (Tailwind config: extend theme rather than using arbitrary values everywhere).

## 7. Non-functional notes for the prototype

- No real payment integration or SMS/e-mail sending \u2014 simulate both (payment "succeeds" after a short fake delay; notifications are written into `notifications.json` and shown as an in-app feed).
- No real authentication \u2014 a lightweight "choose your demo user" selector is enough; store the chosen role/user id in `localStorage` and read it in a small client-side auth context.
- Keep all business rules from the assignment visible in the UI even though they're not enforced by a real backend, e.g.: order confirmation "within 10 seconds", delivery fee by distance band, one cart per shop, stock decrementing on order placement, one-time-password-style verification screen for sign-up (can be a fake 4-digit code that always accepts "1234").
- Structure the repo cleanly: `/app`, `/components`, `/lib` (JSON read/write helpers, distance calc, status-machine helpers), `/data` (the JSON "database"), `/types` (shared TypeScript types matching \u00a73).

## 8. What to deliver, in order

1. Scaffold the Next.js + TypeScript + Tailwind project and the folder structure above.
2. Define the shared TypeScript types and write the seed JSON files with the volumes in \u00a75.
3. Build the `/lib` JSON read/write helpers and the API route handlers for shops, products, customers, orders, notifications (CRUD as needed per screen above).
4. Build the customer flow end to end (browse \u2192 search \u2192 product \u2192 cart \u2192 checkout \u2192 order tracking), polishing UI as you go rather than leaving it for later.
5. Build the vendor flow (onboarding \u2192 pending state \u2192 catalogue management \u2192 order management).
6. Build the admin approval flow and overview page.
7. Add the role switcher, language toggle, toasts, skeleton loaders and empty states across all screens.
8. Do a final responsive pass at 375px / 768px / 1280px and fix any layout breakage.

Build this incrementally and show me progress after each numbered step rather than trying to generate everything in one pass.
