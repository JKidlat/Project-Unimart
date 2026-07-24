# Plan: Fix Auth State — Hide Sign In After Login, Distinguish Buyer/Seller Profile

## Context
The app's `UserContext` hard-codes `isLoggedIn: true` with a mock user on every load, so the
navbar always shows the profile avatar. Neither `Signup.tsx` nor `Signin.tsx` update the
context — they only call `navigate()`. The user reports the Sign In button remains visible
after signing up, which means the initial state needs to default to `false`/`null`, and the
auth pages must wire into the context. Additionally, the navbar profile pill must visually
distinguish a Buyer from a Seller.

## Files to Change

### 1. `src/app/context/UserContext.tsx`
- Change `isLoggedIn` initial value: `useState(false)` (line 65)
- Change `user` initial value: `useState<UserProfile | null>(null)` (line 68) — remove the
  mock user object
- Add a `login` method to the context that accepts a `UserProfile` and sets both `user` and
  `isLoggedIn = true`. Expose it in `UserContextType` and the Provider value.
- Keep `logout()`, `updateProfile()`, and everything else untouched.

### 2. `src/app/pages/Auth/Signup.tsx`
- Import `useUser` from context.
- Destructure `login` from the hook.
- In `handleSubmit`, after validation, call:
  ```ts
  login({
    name: formData.fullName,
    email: formData.email,
    university: formData.university,
    role: formData.role as UserRole,
    profilePic: null,
    joinDate: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    referralCode: `UNIM-${formData.fullName.split(' ').map(w => w[0]).join('')}-${Date.now().toString().slice(-4)}`,
  });
  ```
- Keep navigate('/profile') and toast unchanged.

### 3. `src/app/pages/Auth/Signin.tsx`
- Import `useUser` from context.
- Destructure `login` from the hook.
- In `handleSubmit`, call `login` with a mock profile (since no real backend):
  ```ts
  login({
    name: "Emmanuel Boateng",   // placeholder until real backend
    email: formData.email,
    university: "University of Ghana (UG)",
    role: "Buyer",
    profilePic: null,
    joinDate: "Sept 2024",
    referralCode: "UNIM-EB-2026",
  });
  ```
- Keep navigate('/') and toast unchanged.

### 4. `src/app/components/Navbar.tsx`
**Profile pill — buyer vs seller distinction:**
- Import `Briefcase` and `ShoppingBag` icons from lucide-react (Briefcase already imported
  elsewhere; add `ShoppingBag` or reuse `User` for buyer).
- In the `isLoggedIn && user` branch (line 94), add a small role badge below/beside the
  avatar:
  - Buyer: small teal/blue badge with `User` icon — label "Buyer"
  - Seller: small wine/amber badge with `Briefcase` icon — label "Seller"
- Implementation: wrap the avatar `div` in a relative container, add an absolute
  bottom-right badge circle (8×8px) with role-specific color.
- Also add a role label next to the first name on desktop (hidden on mobile):
  `<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{user.role}</span>`
- Mobile menu: add conditional Sign In link when `!isLoggedIn`, and hide the "My Profile"
  link when not logged in.

## Verification
1. Visit `/signup`, fill out the form as Buyer — submit → toast shows, navbar now shows
   profile avatar with "Buyer" badge, Sign In button is gone.
2. Repeat as Seller → avatar shows "Seller" badge in wine/amber color.
3. Click "Sign In" on the sign-in page → same effect.
4. Logout from profile → navbar reverts to "Sign In" button.
5. All existing pages (Admin, Messages, Help, Shop, etc.) remain functional.
