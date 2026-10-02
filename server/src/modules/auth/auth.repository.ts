import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import type { ProfileUpdateInput } from "./auth.schema.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
}

export type AuthProfile = Omit<AuthUser, "passwordHash">;

export interface IAuthRepository {
  create(input: { email: string; name: string; passwordHash: string }): Promise<void>;
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthProfile | null>;
  updateProfile(id: string, input: ProfileUpdateInput): Promise<AuthProfile>;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already exists");
    this.name = "DuplicateEmailError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<void> {
    try {
      await this.db.user.create({ data: input });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
      },
    });
  }

  findById(id: string): Promise<AuthProfile | null> {
    return this.db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async updateProfile(
    id: string,
    input: ProfileUpdateInput,
  ): Promise<AuthProfile> {
    try {
      return await this.db.user.update({
        where: { id },
        data: input,
        select: { id: true, email: true, name: true, role: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") throw new DuplicateEmailError();
        if (error.code === "P2025") throw new UserNotFoundError();
      }
      throw error;
    }
  }
}
