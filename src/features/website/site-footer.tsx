import { Link } from '@tanstack/react-router'
import { ArrowUpIcon } from 'lucide-react'
import { BrandWordmark } from '#/components/BrandLogo'
import { useVault } from '#/context/VaultContext'
import { WhitePillButton } from './components/pill-link'
import { Sticker } from './components/sticker'

type FooterLink =
  | { label: string; href: string }
  | { label: string; to: '/login' | '/sign-up' | '/app' }

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
      { label: 'Self-host', href: '#self-host' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Vault',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create a vault', to: '/sign-up' },
      { label: 'Open the app', to: '/app' },
    ],
  },
]

const LINK_CLASS =
  'text-[#ecebe6] text-lg leading-7 tracking-[-0.02em] transition-colors duration-200 hover:text-brand-lime'

/**
 * Footer laid out after Ondeck's: always dark, a "say hi" block with a status
 * pill, link columns, a giant wordmark with stickers and a copyright row.
 */
export function SiteFooter() {
  const { user } = useVault()

  return (
    <footer className="flex w-full flex-col items-center bg-brand-ink [--sticker-line:#f2f0ea] px-6 pt-20 pb-10 text-white md:px-10 md:pt-[100px]">
      <div className="flex w-full max-w-[1248px] flex-col items-start gap-16 md:gap-20">
        {/* Top: say hi + links */}
        <div className="flex w-full flex-col items-start gap-16 min-[1200px]:flex-row min-[1200px]:justify-between min-[1200px]:gap-0">
          <div className="flex w-full flex-col items-start gap-7 min-[1200px]:max-w-[520px] min-[1200px]:flex-1 min-[1200px]:pe-12">
            <div className="flex items-center gap-2.5 rounded-full border border-[#2c2c2f] bg-[#1c1c1e] px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-brand-lime shadow-[0_0_0_4px_rgba(212,243,74,0.18)]" />
              <span className="text-[#ecebe6] text-base leading-6 tracking-[-0.02em]">
                Zero-knowledge by design
              </span>
            </div>

            <h2 className="text-balance font-display font-bold text-[38px] leading-[46px] tracking-[-0.03em] md:text-[42px] md:leading-[50px] min-[1200px]:text-[48px] min-[1200px]:leading-[58px]">
              Got something worth keeping safe?
            </h2>

            <div className="flex flex-col items-start gap-5">
              <Link
                className="border-brand-lime border-b-[3px] pb-1 font-display font-semibold text-2xl leading-8 tracking-[-0.02em]"
                to="/login"
              >
                Sign in to your vault
              </Link>
              <WhitePillButton>
                <Link to={user ? '/app' : '/sign-up'}>
                  {user ? 'Open your vault' : 'Create your vault'}
                </Link>
              </WhitePillButton>
            </div>
          </div>

          <nav className="flex gap-[72px] pt-2">
            {COLUMNS.map((col) => (
              <div className="flex flex-col items-start gap-4" key={col.title}>
                <p className="text-[#a3a09a] text-base leading-6 tracking-[-0.02em]">
                  {col.title}
                </p>
                {col.links.map((link) =>
                  'href' in link ? (
                    <a className={LINK_CLASS} href={link.href} key={link.label}>
                      {link.label}
                    </a>
                  ) : (
                    <Link className={LINK_CLASS} key={link.label} to={link.to}>
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Giant wordmark */}
        <div className="@container relative w-full">
          <BrandWordmark className="-mb-[0.26em] flex w-fit text-[25.5cqw] text-white tracking-[-0.04em]" />
          <Sticker
            className="top-[5cqw] left-[38%] md:px-4 md:py-2.5 md:text-sm"
            color="lime"
            tilt={-6}
          >
            See you inside
          </Sticker>
          <ScrollSeal />
        </div>

        {/* Bottom */}
        <div className="-mt-6 flex w-full flex-wrap items-start justify-between gap-2 border-[#2c2c2f] border-t pt-6 md:-mt-10 text-[#a3a09a] text-sm leading-[18px] tracking-[-0.02em]">
          <p>
            © {new Date().getFullYear()} OneVault. Encrypted with too many
            rounds.
          </p>
          <p>Your master password never leaves your browser.</p>
        </div>
      </div>
    </footer>
  )
}

const SEAL_TEXT = 'Thanks for scrolling ✦ Back to top ✦ '

/**
 * Round lime seal whose text ring slowly spins around an arrow; clicking it
 * scrolls back to the top. Same outline and hard shadow as the stickers.
 */
function ScrollSeal() {
  return (
    <button
      aria-label="Back to top"
      className="group absolute -top-14 right-0 z-10 flex size-[124px] items-center justify-center rounded-full border-2 border-sticker-line bg-brand-lime text-brand-ink shadow-[4px_4px_0_0_var(--sticker-line)] transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--sticker-line)] md:-top-20 md:right-4 md:size-[168px]"
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 size-full animate-seal motion-reduce:animate-none"
        viewBox="0 0 200 200"
      >
        <defs>
          <path
            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
            id="seal-ring"
          />
        </defs>
        <text
          className="fill-current font-mono font-semibold uppercase"
          fontSize="17"
          letterSpacing="1"
        >
          <textPath href="#seal-ring" lengthAdjust="spacing" textLength="462">
            {SEAL_TEXT}
          </textPath>
        </text>
      </svg>
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-ink text-brand-lime transition-transform group-hover:-translate-y-1 md:size-16">
        <ArrowUpIcon className="size-5 md:size-7" />
      </span>
    </button>
  )
}
