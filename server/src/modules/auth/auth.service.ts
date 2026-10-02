import { AppError } from "../../errors/AppError.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { DuplicateEmailError, type IAuthRepository } from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

const DUMMY_PASSWORD_HASH = hashPassword("foodflow-auth-timing-dummy-password");

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  constructor(private readonly repo: IAuthRepository) {}

  async register(input: RegisterInput): Promise<void> {
    try {
      await this.repo.create({
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
      });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return;
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<SafeUser> {
    const user = await this.repo.findByEmail(input.email);
    const isValid = user
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyPassword(input.password, await DUMMY_PASSWORD_HASH);

    if (!user || !isValid) {
      throw new AppError("UNAUTHORIZED", "Invalid email or password");
    }

    return this.toSafeUser(user);
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
