import type { AccessTokenClaims } from "../modules/auth/access-token.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
    }
  }
}

export {};
