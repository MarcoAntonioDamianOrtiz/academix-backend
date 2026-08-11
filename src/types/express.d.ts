import type { AuthUser } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accessToken: string;
        user: AuthUser;
      };
    }
  }
}

export {};
