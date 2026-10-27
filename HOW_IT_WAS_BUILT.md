# How 1Vault Was Built (From A to Z in Plain English)

This guide explains how this password manager was built and how it works under the hood. 

No confusing academic jargon—everything is explained using everyday language and simple real-world analogies.

---

## 1. The Core Idea: The "Blind Courier" Analogy

In typical websites (like social media or shopping apps), when you type in your data, the server reads it, understands it, and saves it to its database. 

If a hacker breaks into that server, they can read everything.

**Our app works differently. It uses a "Zero-Knowledge" system:**

> **The Bank Safe Analogy:**  
> Imagine you rent a metal safety deposit box inside a bank vault.  
> - **You** have the only key that can open the box.  
> - The bank holds the box for you in their building, but **the bank has no key, no master key, and no way to peek inside.**  
> - Even if someone robs the bank or the bank manager is evil, they only see a locked metal box they cannot open.

In 1Vault:
- **Your Browser** is where the key lives and where items are locked and unlocked.
- **The Server and Database** are just the "bank". They only store scrambled, locked boxes. They never know what is inside.

---

## 2. Jargon Buster: Technical Terms Explained Simply

Whenever you read about security, you see abbreviations like **AES-256-GCM**, **PBKDF2**, **Salt**, and **IV**. Here is what they actually mean:

### 1. Encryption
- **What it is**: Scrambling readable text into unreadable gibberish using a secret key.
- **Plain English**: Writing a secret message in code that only someone with the decoder ring can read.

### 2. Decryption
- **What it is**: Turning the scrambled gibberish back into readable words using the same secret key.

### 3. AES-256-GCM (The Unbreakable Lock Box)
- **AES (Advanced Encryption Standard)**: The worldwide gold standard for encryption, used by governments, banks, and military.
- **256**: The size of the lock's combination. A 256-bit key has $2^{256}$ possible combinations. That number is larger than the total number of atoms in the known universe! Even if all the supercomputers on Earth tried guessing combinations for billions of years, they could never crack it.
- **GCM (Galois/Counter Mode - The Tamper-Evident Seal)**: Imagine you put a piece of wax with your personal stamp on the locked box. If an attacker tampers with even a single letter inside the box, the seal breaks instantly. The app will immediately detect the tampering and refuse to open the damaged file.

### 4. PBKDF2 (The Heavy Dough Kneader)
- Stands for: **Password-Based Key Derivation Function 2**.
- **The Problem**: Human passwords like `CorrectHorseBattery2026!` are easy for computers to guess if the computer can test 100 million guesses per second.
- **The Solution**: PBKDF2 acts like a heavy dough mixer. When you type your password, PBKDF2 doesn't just use it directly. It takes your password and kneads, folds, and mixes it **600,000 times** using complex math!
- **Why this protects you**:
  - For your laptop, doing 600,000 folds once takes less than 1 second—you barely notice.
  - But for a hacker trying to guess 1 billion passwords, having to do 600,000 math folds for *every single guess* slows them down to a dead stop. It makes brute-force attacks virtually impossible.

### 5. Salt (The Unique Spice)
- **What it is**: A random string of characters generated just for your account when you sign up.
- **Why it matters**: If two people choose the exact same master password (e.g. `SecretPassword123`), the Salt guarantees that their resulting mathematical keys look completely different.
- **Analogy**: It prevents attackers from using pre-made "cheat sheets" (known as Rainbow Tables) to crack passwords.

### 6. IV (Initialization Vector - The Fresh Coat of Paint)
- **What it is**: A fresh 12-byte random number generated every single time you save or update an item.
- **Why it matters**: If you save the word `"apple"` today, and save `"apple"` again tomorrow, the IV ensures the scrambled text looks completely different each time. A hacker looking at your database cannot even tell that both items contain the same word!

### 7. Hashing (The One-Way Blender)
- **What it is**: Turning data into a fingerprint.
- **Analogy**: Making a strawberry smoothie. You can easily blend strawberries into a smoothie, but you can **never** un-blend a smoothie back into original strawberries. 
- In our app, we hash your authentication key before checking it, so the server never knows your actual master password.

### 8. TOTP (Time-based One-Time Password / 2FA)
- **What it is**: The 6-digit code that changes every 30 seconds (like Google Authenticator or 1Password).
- **How it works**: You and the website share a secret code (like `JBSWY3DPEHPK3PXP`). Both your browser and the website look at the current clock time and do the exact same math problem to calculate the 6-digit code. Every 30 seconds, the clock moves forward, and a new code appears.

---

## 3. How the Pieces Fit Together (Architecture)

The app is composed of 4 main layers:

```
┌────────────────────────────────────────────────────────┐
│ 1. THE FRONTEND (Your Browser)                         │
│ - Visual 3-Pane UI: Sidebar, Item List, Details/Editor │
│ - Web Crypto Engine: Generates keys, encrypts &        │
│   decrypts items in browser memory                     │
└───────────────────────────┬────────────────────────────┘
                            │
               Only sends encrypted blobs
               (Never sends master password)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. THE SERVER (TanStack Start / Nitro API)              │
│ - Acts as a blind storage locker                       │
│ - Verifies your login session via an HttpOnly cookie   │
│ - Receives and returns scrambled ciphertext            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. THE DATABASE (SQLite - vault.db via Drizzle ORM)    │
│ - Single file on your computer (`vault.db`)            │
│ - Stores encrypted rows: { iv, ciphertext }            │
└────────────────────────────────────────────────────────┘
```

---

## 4. What Happens Step-by-Step

### Scenario A: When You Create an Account
1. You type your email (`me@example.com`) and your Master Password in the browser.
2. The browser generates a unique random **Salt**.
3. The browser runs **PBKDF2** (600,000 rounds) on your password + salt.
4. This math produces **two separate keys**:
   - **Key 1: The Vault Encryption Key** (stays strictly in your browser memory; never leaves your device).
   - **Key 2: The Auth Key** (hashed and sent to the server so the server can verify who you are).
5. The server saves your email, salt, and hashed auth key in `vault.db`. It issues a secure session cookie.

### Scenario B: When You Add a Password (e.g. GitHub)
1. You fill out: Title (`GitHub`), Username (`dev`), Password (`Secret123`), and 2FA secret.
2. When you click **Save Item**:
   - The browser bundles this information into a JSON package.
   - The browser picks a fresh random **IV**.
   - The browser uses **AES-256-GCM** with your **Vault Encryption Key** to scramble the package into gibberish.
3. The browser sends only `{ iv: "...", ciphertext: "..." }` to the server.
4. The server stores that scrambled text in `vault.db`.

### Scenario C: When You Unlock Your Vault
1. You enter your Master Password on the unlock screen.
2. The browser gets your Salt from the server and runs the 600,000 PBKDF2 rounds to recreate your **Vault Encryption Key**.
3. The browser downloads your scrambled items from the server.
4. In browser memory, the browser uses the key to unscramble (decrypt) the items.
5. You instantly see your items, search them, and copy credentials!

### Scenario D: When Auto-Lock Triggers
1. If you step away from your keyboard and do not move your mouse or type for the configured time (e.g., 15 minutes):
2. The timer expires.
3. The app **immediately erases the Vault Encryption Key and all decrypted passwords from your computer's memory**.
4. The screen locks. Even if someone sits down at your laptop, there are no decrypted passwords left in memory until the master password is typed again.

---

## 5. Technology Choices & Why They Were Picked

| Tool | What it is | Why we picked it |
| :--- | :--- | :--- |
| **TanStack Start** | Fullstack web framework | Provides fast, type-safe communication between frontend and server functions without boilerplate API code. |
| **Drizzle ORM** | Database tool | Lets us define tables in simple TypeScript and ensures SQL queries are fast and safe. |
| **SQLite (`better-sqlite3`)** | Lightweight database | Stores everything inside a single file (`vault.db`). No complex database installation (like MySQL or Postgres) needed. Perfect for self-hosting. |
| **Web Crypto API** | Browser's built-in cryptography engine | Built directly into Chrome, Firefox, Safari, and Edge. It uses your computer's hardware chip for lightning-fast encryption. |
| **`otpauth`** | Standard 2FA library | Calculates 6-digit rolling codes with pinpoint accuracy according to RFC 6238. |
| **Tailwind CSS v4** | Modern styling system | Crafted a clean, purposeful dark theme that looks and feels like a native desktop application. |
