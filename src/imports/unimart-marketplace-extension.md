Extend the existing Unimart student marketplace UI by adding review & rating features, live chat & help support, and a comprehensive admin dashboard.

All new screens and components must reuse the current Unimart design system, color palette (purple gradients), typography, spacing, and component styles so everything feels seamlessly connected.

⭐ 1. Reviews & Ratings System (User-Facing)

Design a product reviews and ratings section that integrates directly into the Product Details page.

Components to Add

Star rating component (1–5 stars)

Review summary block:

Average rating

Total number of reviews

Rating breakdown (progress bars per star level)

Individual review cards:

Reviewer name

University badge

Star rating

Review text

Date posted

User Actions

“Write a Review” button

Review form modal:

Star rating selector

Text input

Submit button

Read-only view for users who haven’t purchased

UX Rules

Reviews appear below product description

Smooth expand/collapse

Clear trust signals

Empty state for new products

💬 2. Live Chat & Help Center

Design a real-time messaging and support experience.

A. Buyer ↔ Seller Live Chat

Add a chat UI accessible from:

Product Details page

User Profile page

Chat UI Components

Chat list sidebar

Conversation window

Message bubbles (sent vs received)

Timestamp

Image attachment icon

Typing indicator

Online status indicator

Style must match Unimart’s soft, rounded, modern look.

B. Help & Support Section

Design a Help Center accessible from the main navigation.

Help Center Pages

Report an Issue

Contact Support

FAQ

System Status

Report Issue Form

Category dropdown (Payment, Order, Account, Technical)

Description field

Attach screenshot option

Submit button

🛠️ 3. Admin Dashboard (Creator View)

Design a full admin dashboard UI for Unimart’s creator.

Admin Entry

Separate admin login UI

Admin-only navigation

Admin Dashboard Home

Design a data-rich overview page with real-time feel.

Metrics Cards

Total users

Active users

Total products

Orders today

Revenue (Paystack)

Open support tickets

Use charts, counters, and badges.

User Management Page

User table:

Name

Email

University

Role (Buyer / Seller)

Verification status

Active / Suspended

Actions:

View profile

Suspend / Activate

Promote / Demote

Product Management Page

Product list with filters

Flagged products

Delete / hide listings

Seller info linked

Orders & Payments

Order list

Payment status

Paystack reference

Refund status

Reviews Moderation

View reported reviews

Approve / remove reviews

Flag abusive content

Live Activity Panel

Design a real-time activity feed showing:

New user signups

New listings

Payments completed

New reviews

Support tickets opened

🔗 Navigation & Flow

Admin UI must visually connect to main Unimart branding

Clear separation between user and admin areas

Breadcrumbs for admin pages

Consistent sidebar navigation

📱 Responsiveness

Desktop-first for admin

Mobile-responsive for user features

Collapsible admin sidebar

🧩 Developer Handoff Rules

All components built with Auto Layout

Clear naming conventions

Variants for hover, active, disabled

Use design tokens already defined

Prepare for React + Tailwind mapping

🧠 Final Instruction

This extension should make Unimart feel like a fully operational, scalable startup platform, not just a marketplace.

Everything must feel connected, intentional, and production-ready.