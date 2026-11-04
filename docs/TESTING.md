# Testing OneVault

A checklist for testing the whole app by hand. Work through it top to bottom
the first time; later, re-run the sections touched by a change.

Each test lists what to do and what you should see. Tick the box when it
passes. If something doesn't match, note the test number and what happened.

---

## 0. Setup

### Run the app with emails in the terminal

The quickest way to test is **console mode**: emails (codes and alerts) are
printed in the terminal running the app instead of being sent.

1. In `.env`, comment out the key: `# RESEND_API_KEY=re_...`
2. Run `npm run dev` and open <http://localhost:3000>.
3. When the app sends an email, look in the terminal for a block starting
   with `──── email (RESEND_API_KEY not set, not sent) ────`. The code is in
   there.

Restart `npm run dev` after editing `.env`.

### Test email addresses

In console mode any address works. Use labels so each test gets a fresh
account: `you+t1@example.com`, `you+t2@example.com` and so on. The app treats
each as a different account.

### A second (and third) "device"

Some tests need another device. Use any of these; each has its own cookies
and storage, so the app sees a separate browser:

- A different browser (Chrome and Edge, for example).
- A second Chrome profile.
- An Incognito/Private window. Everything is wiped when you close it, which
  makes it a good stand-in for a **public computer**.
- <http://127.0.0.1:3000> instead of <http://localhost:3000> in the same
  browser.

### Good to know before you start

- Failed-attempt lockouts are kept in server memory. **Restarting
  `npm run dev` clears them**, which is handy if you lock yourself out.
- A code you request can't be re-requested for **45 seconds**.
- Use passwords you can remember for the test accounts and write down every
  recovery key you're shown. Several tests need an old password or key.

---

## 1. Website

- [ ] **1.1** Open `/`. The landing page loads with no errors, all sections
      show, and links to sign up and sign in work.
- [ ] **1.2** Resize the window to phone width. The menu collapses into the
      mobile menu and nothing overflows sideways.
- [ ] **1.3** Toggle light/dark. Every page you visit afterwards uses the
      chosen theme, including after a reload.

## 2. Sign-up

- [X] **2.1 Happy path.** Go to `/sign-up`, enter a new email → a 6-box code
      screen appears → enter the code from the terminal → the master
      password step appears → enter and confirm a password → the vault opens
      and the **Save your recovery kit** dialog shows.
- [X] **2.2 Recovery kit dialog.** **Done** stays disabled until "I've saved
      my recovery key" is ticked. Download, Print and Copy each work.
      Write the key down.
- [X] **2.3 Typing the code.** The cursor starts in box 1. Typing all 6 digits
      submits on its own. Pasting a 6-digit code fills all boxes.
- [X] **2.4 Wrong code.** Enter a wrong code → an error shows, the boxes clear
      and the cursor goes back to box 1. The right code still works after.
- [X] **2.5 Too many wrong codes.** Enter 5 wrong codes → the code stops
      working and you're asked to request a new one.
- [X] **2.6 Resend.** "Resend" is disabled with a countdown for 45 seconds,
      then sends a new code. The old code no longer works.
- [X] **2.7 Code limit.** Request more than 5 codes for one email within an
      hour → you're told to wait.
- [X] **2.8 Expired code.** Wait more than 10 minutes, then enter the code →
      it's refused as expired.
- [X] **2.9 Email that already has a vault.** Sign up with an email that's
      already registered → the screen looks exactly like 2.1 ("check your
      email"), but the terminal shows a **"You already have a OneVault
      vault"** email instead of a code.
- [x] **2.10 Invalid email.** `abc`, `a@b` or empty → a field error, nothing
      is sent.
- [x] **2.11 Password rules.** Fewer than 10 characters, or a confirmation
      that doesn't match → field errors. The strength bar and checklist
      update as you type.
- [x] **2.12 "Change" email.** On the password step, **Change** takes you back
      to the email step.
- [ ] **2.13 Terms line.** Under **Create encrypted vault**: "By creating a
      vault, you agree to the Terms of Service and Privacy Policy". Both links
      open in a new tab, and the sign-up tab stays on the password step.

## 3. Sign-in

- [X] **3.1 Happy path.** Sign out, then sign in at `/login` → the vault
      opens with your items.
- [X] **3.2 Wrong password.** → "Invalid email or master password."
- [X] **3.3 Unknown email.** An email with no vault → the **same** message as
      3.2 (the app must not reveal which emails have accounts).
- [X] **3.4 Lockout.** 5 wrong passwords for one account → "Too many failed
      attempts. Try again in N minutes." The right password is refused until
      then. Restart the server to clear it.
- [X] **3.5 "Forgot it?"** link opens `/recover`.

## 4. Session, lock and sign-out

- [X] **4.1 Reload.** Reload while signed in → the **Unlock your vault**
      screen shows (signed in as your email). The right password opens the
      vault; a wrong one shows an error.
- [X] **4.2 Lock button.** Click **Lock** → the unlock screen shows. Items are
      not visible until you unlock.
- [X] **4.3 Auto-lock.** Settings → Security → Auto-lock **1 minute**. Leave
      the app untouched for a minute → it locks. Moving the mouse resets the
      timer. "Never" never locks.
- [X] **4.4 Sign out.** Account menu (bottom left) → **Sign out** → you land
      on `/login`. Going to `/app` sends you back to sign-in.
- [X] **4.5 "Not you? Sign out"** on the unlock screen signs you out.

## 5. Items

- [] **5.1 New login.** **New** → login. Fill title, username, website,
      password, notes, tags. Save → it appears in the list and opens in the
      detail panel with every field shown.
- [] **5.2 New secure note.** Same for a note. It shows under **Secure
      notes**, not **Logins**.
- [] **5.3 Edit.** Change fields, save → the changes show and survive a
      reload + unlock.
- [] **5.4 Cancel.** Edit, change something, Cancel → nothing changed.
- [] **5.5 Delete and undo.** Delete an item → it disappears and a toast
      offers **Undo**. Undo → it's back. Delete again and let the toast close
      → it's gone after a reload too.
- [] **5.6 Favorite.** Star an item → it shows under **Favorites**; unstar →
      it leaves.
- [] **5.7 Tags.** Add tags to a few items. Filtering by a tag shows only
      those items.
- [] **5.8 Search.** Search by title, username, website, notes and tag →
      the right items show. A search with no matches shows an empty state.
- [] **5.9 Counts.** The sidebar counts (All items, Logins, Secure notes,
      Favorites) match what you have.
- [] **5.10 Custom fields.** Add text and hidden custom fields → they save,
      show, and hidden ones are masked until revealed.
- [] **5.11 Copy.** Copy a username/password → it's on the clipboard.
- [] **5.12 Clipboard clear.** Settings → Clear clipboard **15 seconds**.
      Copy a password, wait 15 seconds, paste somewhere → empty. (Browsers
      may block clipboard reads; if so this can't clear it.)
- [] **5.13 One-time codes (TOTP).** Add the secret `JBSWY3DPEHPK3PXP` to a
      login → a 6-digit code with a countdown shows. Add the same secret to
      an authenticator app (Google Authenticator, Authy…) → both show the
      same code. An invalid secret shows an error, not a crash.
- [] **5.14 Empty vault.** A new account shows "Nothing here yet" with a
      button to add the first item.

## 6. Password generator

- [ ] **6.1** Open **Password generator** from the sidebar. Length slider
      (8–64) and each toggle change the result.
- [ ] **6.2** Turning off every character type still produces a password.
- [ ] **6.3** "Avoid look-alikes" → no `0 O 1 l I |` in the result.
- [ ] **6.4** Copy works. **Generate** in the login form uses your generator
      settings.

## 7. Import, export and erase

Settings → **Data**.

- [ ] **7.1 Export.** **Download** → a JSON file with every item in plain
      text. (Treat it as sensitive; delete it after testing.)
- [ ] **7.2 Round trip.** Erase all (7.5), then import the JSON from 7.1 →
      every item is back with the same fields.
- [ ] **7.3 CSV imports.** Import a CSV export from 1Password, Bitwarden,
      LastPass and Chrome (make small sample files if you don't have real
      ones) → logins arrive with title, username, password and website.
- [ ] **7.4 Bad file.** Import an empty or unrelated file → a clear error,
      nothing imported.
- [ ] **7.5 Erase all.** **Erase all** → you must type `ERASE ALL` → every
      item is deleted. The button is disabled when the vault is empty.
- [ ] **7.6 Stats.** The counts at the top of the Data tab match your items.

## 8. Recovery kit (Settings → Security)

- [ ] **8.1** "Recovery key active" shows the date it was made.
- [ ] **8.2 New kit.** **Create new kit** → master password → a new key
      shows. Write it down.
- [ ] **8.3 Old key stops working.** Use the **previous** key in a recovery
      (section 10) → refused. The new key works.
- [ ] **8.4** A wrong master password in the dialog → an error, no new kit.

## 9. Change master password (Settings → Security)

- [ ] **9.1 Happy path.** Current + new password → success toast and a new
      recovery kit dialog. Items are all still there and readable.
- [ ] **9.2** Sign out and in: the **old** password fails, the **new** one
      works.
- [ ] **9.3** Wrong current password → an error, nothing changes.
- [ ] **9.4** Email: "Your OneVault master password was changed".
- [ ] **9.5** The **old** recovery key stops working; the new one works.
- [ ] **9.6 Other devices.** Before changing, sign in on a second device
      (trusted). After the change, Settings → Trusted devices shows only this
      browser. The second device is added back the next time you unlock on
      it with the new password.

## 10. Forgot password: recovery key

Use a browser that is **not** trusted for the account (an Incognito window,
or sign in there with "Trust this device" off), so you get the recovery key
screen.

- [ ] **10.1 Happy path.** `/recover` → email → code → **Enter your recovery
      key** → key + new password → the vault opens with **all items kept**,
      and a new recovery kit dialog shows.
- [ ] **10.2** Email: "Your OneVault vault was recovered".
- [ ] **10.3** The old password fails; the new one works. The old recovery
      key fails; the new one works.
- [ ] **10.4 Other sessions signed out.** If the account was open on another
      device, it's signed out after the recovery.
- [ ] **10.5 Forgiving input.** The key works in lowercase, without dashes,
      without the `OV-` prefix, and with `O`/`I`/`L` typed instead of
      `0`/`1`.
- [ ] **10.6 Wrong key.** A real-looking but wrong key → "That recovery key
      doesn't match this email." 5 wrong keys → locked out for a while.
- [ ] **10.7 Not a key.** `hello` → "That doesn't look like a recovery key…"
- [ ] **10.8 Unknown email.** An email with no vault → the same "check your
      email" screen, but **no email** in the terminal.
- [ ] **10.9 Code alone isn't enough.** Getting the code without the key
      doesn't open the vault.

## 11. Forgot password: trusted device

- [ ] **11.1** On a browser where you signed in with "Trust this device" on:
      `/recover` → email → code → **Recover on this device** shows, with "This
      browser is a trusted device".
- [ ] **11.2** New password → the vault opens with **all items kept**, no
      recovery key needed, and a new recovery kit dialog shows.
- [ ] **11.3** Email: "Your OneVault vault was recovered" (mentions a
      trusted device).
- [ ] **11.4** "Use my recovery key instead" switches to the key screen;
      "Recover on this device instead" switches back.
- [ ] **11.5 Untrusted browser.** In Incognito, the same flow goes straight
      to the recovery key screen (no device option).
- [ ] **11.6 Removed device.** Remove this browser in Settings → Trusted
      devices, then try 11.1 → you get the recovery key screen.

## 12. Start a new vault and restore locked items

Use a browser that is **not** trusted, and pretend you've lost the recovery
key.

- [ ] **12.1** `/recover` → email → code → **I don't have my recovery key** →
      the **Start a new vault** screen explains items stay locked, not
      deleted.
- [ ] **12.2** New password → an empty vault opens, a toast says "N items
      are locked, not deleted", and a new recovery kit dialog shows.
- [ ] **12.3** Email: "Your OneVault vault was reset", saying items were
      locked, not deleted.
- [ ] **12.4** Settings → Security shows **Locked items** at the top: "N
      items from your old vault".
- [ ] **12.5 Restore with old password.** **Restore** → Old password →
      a wrong one shows "That isn't the master password this vault had";
      the right one restores every item into the current vault.
- [ ] **12.6 Restore with old recovery key.** Repeat 12.1–12.2 on a new test
      account, then restore with **Old recovery key**.
- [ ] **12.7 Restore with this browser.** Do the reset on a browser that was
      trusted before → the restore dialog offers **This browser** and it
      works with no typing.
- [ ] **12.8** Restored items are readable and editable, and survive a
      reload + unlock with the **new** password.
- [ ] **12.9 Delete for good.** The bin icon → "Delete N items for good?" →
      the section disappears and can't be restored.
- [ ] **12.10** With no locked items, the section isn't shown at all.
- [ ] **12.11 "I found my recovery key"** on the Start a new vault screen goes
      back to the key screen.

## 13. "Trust this device" and trusted devices

- [ ] **13.1** The checkbox shows (checked) on sign-in, the sign-up password
      step, the recovery key step and the Start a new vault step.
- [ ] **13.2 Sign in trusted.** Settings → Trusted devices lists this browser
      with a **This browser** badge, added and last-unlocked dates.
- [ ] **13.3 Sign in untrusted.** Sign out, sign in with it unchecked → this
      browser disappears from the list and "This browser isn't trusted"
      shows. Reload + unlock → still not trusted.
- [ ] **13.4 Trust again.** **Trust this browser** → master password → it's
      back in the list. A wrong password shows an error.
- [ ] **13.5 Remove another device.** With two trusted devices, remove the
      other one from this browser → it's gone from the list, and that device
      can no longer use 11.1 (it gets the key screen).
- [ ] **13.6 Remove this browser.** Remove → confirm "Stop trusting this
      browser?" → "This browser isn't trusted" shows. Unlocking later doesn't
      trust it again.
- [ ] **13.7 Public computer.** In Incognito, sign in with it unchecked →
      no new device appears in the list on your main browser.

## 14. Real emails with Resend

Put `RESEND_API_KEY` back in `.env` and restart.

- [ ] **14.1 Your own inbox.** Sign up with the email of your Resend account
      → the code arrives. Check it looks right in Gmail/Outlook (and in the
      phone app).
- [ ] **14.2 Test inbox.** Sign up with `delivered@resend.dev` → the app says
      the code was sent; the email appears in the Resend dashboard (Emails).
- [ ] **14.3 Bounce.** `bounced@resend.dev` → the app still says "sent";
      the bounce shows only in the dashboard.
- [ ] **14.4 Rejected address.** With the key set, `test@example.com` →
      "We couldn't send the email right now."
- [ ] **14.5 Links.** Links in emails (sign in, recover) point at `APP_URL`.
- [ ] **14.6** After verifying your domain and setting `EMAIL_FROM`, emails
      arrive from your address and reach other people's inboxes, not spam.

## 15. Security spot checks (browser DevTools)

- [ ] **15.1 Network.** DevTools → Network while signing in and saving items.
      No request contains your master password, recovery key or item
      contents in plain text, only `authKey` hashes and `encryptedData`.
- [ ] **15.2 Cookie.** Application → Cookies: `vault_session` is
      **HttpOnly**.
- [ ] **15.3 Device key.** Application → IndexedDB → `onevault-device`: the
      keys show as CryptoKey objects marked not extractable.
- [ ] **15.4 Database.** Open `vault.db` with a SQLite viewer (DB Browser for
      SQLite). `vault_items.encrypted_data` is unreadable ciphertext, and
      no table holds a password, recovery key or item contents.
- [ ] **15.5 Locked out of other accounts.** Copying another account's item
      id into a request doesn't return or change its data.

## 16. Look and feel

- [ ] **16.1** Every screen in light and dark mode: readable text, no
      invisible buttons.
- [ ] **16.2** Every screen at phone width (~375px): the sidebar opens from
      the menu button, dialogs fit, nothing is cut off.
- [ ] **16.3 Keyboard only.** Tab through sign-in, sign-up, the vault and
      dialogs: focus is visible, Enter submits, Escape closes dialogs.
- [ ] **16.4** Error messages are clear and say what to do next.

## 17. Production build

- [ ] **17.1** `npm run build` finishes without errors.
- [ ] **17.2** `node dist/server/index.mjs`, then repeat 2.1, 3.1 and 5.1
      against the built server.

## 18. Delete account (Settings → Account)

Use a throwaway test account.

- [ ] **18.1** The Account tab shows a **Danger zone** with **Delete
      account**.
- [ ] **18.2 Dialog.** It offers **Download backup** (when you have items),
      asks for the master password and for `DELETE` to be typed. **Delete
      account forever** stays disabled until both are filled.
- [ ] **18.3 Wrong password.** → "Master password is incorrect." Nothing is
      deleted; you're still signed in.
- [ ] **18.4 Happy path.** Right password + `DELETE` → you land on the home
      page, signed out, with "Your account was deleted".
- [ ] **18.5 Email.** "Your OneVault account was deleted".
- [ ] **18.6 Really gone.** Signing in with that email fails with the normal
      "Invalid email or master password". Signing up with it again works
      like a new email.
- [ ] **18.7 Other devices.** If the account was open on a second device, it
      can no longer load anything there and is sent to sign-in.
- [ ] **18.8 Database.** No rows for that account remain in `users`,
      `vault_items`, `sessions`, `trusted_devices`, `locked_vaults` or
      `email_verifications`.

## 19. Error pages

- [ ] **19.1 Website 404.** Open `/does-not-exist` → "This page isn't in the
      vault" with the keyhole and stickers. **Back to home** works; the
      second button says **Sign in** (signed out) or **Open your vault**
      (signed in).
- [ ] **19.2 App 404.** Signed in and unlocked, open `/app/does-not-exist` →
      "Page not found" inside the app, with the sidebar still there. **Go to
      all items** and **Open settings** work.
- [ ] **19.3 Status code.** In DevTools → Network, the 404 pages return HTTP
      status **404**.
- [ ] **19.4 500 pages.** These only show when something crashes. In
      development they include an **Error details** box; in a production
      build (17.2) that box never shows.

## 20. Privacy and Terms

- [ ] **20.1** `/privacy` and `/terms` load, with the site header and footer.
- [ ] **20.2** The **On this page** links jump to each section; on a wide
      screen the list stays beside the text as you scroll.
- [ ] **20.3** Footer → **Legal** → Privacy / Terms work from any page.
- [ ] **20.4** Header links (How it works, Features…) on these pages take you
      to that section of the home page.
- [ ] **20.5** Placeholders in `[brackets]` are replaced with real details
      (in `src/features/website/legal/legal-info.ts`) before launch.

---

## Known behaviour (not bugs)

- Changing the master password, recovering or starting a new vault removes
  other trusted devices. They're trusted again the next time you unlock on
  them (if "Trust this device" was on there).
- Clearing a browser's site data removes its trust.
- Unchecking "Trust this device" while starting a new vault means that
  browser can't restore the locked items; use the old password or key.
- Lockouts and code limits reset when the server restarts.

## Reporting a problem

Note the test number, what you did, what you expected and what happened.
A screenshot and the terminal output help. Never paste real master
passwords or recovery keys into a bug report.
