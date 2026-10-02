import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
}

export interface IAuthRepository {
  create(input: { email: string; name: string; passwordHash: string }): Promise<void>;
  findByEmail(email: string): Promise<AuthUser | null>;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already exists");
    this.name = "DuplicateEmailError";
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
}
