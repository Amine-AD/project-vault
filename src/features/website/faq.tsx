import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import { SectionHeading } from './components/section-heading'

const QUESTIONS = [
  {
    q: 'What does zero-knowledge mean?',
    a: 'Your master password never leaves your browser. It derives the key that encrypts your items, and the server only ever stores the encrypted result. Without your master password, the data is unreadable — to us, your host, or anyone with a copy of the database.',
  },
  {
    q: 'What happens if I forget my master password?',
    a: "It can't be recovered or reset — that's the trade-off of zero-knowledge. Keep a JSON export somewhere safe as a backup.",
  },
  {
    q: 'Can I import from 1Password or Bitwarden?',
    a: 'Yes. Export a CSV from 1Password, Bitwarden, LastPass or Chrome and import it from Settings → Data. Everything is encrypted during import.',
  },
  {
    q: 'Does it do two-factor codes?',
    a: 'Yes. Paste a site’s 2FA setup key into a login and OneVault shows the live 6-digit code with a countdown.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In a single SQLite file on whatever machine runs OneVault. It only contains ciphertext, salts and hashed auth keys.',
  },
]

export function Faq() {
  return (
    <section className="scroll-mt-20 px-5 py-14 md:px-10 md:py-20" id="faq">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          title="Questions, answered"
          description="The short version of how OneVault keeps your secrets."
        />
        <Accordion defaultValue={[QUESTIONS[0].q]}>
          {QUESTIONS.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="py-5 font-display font-semibold text-base md:text-lg">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
