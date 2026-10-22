/** Thrown when Stripe configuration is missing (STRIPE_SECRET_KEY, prices). */
export class StripeNotConfiguredError extends Error {
  constructor(message = "Stripe is not configured") {
    super(message);
    this.name = "StripeNotConfiguredError";
  }
}

/** Thrown when the Stripe API returns an unexpected/error response. */
export class StripeApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "StripeApiError";
  }
}
