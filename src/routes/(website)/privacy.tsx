import { createFileRoute } from '@tanstack/react-router'
import { LEGAL } from '#/features/website/legal/legal-info'
import {
  LegalList,
  LegalPage,
  type LegalSection,
} from '#/features/website/legal/legal-page'

export const Route = createFileRoute('/(website)/privacy')({
  head: () => ({ meta: [{ title: 'Privacy Policy · OneVault' }] }),
  component: PrivacyPage,
})

const mail = (address: string) => <a href={`mailto:${address}`}>{address}</a>

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    content: (
      <>
        <p>
          The hosted OneVault service is run by {LEGAL.operator}, based in{' '}
          {LEGAL.country} (“we”, “us”). We are responsible for the personal data
          described in this policy.
        </p>
        <p>
          OneVault is also open-source software that anyone can run on their own
          server. This policy only covers the service we host. If you use a copy
          run by someone else, that person or organization is responsible for
          your data; see section 13.
        </p>
      </>
    ),
  },
  {
    id: 'short-version',
    title: 'The short version',
    content: (
      <LegalList
        items={[
          <>
            Your vault is encrypted in your browser before it reaches us. We{' '}
            <strong>can’t read your passwords, notes or other items</strong>,
            and we never receive your master password or recovery key.
          </>,
          'We collect only what we need to run your account: your email address and the data needed to sign you in and keep your vault in sync.',
          'No ads, no analytics, no tracking cookies, and we never sell your data.',
          'You can export your vault at any time.',
        ]}
      />
    ),
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    content: (
      <>
        <LegalList
          items={[
            <>
              <strong>Account details:</strong> your email address, and when
              your account was created and last changed.
            </>,
            <>
              <strong>Sign-in data:</strong> a random salt and a hash of a key
              your browser derives from your master password. It lets us check
              your sign-in but can’t be turned back into your password.
            </>,
            <>
              <strong>Your encrypted vault:</strong> your items as encrypted
              data, plus when each was created and changed. We can’t decrypt
              them.
            </>,
            <>
              <strong>Recovery data:</strong> a copy of your vault key locked
              with your recovery key, and a hash that lets us check the key. We
              can’t use either without your recovery key.
            </>,
            <>
              <strong>Trusted devices:</strong> for each browser you trust, a
              short name like “Chrome on Windows”, when it was added and last
              used, and a vault key locked with a key that never leaves that
              browser.
            </>,
            <>
              <strong>Locked items:</strong> if you start a new vault without
              your recovery key, your old items are kept, still encrypted, until
              you restore or delete them.
            </>,
            <>
              <strong>Sessions:</strong> a random sign-in token, stored in a
              cookie, that expires after 7 days.
            </>,
            <>
              <strong>Email codes:</strong> one-time codes for sign-up and
              recovery, stored only as hashes and deleted within 24 hours.
            </>,
            <>
              <strong>IP addresses:</strong> used briefly, in memory, to limit
              repeated sign-in attempts and code requests. We don’t log them.
            </>,
            <>
              <strong>Billing:</strong> if you subscribe,{' '}
              {LEGAL.paymentProvider} processes your payment. We receive your
              plan, payment status and country, never your full card number.
            </>,
            <>
              <strong>Support messages:</strong> anything you choose to send us
              by email.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'what-we-cant-see',
    title: 'What we can’t see',
    content: (
      <>
        <p>
          Because of how OneVault is built, we don’t have, and can’t get, your
          master password, your recovery key, or the contents of your items:
          their titles, usernames, passwords, websites, notes, tags or custom
          fields.
        </p>
        <p>
          This also means we <strong>can’t recover your vault</strong> if you
          lose both your master password and your recovery key, and can’t hand
          its contents to anyone who asks, including authorities.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use your data',
    content: (
      <>
        <LegalList
          items={[
            'To create your account, sign you in and keep your vault in sync.',
            'To send emails you need: verification codes, and security alerts when your master password is changed, your vault is recovered or a new vault is started.',
            'To protect the service: limiting repeated attempts and preventing abuse.',
            'To bill your subscription, if you have one.',
            'To answer your support requests.',
          ]}
        />
        <p>
          We don’t send marketing emails without asking first, and we don’t use
          your data for advertising or to train AI models.
        </p>
        <p>
          Where laws like the EU GDPR apply, we rely on the contract with you
          (to provide the service), our legitimate interest (to keep it secure)
          and legal obligations (such as keeping billing records).
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    content: (
      <>
        <p>We use one cookie, and it’s required for signing in:</p>
        <LegalList
          items={[
            <>
              <strong>vault_session</strong>: keeps you signed in for up to 7
              days. It can’t be read by scripts on the page.
            </>,
          ]}
        />
        <p>
          Your browser also stores, on your device only: your theme, auto-lock
          and clipboard settings, and, if you trust the browser, its device key.
          We use no analytics, advertising or third-party tracking cookies.
        </p>
      </>
    ),
  },
  {
    id: 'service-providers',
    title: 'Who we share data with',
    content: (
      <>
        <p>
          We never sell your data. We use a few providers to run the service,
          who may process data only on our instructions:
        </p>
        <LegalList
          items={[
            <>
              <strong>{LEGAL.hostingProvider}</strong>: hosts our servers and
              database in {LEGAL.hostingRegion}.
            </>,
            <>
              <strong>Resend</strong>: sends our emails, so it receives your
              email address and the email’s content (codes and alerts, never
              vault data).
            </>,
            <>
              <strong>{LEGAL.paymentProvider}</strong>: handles subscriptions,
              payments and taxes.
            </>,
          ]}
        />
        <p>
          We may share data if the law requires it. Even then, your vault stays
          encrypted and we can’t decrypt it.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    content: (
      <LegalList
        items={[
          'Account and vault data: while your account exists.',
          'Locked items: until you restore or delete them, or delete your account.',
          'Email codes: up to 24 hours. Sessions: up to 7 days.',
          'After you delete your account: removed from our systems within 30 days, and from backups within a further [30] days.',
          'Billing records: as long as tax law requires.',
        ]}
      />
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    content: (
      <>
        <p>Depending on where you live, you can ask us to:</p>
        <LegalList
          items={[
            'Give you a copy of your data. You can also export your vault yourself from Settings → Data.',
            'Correct your data.',
            'Delete your account and data. You can also do this yourself, right away, from Settings → Account → Delete account.',
            'Restrict or object to how we use it.',
          ]}
        />
        <p>
          Email {mail(LEGAL.privacyEmail)} from your account’s address and we’ll
          reply within 30 days. You can also complain to your local data
          protection authority.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <p>
        Your vault is encrypted with AES-256-GCM using a key derived from your
        master password (PBKDF2, 600,000 rounds) in your browser. Traffic is
        encrypted in transit, sign-in attempts are rate-limited, and the code is
        open source so anyone can check how it works. No system is perfectly
        secure; if you find a vulnerability, please report it to{' '}
        {mail(LEGAL.contactEmail)}.
      </p>
    ),
  },
  {
    id: 'international',
    title: 'International transfers',
    content: (
      <p>
        Our servers are in {LEGAL.hostingRegion}. If a provider processes data
        outside your country, we use safeguards required by law, such as the EU
        Standard Contractual Clauses.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    content: (
      <p>
        OneVault isn’t meant for anyone under {LEGAL.minimumAge}. If you believe
        a child has given us data, contact us and we’ll delete it.
      </p>
    ),
  },
  {
    id: 'self-hosted',
    title: 'Self-hosted copies',
    content: (
      <p>
        If you run OneVault on your own server, your data stays with you and we
        receive none of it. If you run it for others, you’re responsible for
        their data and for having your own privacy policy.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    content: (
      <p>
        If we make important changes, we’ll email you before they take effect.
        The date at the top shows when this policy last changed.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <p>
        Questions about privacy: {mail(LEGAL.privacyEmail)}
        <br />
        {LEGAL.operator}, {LEGAL.address}
      </p>
    ),
  },
]

function PrivacyPage() {
  return (
    <LegalPage
      intro={
        <p>
          OneVault is built so we can’t read your vault. This policy explains
          the little we do collect, why, and what you can do about it.
        </p>
      }
      otherPage={{ to: '/terms', label: 'Terms of Service' }}
      sections={SECTIONS}
      title="Privacy Policy"
    />
  )
}
