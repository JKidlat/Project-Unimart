import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';

export const Signin = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate a successful sign-in with a placeholder profile until real backend is wired
    login({
      name: "Emmanuel Boateng",
      email: formData.email,
      university: "University of Ghana (UG)",
      role: "Buyer",
      profilePic: null,
      joinDate: "Sept 2024",
      referralCode: "UNIM-EB-2026",
    });
    toast.success("Welcome back to Unimart!");
    navigate('/');
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#a14b581a] border border-[#f3d7db] p-8 md:p-12"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a14b584d]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to continue to Unimart</p>
        </div>

        <div className="space-y-4 mb-8">
          <button className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-700">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or with Email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="email"
                required
                placeholder="you@st.ug.edu.gh"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-bold text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#a14b58] font-bold">Forgot password?</Link>
            </div>
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

          <button
            type="submit"
            className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b584d] flex items-center justify-center gap-2"
          >
            Sign In
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-gray-100">
          <p className="text-gray-500">
            New to Unimart? <Link to="/signup" className="text-[#a14b58] font-bold">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
