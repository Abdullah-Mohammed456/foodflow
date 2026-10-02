import { RestaurantRole } from "@prisma/client";
import { AppError } from "../../errors/AppError.js";
import type { IAuthRepository } from "../auth/auth.repository.js";
import { verifyAccessToken, type AccessTokenClaims } from "../auth/access-token.js";
import { readAccessCookie } from "../../middleware/authenticate.js";

export class RealtimeService {
  constructor(private readonly users: IAuthRepository) {}

  async authenticate(cookie: string | undefined): Promise<AccessTokenClaims> {
    const token = readAccessCookie(cookie);
    const claims = token ? verifyAccessToken(token) : null;
    if (!claims) throw new AppError("UNAUTHORIZED", "Authentication required");
    const user = await this.users.findById(claims.id);
    if (!user || user.role !== claims.role) throw new AppError("UNAUTHORIZED", "Authentication required");
    return claims;
  }

  async canAccessKitchen(userId: string, restaurantId: string): Promise<boolean> {
    const role = await this.users.findRestaurantRole(userId, restaurantId);
    return role !== null && [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.KITCHEN].includes(role);
  }
}
