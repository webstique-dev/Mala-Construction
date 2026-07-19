const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name is required.'),
    username: z.string().trim().max(50, 'Username is too long.').optional().default(''),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
    phone: z.string().trim().min(7, 'Phone number is required.').max(20, 'Phone number is too long.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    role: z.enum(['super_admin', 'site_admin']).default('site_admin'),
    assignedSite: z.string().trim().optional().nullable().default(null),
    acceptedTerms: z.boolean().refine((value) => value, { message: 'You must accept the terms and conditions.' }),
    rememberMe: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'New password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Confirm password is required.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match.',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password cannot be the same as the current password.',
    path: ['newPassword'],
  });

module.exports = { loginSchema, registerSchema, changePasswordSchema };
