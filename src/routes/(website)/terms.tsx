import { createFileRoute, Link } from '@tanstack/react-router'
import { LEGAL } from '#/features/website/legal/legal-info'
import {
  LegalList,
  LegalPage,
  type LegalSection,
} from '#/features/website/legal/legal-page'

export const Route = createFileRoute('/(website)/terms')({
  head: () => ({ meta: [{ title: 'Terms of Service · OneVault' }] }),
  component: TermsPage,
})

const mail = (address: string) => <a href={`mailto:${address}`}>{address}</a>

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    content: (
      <p>
        These terms are an agreement between you and {LEGAL.operator} (“we”,
        “us”) for using the OneVault service we host. By creating an account,
        you agree to them. If you don’t agree, don’t use the hosted service.
      </p>
    ),
  },
  {
    id: 'software-and-service',
    title: 'The software and the service',
    content: (
      <>
        <p>
          OneVault’s code is open source under the {LEGAL.license} license. You
          can run it yourself for free, under that license. These terms don’t
          apply to copies you or others run.
        </p>
        <p>
          These terms cover our hosted service: the servers, storage, email and
          updates we run so you don’t have to.
        </p>
      </>
    ),
  },
  {
    id: 'your-account',
    title: 'Your account',
    content: (
      <LegalList
        items={[
          `You must be at least ${LEGAL.minimumAge} years old.`,
          'Use an email address you control. We use it for codes and security alerts.',
          'An account is for one person. Don’t share it.',
          'You’re responsible for what happens in your account and for keeping your devices secure.',
        ]}
      />
    ),
  },
  {
    id: 'master-password',
    title: 'Your master password and recovery key',
    content: (
      <>
        <p>
          OneVault is zero-knowledge: your vault is encrypted with your master
          password in your browser, and we never have it.{' '}
          <strong>
            We can’t reset your master password or decrypt your vault for you.
          </strong>
        </p>
        <LegalList
          items={[
            'Keep your recovery kit somewhere safe and offline. Together with access to your email, it lets you set a new master password.',
            'A trusted device can also recover your vault. Only trust devices you own.',
            'If you lose your master password, your recovery key and every trusted device, nobody can open your items. You can start a new vault; the old items stay locked until you find the old password or key.',
          ]}
        />
        <p>
          We aren’t responsible for data you can’t access because these were
          lost. We recommend keeping your own backup using the export in
          Settings → Data.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    content: (
      <>
        <p>Don’t use the service to:</p>
        <LegalList
          items={[
            'Break the law or store content you have no right to store.',
            'Attack, overload or try to break into the service or other accounts.',
            'Get around rate limits, plan limits or security measures.',
            'Resell the hosted service without our written permission.',
          ]}
        />
        <p>
          Because your vault is encrypted, we can’t see what you store. These
          rules still apply to it.
        </p>
      </>
    ),
  },
  {
    id: 'plans-and-payment',
    title: 'Plans and payment',
    content: (
      <LegalList
        items={[
          'Self-hosting is free. The hosted service may need a paid subscription; current plans and prices are shown on our website.',
          <>
            Payments are handled by {LEGAL.paymentProvider}, which may act as
            the seller and handle taxes.
          </>,
          'Subscriptions renew automatically each month or year until you cancel. You can cancel anytime; you keep access until the end of the period you paid for.',
          `If you’re not happy, ask for a refund within ${LEGAL.refundDays} days of your first payment and we’ll refund it.`,
          'We’ll tell you at least 30 days before a price change affects you.',
          'If a payment fails, we may limit your account after telling you. You can still export your vault.',
        ]}
      />
    ),
  },
  {
    id: 'your-data',
    title: 'Your data',
    content: (
      <>
        <p>
          Your vault is yours. You give us only the rights needed to store, sync
          and back it up for you. You can export it at any time.
        </p>
        <p>
          How we handle personal data is explained in our{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    content: (
      <p>
        We work to keep the service running, but we can’t promise it will always
        be available or free of errors. We may change or improve features. If we
        ever plan to shut the hosted service down, we’ll give you at least 60
        days’ notice so you can export your vault or move to a self-hosted copy.
      </p>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your account',
    content: (
      <>
        <p>
          You can stop using the service at any time. To delete your account and
          everything in it, go to Settings → Account → Delete account, or email{' '}
          {mail(LEGAL.contactEmail)}. If you have a subscription, cancel it with{' '}
          {LEGAL.paymentProvider} as well.
        </p>
        <p>
          We may suspend or close accounts that seriously or repeatedly break
          these terms, after warning you where we reasonably can. When an
          account is closed, its data is deleted as described in the Privacy
          Policy.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    content: (
      <p>
        The service is provided “as is” and “as available”. To the extent the
        law allows, we give no warranties beyond those in these terms, including
        warranties that it will meet your needs or never lose data. Some places
        don’t allow these exclusions, so they may not all apply to you.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    content: (
      <p>
        To the extent the law allows, we aren’t liable for indirect or
        consequential losses, such as lost profits or data, and our total
        liability is limited to what you paid us in the 12 months before the
        claim. Nothing in these terms limits liability that can’t be limited by
        law.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    content: (
      <p>
        These terms are governed by the laws of {LEGAL.governingLaw}. If you’re
        a consumer, you also keep any protections the law of your home country
        gives you.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    content: (
      <p>
        We may update these terms. For important changes we’ll email you at
        least 30 days before they apply. If you keep using the service after
        that, the new terms apply; if you don’t agree, you can cancel and export
        your vault.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <p>
        Questions about these terms: {mail(LEGAL.contactEmail)}
        <br />
        {LEGAL.operator}, {LEGAL.address}
      </p>
    ),
  },
]

function TermsPage() {
  return (
    <LegalPage
      intro={
        <p>
          The rules for using the OneVault service we host, in plain language.
          The open-source code itself is covered by its license.
        </p>
      }
      otherPage={{ to: '/privacy', label: 'Privacy Policy' }}
      sections={SECTIONS}
      title="Terms of Service"
    />
  )
}
