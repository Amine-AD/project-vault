# How to Use and Test 1Vault (Complete Testing Guide)

This guide walks you through every single scenario and feature of **1Vault** step-by-step. Follow these test cases to verify all aspects of the application.

---

## Prerequisites: Starting the App

If the app is not already running, open your terminal in the project folder and run:

```bash
npm run dev
```

Then open your browser and navigate to:  
👉 **[http://localhost:3000/](http://localhost:3000/)**

---

## Test Scenario 1: First-Time Vault Creation (Sign Up)

**Goal**: Create a brand new encrypted vault.

1. On the initial screen, you will see the unlock window.
2. Click the blue link at the bottom: **"Create one"**.
3. The title changes to **"Create Your Vault"**.
4. Enter an email address (e.g. `tester@example.com`).
5. In **Master Password**, start typing a password.
   - Notice the **Password Strength Meter** bar updating in real time (from red "Weak" to green "Strong").
   - Enter a strong password: `CorrectHorseBattery2026!`
6. In **Confirm Master Password**, enter the exact same password: `CorrectHorseBattery2026!`.
7. Click the blue button: **"Create Encrypted Vault"**.
8. **Expected Result**: 
   - The modal disappears.
   - You are greeted with the clean 3-pane layout.
   - The top left displays your email (`tester@example.com`) and an empty vault message: *"Your vault is empty"*.

---

## Test Scenario 2: Adding a Login Item with Password Generator & 2FA

**Goal**: Store credentials with a strong password, website link, and rolling 2FA authenticator.

1. In the middle pane, click the blue **"New"** button and select **"New Login"**.
2. Fill out the fields:
   - **Title**: `GitHub Main`
   - **Username / Email**: `octocat@github.com`
   - **Website URL**: `https://github.com`
   - **Password**: Click the blue **"Generate Strong"** button next to the password label. Notice it automatically fills in a random, high-entropy password!
   - **One-Time Password Secret (2FA Key)**: Enter this standard test secret key:
     ```
     JBSWY3DPEHPK3PXP
     ```
     - Notice the green live preview appears beneath the field showing: `Live Preview: 123 456 (27s remaining)`.
   - **Tags**: Enter `work, developer`
   - **Secure Notes**: Enter `Main personal development account with SSH keys.`
3. Click **"Save Item"**.
4. **Expected Result**:
   - `GitHub Main` appears in the middle list with a blue key icon.
   - The right pane displays all details in view mode.
   - The 2FA box shows a live rolling 6-digit code and a countdown timer ticking down from 30s to 0s, automatically refreshing with a new code every 30 seconds!

---

## Test Scenario 3: Testing 1-Click Copy Buttons & Visibility

**Goal**: Test clipboard shortcuts and password masking.

1. In the right pane for `GitHub Main`:
2. Find the **Username** field and click **"Copy"**.
   - **Expected**: The button temporarily displays a green checkmark and says **"Copied"**. If you paste into any text editor (Ctrl+V or Cmd+V), you will see `octocat@github.com`.
3. Find the **Password** field:
   - By default, it is masked with dots (`••••••••••••••••`).
   - Click the **Eye icon**. The password is revealed in plaintext.
   - Click the **EyeOff icon**. The password is masked again.
   - Click **"Copy"** next to Password. Paste it somewhere to verify the full unmasked password was copied to your clipboard.
4. Find the **2FA One-Time Password** field:
   - Click **"Copy Code"**.
   - Paste it. Verify the 6-digit rolling code matches what is displayed.
5. Find the **Website URL** field:
   - Click the external link icon (box with arrow). It will open `https://github.com` in a new tab.

---

## Test Scenario 4: Adding a Secure Note

**Goal**: Store private text, recovery keys, or secret memos.

1. Click the **"New"** button in the middle pane and select **"Secure Note"**.
2. Fill out:
   - **Title**: `Home Wi-Fi & Router Setup`
   - **Tags**: `home, network`
   - **Secure Notes**:
     ```
     Network Name: Starfleet_5G
     Router IP: 192.168.1.1
     Admin Password: super-secret-admin-pass
     Recovery codes:
     1. 8839-2910-4491
     2. 1049-5582-9921
     ```
3. Click **"Save Item"**.
4. **Expected Result**: 
   - The note appears in the middle list with a green document icon.
   - The detail pane displays the formatted multi-line text clearly.

---

## Test Scenario 5: Adding Custom Fields (Text vs Hidden)

**Goal**: Add custom key-value pairs (like PIN numbers or Security Questions).

1. Select `GitHub Main` and click **"Edit"** in the top right.
2. Scroll to the **"Custom Fields"** section and click **"+ Add Field"**.
3. In the first field row:
   - Label: `Security Question 1`
   - Value: `First pet name: Barnaby`
   - Type: Keep as `Text`
4. Click **"+ Add Field"** again:
   - Label: `ATM PIN`
   - Value: `9842`
   - Type: Change the dropdown to **`Hidden`**
5. Click **"Save Item"**.
6. **Expected Result**:
   - In the detail view, `Security Question 1` shows the plaintext answer with a Copy button.
   - `ATM PIN` shows dots `••••••••` to protect it from shoulder-surfers, and has its own Copy button.

---

## Test Scenario 6: Starring Favorites & Category Filtering

**Goal**: Organize and filter your vault.

1. On `GitHub Main`, click the **Star icon** in the top header. The star turns bright yellow.
2. Look at the **Left Sidebar**:
   - Click **"Favorites"**: Only `GitHub Main` is shown in the list.
   - Click **"Logins"**: Only login items are shown.
   - Click **"Secure Notes"**: Only your Wi-Fi note is shown.
   - Click **"All Items"**: Both items are displayed.
3. Under the **"Tags"** section in the left sidebar:
   - Click the `work` tag: Only `GitHub Main` is shown.
   - Click the `home` tag: Only `Home Wi-Fi` is shown.
   - Click the active tag again to clear the filter.

---

## Test Scenario 7: Real-Time Instant Search

**Goal**: Test fast client-side searching across all fields.

1. Click on the **Search bar** at the top of the middle pane.
2. Type `octocat` $\rightarrow$ Instantly filters down to `GitHub Main`.
3. Type `192.168` $\rightarrow$ Instantly finds `Home Wi-Fi` because the IP address was in the notes!
4. Type `developer` $\rightarrow$ Finds `GitHub Main` matching its tag.
5. Click the small **"X"** inside the search bar to clear the search. All items return immediately.

---

## Test Scenario 8: Standalone Password Generator Tool

**Goal**: Generate secure passwords without editing an item.

1. In the Left Sidebar, click **"Password Generator"** under *Utilities*.
2. A window opens displaying a large, readable monospace password.
3. Drag the **Length** slider from 20 up to 32 characters.
   - Notice the password expands in real time.
4. Uncheck **Symbols (!@#$)**: Notice all symbols disappear from the password.
5. Check **Avoid Ambiguous Characters (0, O, 1, l)**: Notice easily confused letters are excluded.
6. Click **"Regenerate"**: A fresh password is generated immediately.
7. Click **"Copy Password"**: The button indicates *"Copied!"* and puts the password on your clipboard.
8. Click the **"X"** in the top right to close the window.

---

## Test Scenario 9: Manual Lock & Auto-Lock (Security Verification)

**Goal**: Verify that your vault securely locks and clears sensitive keys from memory.

### Part A: Manual Lock
1. In the Left Sidebar (top right of the header), click the **Lock icon**.
2. **Expected Result**:
   - The screen immediately transitions to the Master Password prompt: *"Unlock 1Vault - Enter master password for tester@example.com"*.
   - All passwords, usernames, and notes are completely wiped from browser memory.
3. Try typing an incorrect password: `WrongPassword123` and click **"Unlock Vault"**.
   - **Expected**: A red error message appears: *"Invalid email or master password."*
4. Type the correct password: `CorrectHorseBattery2026!` and click **"Unlock Vault"**.
   - **Expected**: The vault unlocks and decrypts all your items instantly!

### Part B: Auto-Lock Idle Inactivity
1. At the bottom of the Left Sidebar, locate the **"Auto-Lock"** selector.
2. Change the dropdown from `15 mins` to **`1 min`**.
3. Do not move your mouse, click, or type for 60 seconds.
4. **Expected Result**: After 1 minute of inactivity, the app automatically locks itself and presents the unlock prompt.

---

## Test Scenario 10: Exporting Your Vault Backup

**Goal**: Save a backup of your data.

1. In the Left Sidebar, click **"Import & Export"**.
2. On the **"Export Backup"** tab, click **"Download Vault JSON Backup"**.
3. **Expected Result**: 
   - Your browser downloads a file named `1vault-export-YYYY-MM-DD.json`.
   - Open that file in Notepad or VS Code to confirm it contains your items formatted cleanly in JSON.

---

## Test Scenario 11: Importing Credentials (CSV or JSON)

**Goal**: Import passwords exported from other password managers or browsers.

1. In the Left Sidebar, click **"Import & Export"**.
2. Click the **"Import Data"** tab.
3. To test importing, you can create a test CSV file named `passwords.csv` on your desktop with this content:
   ```csv
   Title,Username,Password,URL,Notes
   Netflix,family@netflix.com,NetFlixPass!99,https://netflix.com,Shared family plan
   Spotify,music@spotify.com,SpotPass!44,https://spotify.com,Premium duo
   ```
4. Click the upload box and select your CSV file (or your downloaded JSON file).
5. **Expected Result**:
   - The app parses the file and shows: *"Loaded 2 items from CSV file."*
6. Click the blue button: **"Import 2 Items into Vault"**.
7. The app encrypts both items client-side with AES-256-GCM and stores them.
8. Look at your item list: `Netflix` and `Spotify` are now in your vault!

---

## Test Scenario 12: Editing & Deleting an Item

**Goal**: Update details and delete obsolete items.

1. Click on `Spotify` in the middle list.
2. Click **"Edit"** in the top right.
3. Change the Title to `Spotify Family`.
4. Click **"Save Item"**. The title updates immediately.
5. With `Spotify Family` selected, click the red **Trash Can icon** in the top right.
6. A confirmation dialog asks: *"Are you sure you want to delete this item?"*
7. Click **OK**.
8. **Expected Result**: `Spotify Family` is permanently removed from the list and database.

---

## Test Scenario 13: Signing Out & Switching Accounts

**Goal**: Ensure clean session termination.

1. At the bottom of the Left Sidebar, click **"Sign Out"**.
2. **Expected Result**:
   - The session cookie is destroyed on the server.
   - The app returns to the clean login screen where you or another person can sign in or create another separate vault.

---

## Test Scenario 14: Direct Database Zero-Knowledge Verification

**Goal**: Prove beyond any doubt that the database server never holds your passwords in plaintext.

Open a PowerShell terminal in the project directory and run this command:

```powershell
node -e "const Database = require('better-sqlite3'); const db = new Database('vault.db'); console.log(db.prepare('SELECT id, type, encrypted_data FROM vault_items').all());"
```

**Look at the output**:
You will see that the database only holds:
```json
{"iv":"...", "ciphertext":"H087q8KnsefuHxxKsTyFBuMpdpa336a56RwuzxQK4N..."}
```

Notice that nowhere in the database does `Netflix`, `CorrectHorseBattery2026!`, or any usernames appear. Everything is 100% encrypted before it leaves the browser!
