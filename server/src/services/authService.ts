import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Charity } from '../models/Charity';
import { env } from '../config/env';
import { AppError } from '../middlewares/errorHandler';
import { emailService } from './emailService';
import { getStripe } from '../config/stripe';

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  charityId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: Partial<IUser>;
}

const signToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
};

export const authService = {
  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    if (dto.charityId) {
      const charity = await Charity.findById(dto.charityId);
      if (!charity || !charity.isActive) {
        throw new AppError('Selected charity not found or inactive', 400, 'INVALID_CHARITY');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create Stripe customer
    const stripe = getStripe();
    const stripeCustomer = await stripe.customers.create({
      email: dto.email,
      name: dto.name,
      metadata: { source: 'altrugreen' },
    });

    const user = await User.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      charityId: dto.charityId || null,
      stripeCustomerId: stripeCustomer.id,
    });

    // Increment charity member count
    if (dto.charityId) {
      await Charity.findByIdAndUpdate(dto.charityId, { $inc: { memberCount: 1 } });
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user).catch(console.error);

    const token = signToken(user);
    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        charityId: user.charityId,
        subscriptionStatus: user.subscriptionStatus,
        donationPercentage: user.donationPercentage,
      },
    };
  },

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await User.findOne({ email: dto.email.toLowerCase(), isActive: true }).select(
      '+passwordHash'
    );

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await user.comparePassword(dto.password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = signToken(user);
    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        charityId: user.charityId,
        subscriptionStatus: user.subscriptionStatus,
        donationPercentage: user.donationPercentage,
        stripeCustomerId: user.stripeCustomerId,
      },
    };
  },

  async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId).populate('charityId', 'name logoUrl websiteUrl');
    if (!user || !user.isActive) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  },

  async updateMe(
    userId: string,
    updates: { name?: string; charityId?: string; donationPercentage?: number }
  ): Promise<IUser> {
    if (updates.charityId) {
      const charity = await Charity.findById(updates.charityId);
      if (!charity || !charity.isActive) {
        throw new AppError('Invalid charity selected', 400, 'INVALID_CHARITY');
      }
    }

    if (
      updates.donationPercentage !== undefined &&
      (updates.donationPercentage < 10 || updates.donationPercentage > 100)
    ) {
      throw new AppError('Donation percentage must be between 10% and 100%', 400, 'INVALID_PERCENTAGE');
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  },
};
