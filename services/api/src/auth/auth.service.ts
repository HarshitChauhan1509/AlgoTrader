import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { AppConfig } from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';

interface TokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name ?? null,
          passwordHash,
          riskConfiguration: {
            create: {},
          },
        },
      });

      return await this.issueTokens(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A user with this email already exists.');
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !(await this.passwordService.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session is no longer valid.');
    }

    const validRefreshToken = await this.passwordService.verify(session.refreshTokenHash, refreshToken);
    if (!validRefreshToken) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    return this.issueTokens(session.user, session.id);
  }

  private async issueTokens(user: User, existingSessionId?: string): Promise<AuthResponseDto> {
    const sessionId =
      existingSessionId ??
      (
        await this.prisma.session.create({
          data: {
            userId: user.id,
            refreshTokenHash: 'pending',
            expiresAt: this.refreshExpiryDate(),
          },
        })
      ).id;

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user, sessionId);
    const refreshTokenHash = await this.passwordService.hash(refreshToken);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiresAt: this.refreshExpiryDate(),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = { sub: user.id, email: user.email };

    return this.jwtService.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret', { infer: true }),
      expiresIn: this.config.get('jwt.accessExpiresIn', { infer: true }),
    });
  }

  private signRefreshToken(user: User, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, sessionId },
      {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
        expiresIn: this.config.get('jwt.refreshExpiresIn', { infer: true }),
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string): Promise<TokenPayload & { sessionId: string }> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload & { sessionId: string }>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid.');
    }
  }

  private refreshExpiryDate(): Date {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return now;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
