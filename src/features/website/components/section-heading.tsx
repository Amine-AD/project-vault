import { cn } from '#/lib/utils'

export function SectionHeading({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-3xl space-y-4', className)}>
      <h2 className="text-balance font-display font-bold text-3xl tracking-tight md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-muted-foreground md:text-xl">
          {description}
        </p>
      )}
    </div>
  )
}
