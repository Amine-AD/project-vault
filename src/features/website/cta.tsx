import { Link } from '@tanstack/react-router'
import { LogoMarkStacked } from '#/components/BrandLogo'
import { useVault } from '#/context/VaultContext'
import { WhitePillButton } from './components/pill-link'
import { Sticker } from './components/sticker'

/**
 * Final CTA banner, laid out after Ondeck's "Final CTA" section: copy on the
 * left, the tilted brand mark with its stickers on the right.
 */
export function Cta() {
  const { user } = useVault()

  return (
    <section className="flex flex-col items-center px-6 pt-2 pb-16 md:px-8 md:pt-4 md:pb-20 min-[1200px]:px-10">
      <div className="grid w-full max-w-[1248px] items-center gap-12 overflow-hidden rounded-[32px] bg-primary px-7 py-12 md:grid-cols-[1fr_auto] md:gap-8 md:px-12 md:py-14 min-[1200px]:px-20 min-[1200px]:py-20">
        <div className="flex max-w-[640px] flex-col items-start gap-8">
          <div className="flex flex-col items-start gap-5">
            <h2 className="text-balance font-display font-bold text-[38px] text-white leading-[46px] tracking-[-0.03em] md:text-[42px] md:leading-[50px] min-[1200px]:text-[48px] min-[1200px]:leading-[58px]">
              Your vault could be ready in under a minute
            </h2>
            <p className="max-w-[560px] text-pretty text-white/85 text-xl leading-[30px] tracking-[-0.02em]">
              Pick a master password and bring your logins over. Everything is
              encrypted before it leaves your browser.
            </p>
          </div>

          <WhitePillButton>
            <Link to={user ? '/app' : '/sign-up'}>
              {user ? 'Open your vault' : 'Create your vault'}
            </Link>
          </WhitePillButton>
        </div>

        <CtaMark />
      </div>
    </section>
  )
}

/**
 * Big tilted brand mark, like Ondeck's stacked cards: a lime disc behind a
 * white disc with the OneVault keyhole, with security tags stuck around it.
 */
function CtaMark() {
  return (
    <div className="flex justify-center py-6 md:px-16 md:py-4">
      <div
        aria-hidden
        className="relative h-[172px] w-[180px] md:h-[192px] md:w-[200px] min-[1200px]:h-[240px] min-[1200px]:w-[250px]"
      >
        <LogoMarkStacked
          back="#d4f34a"
          className="size-full -rotate-6"
          disc="#ffffff"
          keyhole="var(--primary)"
        />
        <Sticker
          className="-top-6 -right-12 size-[84px] md:size-[96px] min-[1200px]:size-[104px]"
          color="lime"
          shape="round"
          tilt={8}
        >
          AES
          <br />
          256
        </Sticker>
        <Sticker className="-bottom-3 -right-14" color="paper" tilt={-5}>
          Auto-locks
        </Sticker>
        <Sticker className="bottom-8 -left-16" color="ink" tilt={4}>
          Unlimited items
        </Sticker>
      </div>
    </div>
  )
}
