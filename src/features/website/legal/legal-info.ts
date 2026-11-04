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
  license: 'AGPL-3.0',
  /**
   * Where the source code of the version running here can be downloaded.
   * The AGPL requires offering it to everyone who uses the app over a
   * network. If you run a modified version, point this at your modified
   * source (e.g. your fork), not the original repository.
   */
  sourceCodeUrl: 'https://github.com/Amine-AD/project-vault',
  /** The full license text (same as the LICENSE file in the repository). */
  licenseUrl: 'https://www.gnu.org/licenses/agpl-3.0.html',
  /** Days after purchase in which a refund can be asked for. */
  refundDays: 14,
  /** Minimum age to use the service. */
  minimumAge: 16,
  /** Shown as "Last updated". */
  lastUpdated: 'January 1, 2027',
} as const
