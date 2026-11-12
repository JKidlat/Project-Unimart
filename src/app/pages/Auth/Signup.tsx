/**
 * ==============================================================================
 * STUDENT REGISTRATION PAGE (Signup.tsx)
 * ==============================================================================
 * Registers students into the Unimart marketplace with clear client and server
 * field-level validation feedback.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, User, Phone, Briefcase, ChevronRight, AlertCircle } from 'lucide-react';
import { UniversitySelector } from '../../components/common/UniversitySelector';
import { toast } from 'sonner';
import { resolveUserDashboardPath, useUser } from '../../context/UserContext';

type SignupErrors = Partial<Record<
  'fullName' | 'email' | 'university' | 'businessName' | 'phoneNumber' | 'password' | 'confirmPassword' | 'general',
  string
>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = (location.state as any)?.prefillEmail || '';
  const { signup } = useUser();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: prefillEmail,
    university: '',
    universityId: null as number | null,
    password: '',
    confirmPassword: '',
    role: 'Buyer',
    businessName: '',
    phoneNumber: '',
    agreeTerms: false,
    agreeAge: false,
    agreeSellerTerms: false,
  });

  const clearFieldError = (field: keyof SignupErrors) => {
    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (name in formData) {
      clearFieldError(name as keyof SignupErrors);
    }
  };

  const validateClientFields = (): SignupErrors => {
    const nextErrors: SignupErrors = {};
    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    if (!formData.email.trim()) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.university && !formData.universityId) {
      nextErrors.university = 'Please select your university or institution.';
    }
    if (formData.role === 'Seller' && !formData.businessName.trim()) {
      nextErrors.businessName = 'Business/store name is required when registering as a Seller.';
    }
    const cleanPhone = formData.phoneNumber.replace(/\s+/g, '');
    if (!cleanPhone) {
      nextErrors.phoneNumber = 'Phone number (MoMo) is required.';
    } else if (!/^\+?\d{9,15}$/.test(cleanPhone)) {
      nextErrors.phoneNumber = 'Please enter a valid phone number (e.g. 0241234567).';
    }
    if (!formData.password) {
      nextErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must contain at least 8 characters.';
    } else if (/^\d+$/.test(formData.password)) {
      nextErrors.password = 'Password cannot be entirely numeric. Include letters or symbols.';
    }
    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    return nextErrors;
  };

  const mapBackendErrors = (err: any): SignupErrors => {
    const fieldMap: Record<string, keyof SignupErrors> = {
      full_name: 'fullName',
      email: 'email',
      university: 'university',
      university_id: 'university',
      business_name: 'businessName',
      phone_number: 'phoneNumber',
      password: 'password',
      confirm_password: 'confirmPassword',
    };
    const mapped: SignupErrors = {};
    const raw = err?.fieldErrors;
    if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([key, msg]) => {
        if (typeof msg !== 'string' || !msg.trim()) return;
        const targetKey = fieldMap[key] || 'general';
        mapped[targetKey] = mapped[targetKey] ? `${mapped[targetKey]} ${msg}` : msg;
      });
    }
    if (Object.keys(mapped).length === 0) {
      mapped.general = err?.message || 'Unable to create your account. Please review your details and try again.';
    }
    return mapped;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validateClientFields();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const firstError = Object.values(clientErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    if (!formData.agreeAge) {
      toast.error('You must be at least 18 years of age to register on Unimart.');
      return;
    }
    if (!formData.agreeTerms) {
      toast.error('You must agree to the Terms and Conditions and acknowledge the Privacy Policy.');
      return;
    }
    if (formData.role === 'Seller' && !formData.agreeSellerTerms) {
      toast.error('Sellers must agree to the Seller Agreement and Student Verification Policy.');
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const refCode = new URLSearchParams(window.location.search).get('ref') || '';
      const newUser = await signup({ ...formData, referral_code: refCode });

      const userId = (newUser as any)?.id || formData.email;
      const role = formData.role as 'Buyer' | 'Seller';

      const { legalAcceptanceStorage } = await import('../../../lib/api');
      legalAcceptanceStorage.recordAcceptance({
        userId,
        userEmail: formData.email,
        documentId: 'terms',
        documentVersion: '0.1',
        userRole: role,
        acceptanceMethod: 'signup_form_checkbox',
      });
      legalAcceptanceStorage.recordAcceptance({
        userId,
        userEmail: formData.email,
        documentId: 'privacy',
        documentVersion: '0.1',
        userRole: role,
        acceptanceMethod: 'signup_form_checkbox',
      });
      if (role === 'Seller') {
        legalAcceptanceStorage.recordAcceptance({
          userId,
          userEmail: formData.email,
          documentId: 'seller-agreement',
          documentVersion: '0.1',
          userRole: 'Seller',
          acceptanceMethod: 'seller_signup_form_checkbox',
        });
        legalAcceptanceStorage.recordAcceptance({
          userId,
          userEmail: formData.email,
          documentId: 'student-verification',
          documentVersion: '0.1',
          userRole: 'Seller',
          acceptanceMethod: 'seller_signup_form_checkbox',
        });
      }

      if ((newUser as any)?._verificationEmailSent === false) {
        const reason = (newUser as any)?._verificationEmailError;
        toast.warning(
          reason
            ? `Account created, but verification email failed: ${reason}`
            : 'Account created, but the verification email could not be delivered yet. Click Resend Verification in the top banner.',
          { duration: 8000 }
        );
      } else {
        toast.success('Account created! Please check your email inbox to verify your address.', { duration: 6000 });
      }
      navigate(resolveUserDashboardPath(newUser));
    } catch (err: any) {
      const mapped = mapBackendErrors(err);
      setErrors(mapped);
      const firstMsg = Object.values(mapped)[0] || err?.message || 'Failed to create account.';
      toast.error(firstMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#a14b581a] border border-[#f3d7db] p-8 md:p-12"
      >
        <div className="text-center mb-10">
          <img
            src="/logo.png"
            alt="Unimart Logo"
            className="w-20 h-20 object-contain rounded-2xl mx-auto mb-6 shadow-xl shadow-[#a14b581a]"
          />
          <h1 className="text-3xl font-black text-gray-900 mb-2">Join Unimart</h1>
          <p className="text-gray-500">The safest marketplace for Ghanaian students</p>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  placeholder="Kofi Mensah"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
                    errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#f3d7db]'
                  }`}
                  onChange={handleInputChange}
                />
              </div>
              {errors.fullName && <p className="text-xs font-medium text-red-600">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Username (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  placeholder="kofi_m"
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Student Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                placeholder="you@st.ug.edu.gh"
                className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
                  errors.email ? 'border-red-400 bg-red-50/30' : 'border-[#f3d7db]'
                }`}
                onChange={handleInputChange}
              />
            </div>
            {errors.email && <p className="text-xs font-medium text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">University</label>
            <UniversitySelector
              value={formData.university}
              onChange={(name, uni) => {
                setFormData((prev) => ({
                  ...prev,
                  university: name,
                  universityId: uni?.id ?? null,
                }));
                clearFieldError('university');
              }}
              required
            />
            {errors.university && <p className="text-xs font-medium text-red-600">{errors.university}</p>}
          </div>

          <div className="space-y-4 pt-2">
            <label className="text-sm font-bold text-gray-700 block">I am joining as a...</label>
            <div className="grid grid-cols-2 gap-4">
              {['Buyer', 'Seller'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, role }));
                    clearFieldError('businessName');
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.role === role
                      ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-[#f3d7db]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      formData.role === role ? 'bg-[#a14b58] text-white' : 'bg-white'
                    }`}
                  >
                    {role === 'Buyer' ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                  </div>
                  <span className="font-bold">{role}</span>
                </button>
              ))}
            </div>
          </div>

          {formData.role === 'Seller' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Business/Store Name</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="businessName"
                  required={formData.role === 'Seller'}
                  value={formData.businessName}
                  placeholder="Kofi's Gadgets"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
                    errors.businessName ? 'border-red-400 bg-red-50/30' : 'border-[#f3d7db]'
                  }`}
                  onChange={handleInputChange}
                />
              </div>
              {errors.businessName && <p className="text-xs font-medium text-red-600">{errors.businessName}</p>}
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Phone Number (MoMo)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phoneNumber"
                required
                maxLength={15}
                value={formData.phoneNumber}
                placeholder="024 123 4567"
                className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
                  errors.phoneNumber ? 'border-red-400 bg-red-50/30' : 'border-[#f3d7db]'
                }`}
                onChange={handleInputChange}
              />
            </div>
            {errors.phoneNumber && <p className="text-xs font-medium text-red-600">{errors.phoneNumber}</p>}
          </div>

          <div className="space-y-2">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
                      errors.password ? 'border-red-400 bg-red-50/30' : 'border-[#f3d7db]'
                    }`}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.password && <p className="text-xs font-medium text-red-600">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
                      errors.confirmPassword ? 'border-red-400 bg-red-50/30' : 'border-[#f3d7db]'
                    }`}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs font-medium text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Password requirements: at least 8 characters, not common or numbers-only, and distinct from your name or email.
            </p>
          </div>

          <div className="space-y-4 pt-3 border-t border-[#f3d7db]/60">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreeAge"
                id="agreeAge"
                checked={formData.agreeAge}
                onChange={handleInputChange}
                className="mt-1 w-5 h-5 text-[#a14b58] border-[#f3d7db] rounded focus:ring-[#a14b58] cursor-pointer"
              />
              <label htmlFor="agreeAge" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
                I confirm that I am at least <strong className="text-gray-900 font-bold">18 years of age</strong>. (Unimart accounts and transactions are legally restricted to users aged 18 and older).
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreeTerms"
                id="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                className="mt-1 w-5 h-5 text-[#a14b58] border-[#f3d7db] rounded focus:ring-[#a14b58] cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
                I have read and agree to the{' '}
                <Link to="/legal/terms" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                  Terms and Conditions
                </Link>{' '}
                and acknowledge the{' '}
                <Link to="/legal/privacy" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                  Privacy Policy
                </Link>.
              </label>
            </div>

            {formData.role === 'Seller' && (
              <div className="flex items-start gap-3 p-3.5 bg-rose-50/70 rounded-2xl border border-[#f3d7db]">
                <input
                  type="checkbox"
                  name="agreeSellerTerms"
                  id="agreeSellerTerms"
                  checked={formData.agreeSellerTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 text-[#a14b58] border-[#f3d7db] rounded focus:ring-[#a14b58] cursor-pointer"
                />
                <label htmlFor="agreeSellerTerms" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                  I confirm that I am currently enrolled at a recognised tertiary institution in Ghana, that the information I have provided is accurate, and that I agree to the{' '}
                  <Link to="/legal/seller-agreement" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                    Seller Agreement
                  </Link>{' '}
                  and{' '}
                  <Link to="/legal/student-verification" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                    Student Verification Policy
                  </Link>.
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b584d] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Creating Account...' : 'Create My Account'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-gray-100">
          <p className="text-gray-500">
            Already have an account? <Link to="/signin" className="text-[#a14b58] font-bold">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
