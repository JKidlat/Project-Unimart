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
  const { login } = useUser();
  const [step, setStep] = useState(1);
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
    agreeTerms: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.agreeTerms) {
      toast.error("Please agree to terms and conditions");
      return;
    }
    
    const initials = formData.fullName.split(' ').map((w: string) => w[0]).filter(Boolean).join('').toUpperCase();
    login({
      name: formData.fullName,
      email: formData.email,
      university: formData.university,
      role: formData.role as UserRole,
      profilePic: null,
      joinDate: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      referralCode: `UNIM-${initials}-${Date.now().toString().slice(-4)}`,
    });
    toast.success("Account created successfully! Please verify your email.");
    navigate('/profile');
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#a14b581a] border border-[#f3d7db] p-8 md:p-12"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a14b584d]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Join Unimart</h1>
          <p className="text-gray-500">The safest marketplace for Ghanaian students</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Phone Number</label>
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

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              name="agreeTerms"
              id="agreeTerms"
              required
              className="mt-1 w-5 h-5 text-[#a14b58] border-[#f3d7db] rounded focus:ring-[#a14b58]"
              onChange={handleInputChange}
            />
            <label htmlFor="agreeTerms" className="text-sm text-gray-500">
              I agree to Unimart's <Link to="/terms" className="text-[#a14b58] font-bold underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-[#a14b58] font-bold underline">Privacy Policy</Link>.
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b584d] flex items-center justify-center gap-2"
          >
            Create My Account
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
