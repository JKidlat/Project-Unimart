/**
 * ==============================================================================
 * STUDENT REGISTRATION PAGE (Signup.tsx)
 * ==============================================================================
 * This page registers new Ghanaian students into the Unimart marketplace.
 *
 * Key Registration Steps:
 * 1. Personal Information:
 *    - Full Name, Student Handle/Username, Student Email address.
 * 2. Campus Affiliation:
 *    - Dropdown selection of Ghanaian institutions (UG Legon, KNUST, UCC, etc.).
 * 3. Role Selection (Buyer vs Seller):
 *    - Interactive role cards allow selecting 'Buyer' or 'Seller'.
 *    - If 'Seller' is chosen, an additional 'Business/Store Name' field animates in.
 * 4. Contact & Security:
 *    - MoMo phone number (10 digits).
 *    - Password and Password Confirmation validation check.
 *    - Acceptance of Terms of Service and Privacy Policy.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, User, Phone, GraduationCap, Briefcase, ChevronRight, CheckCircle2 } from 'lucide-react';
import { universities } from '../../data/mockData';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';
import type { UserRole } from '../../context/UserContext';

export const Signup = () => {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useUser();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form field states
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    university: '',
    password: '',
    confirmPassword: '',
    role: 'Buyer',
    businessName: '',
    phoneNumber: '',
    agreeTerms: false,
    agreeAge: false,
    agreeSellerTerms: false
  });

  // Handle keystroke and checkbox changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  // ----------------------------------------------------------------------------
  // Handler: Account Creation Form Submission
  // ----------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.agreeAge) {
      toast.error("You must be at least 18 years of age to register on Unimart.");
      return;
    }
    if (!formData.agreeTerms) {
      toast.error("You must agree to the Terms and Conditions and acknowledge the Privacy Policy.");
      return;
    }
    if (formData.role === 'Seller' && !formData.agreeSellerTerms) {
      toast.error("Sellers must agree to the Seller Agreement and Student Verification Policy.");
      return;
    }

    setLoading(true);
    try {
      const refCode = new URLSearchParams(window.location.search).get('ref') || '';
      const newUser = await signup({ ...formData, referral_code: refCode });

      
      // Persist immutable legal acceptance records for audit compliance (Ghana Act 843 & Act 772)
      const userId = (newUser as any)?.id || formData.email;
      const role = formData.role as 'Buyer' | 'Seller';
      
      // 1. General Terms & Privacy acceptance
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

      // 2. Seller Agreement & Student Verification acceptance (if Seller)
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

      toast.success("Account created! Please check your email inbox to verify your address.", { duration: 6000 });
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const refCode = new URLSearchParams(window.location.search).get('ref') || '';
      const signedInUser = await loginWithGoogle({
        role: formData.role,
        referralCode: refCode,
      });
      toast.success(`Welcome to Unimart, ${signedInUser.name}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#a14b581a] border border-[#f3d7db] p-8 md:p-12"
      >
        {/* Header Icon & Title */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a14b584d]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Join Unimart</h1>
          <p className="text-gray-500">The safest marketplace for Ghanaian students</p>
        </div>

        {/* Social Authentication */}
        <div className="space-y-4 mb-6">
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-700 disabled:opacity-60 cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {googleLoading ? 'Connecting with Google...' : 'Continue with Google'}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or sign up with Email</span></div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Full Name & Username */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Kofi Mensah"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="kofi_m"
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Student Email Address */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Student Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                placeholder="you@st.ug.edu.gh"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* University Dropdown Selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">University</label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                name="university"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none appearance-none"
                onChange={handleInputChange}
              >
                <option value="">Select your institution</option>
                {universities.map(uni => <option key={uni} value={uni}>{uni}</option>)}
              </select>
            </div>
          </div>

          {/* Role Choice: Buyer vs Seller */}
          <div className="space-y-4 pt-2">
            <label className="text-sm font-bold text-gray-700 block">I am joining as a...</label>
            <div className="grid grid-cols-2 gap-4">
              {['Buyer', 'Seller'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role }))}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.role === role 
                      ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-[#f3d7db]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.role === role ? 'bg-[#a14b58] text-white' : 'bg-white'}`}>
                    {role === 'Buyer' ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                  </div>
                  <span className="font-bold">{role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Seller Business Name */}
          {formData.role === 'Seller' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <label className="text-sm font-bold text-gray-700">Business/Store Name</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="businessName"
                  required={formData.role === 'Seller'}
                  placeholder="Kofi's Gadgets"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  onChange={handleInputChange}
                />
              </div>
            </motion.div>
          )}

          {/* Phone Number (MoMo payments) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Phone Number (MoMo)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phoneNumber"
                required
                maxLength={10}
                placeholder="024 123 4567"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Password & Confirmation */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Legal Compliance Checkboxes (Ghana Act 843, Act 772, Act 560) */}
          <div className="space-y-4 pt-3 border-t border-[#f3d7db]/60">
            {/* 1. Age Restriction Gate (>= 18 years old) */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreeAge"
                id="agreeAge"
                checked={formData.agreeAge}
                onChange={handleInputChange}
                required
                className="mt-1 w-5 h-5 text-[#a14b58] border-[#f3d7db] rounded focus:ring-[#a14b58] cursor-pointer"
              />
              <label htmlFor="agreeAge" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
                I confirm that I am at least <strong className="text-gray-900 font-bold">18 years of age</strong>. (Unimart accounts and transactions are legally restricted to users aged 18 and older).
              </label>
            </div>

            {/* 2. General Terms & Conditions and Privacy Policy */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreeTerms"
                id="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                required
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

            {/* 3. Seller-Only Student Verification & Seller Agreement */}
            {formData.role === 'Seller' && (
              <div className="flex items-start gap-3 p-3.5 bg-rose-50/70 rounded-2xl border border-[#f3d7db]">
                <input
                  type="checkbox"
                  name="agreeSellerTerms"
                  id="agreeSellerTerms"
                  checked={formData.agreeSellerTerms}
                  onChange={handleInputChange}
                  required
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

        {/* Existing Account Footer Link */}
        <div className="mt-8 text-center pt-8 border-t border-gray-100">
          <p className="text-gray-500">
            Already have an account? <Link to="/signin" className="text-[#a14b58] font-bold">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
