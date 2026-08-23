import React, { useState } from "react";
import { Mail, User, Lock, Eye, EyeOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Create account screen — frontend skeleton only, no auth wiring     */
/* ------------------------------------------------------------------ */

export default function CreateAccountScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCreateAccount = () => {
    // No backend wired up — hook this to your sign-up call later.
    console.log({ email, username, password, confirmPassword });
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-black placeholder-gray-400 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200";

  const passwordInputClass =
    "w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-12 text-sm text-black placeholder-gray-400 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200";

  const toggleClass =
    "absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-yellow-100 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400";

  const labelClass = "mb-1.5 block text-sm font-semibold text-black";

  const leadingIconClass =
    "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 font-sans text-black">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-black">CollabBoard</h1>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold tracking-tight text-black">Create account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set up your details to start building boards.
          </p>

          <div className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <div className="relative">
                <Mail className={leadingIconClass} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className={labelClass}>
                Username
              </label>
              <div className="relative">
                <User className={leadingIconClass} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <Lock className={leadingIconClass} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className={passwordInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={toggleClass}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Re-enter password
              </label>
              <div className="relative">
                <Lock className={leadingIconClass} />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={passwordInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  className={toggleClass}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full rounded-lg bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
            >
              Create account
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button
            type="button"
            className="font-semibold text-black underline decoration-yellow-400 decoration-2 underline-offset-4 transition hover:decoration-black focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
