/**
 * Details used by the Privacy Policy and Terms of Service. These are
 * placeholders: replace them with the real values before launching the
 * hosted service, and have both documents reviewed by a lawyer.
 */
export const LEGAL = {
  /** Who runs the hosted service (your name or your company's). */
  operator: '[Company Name LLC]',
  /** Where the operator is based. */
  country: '[Country]',
  /** Laws that govern the Terms, e.g. "the State of Delaware, USA". */
  governingLaw: '[State / Country]',
  /** Where privacy and data requests go. */
  privacyEmail: 'privacy@example.com',
  /** Where legal and support questions go. */
  contactEmail: 'support@example.com',
  /** Postal address (some laws require one). */
  address: '[Street, City, Postal code, Country]',
  /** Where the hosted service's servers run. */
  hostingProvider: '[Hosting Provider]',
  hostingRegion: '[Region, e.g. EU (Germany)]',
  /** Payment provider / merchant of record. */
  paymentProvider: '[Payment Provider]',
  /** Open-source license of the code. */
  license: '[AGPL-3.0]',
  /** Days after purchase in which a refund can be asked for. */
  refundDays: 14,
  /** Minimum age to use the service. */
  minimumAge: 16,
  /** Shown as "Last updated". */
  lastUpdated: 'January 1, 2027',
} as const
