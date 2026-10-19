import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { forgotPassword } from "../store/slices/authSlice";
import { Mail, Send, Loader2, KeyRound, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    dispatch(forgotPassword(email.trim()));
    setEmail("");
  };

  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
  if (isAuthenticated && user?.role === "Admin") {
    return <Navigate to={"/"} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 via-indigo-50 to-purple-100 px-4 py-8">
      <div className="bg-white shadow-xl rounded-2xl max-w-md w-full p-8 sm:p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800">
            Forgot Password?
          </h2>
          <p className="text-sm text-gray-500 text-center mt-1">
            Enter your admin email address and we'll send you a password recovery link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Admin Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@shopnexa.com"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <Link
              to={"/login"}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Remember Password?</span>
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Sending Recovery Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Request Link</span>
                </>
              )}
            </button>

            {loading && (
              <p className="text-xs text-center text-blue-600 mt-2.5 animate-pulse flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Connecting to mail server & sending link...</span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
