import { User, Lock, ShieldCheck } from "lucide-react";

export default function AuthPage({
  authMode,
  authError,
  userId,
  password,
  twoStepPin,
  requiresTwoStep,
  setUserId,
  setPassword,
  setTwoStepPin,
  setAuthMode,
  handleAuth,
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background text-white px-4">
      <div className="relative w-full max-w-lg">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-[24px]" />
        <div className="relative rounded-[24px] border border-white/10 bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-primary/20">
          <div className="mb-8 text-center">
            <div className="w-full flex justify-center">
              <img
                src="/images/chattiko-logo.png"
                alt="logo"
                width={250}
                className="max-h-[190px] object-cover"
              />
            </div>
            <p className="text-sm text-gray-400">
              {requiresTwoStep
                ? "Two-step verification is enabled for this account"
                : authMode === "login"
                  ? "Sign in to continue where you left off"
                  : "Create your account and join the conversation"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {authError && (
              <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {authError}
              </div>
            )}

            {!requiresTwoStep && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-[12px] border border-white/10 bg-[#0f172a]/80 py-3 pl-10 pr-4 text-white outline-none transition focus:border-primary/80 focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>
            )}

            {!requiresTwoStep && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[12px] border border-white/10 bg-[#0f172a]/80 py-3 pl-10 pr-4 text-white outline-none transition focus:border-primary/80 focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            )}

            {requiresTwoStep && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Enter your PIN
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoStepPin}
                    onChange={(e) => setTwoStepPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-[12px] border border-white/10 bg-[#0f172a]/80 py-3 pl-10 pr-4 text-white outline-none transition focus:border-primary/80 focus:ring-2 focus:ring-primary/10"
                    placeholder="4–6 digit PIN"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-[12px] bg-gradient-to-r from-primary to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              {requiresTwoStep
                ? "Verify PIN"
                : authMode === "login"
                  ? "Sign in"
                  : "Register"}
            </button>

            {!requiresTwoStep && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                }}
                className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 transition hover:bg-white/10"
              >
                {authMode === "login"
                  ? "Create an account"
                  : "Already have an account? Sign in"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
