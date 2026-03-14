"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const KIT_COLORS = [
  { name: "Red", value: "#e63946" },
  { name: "Blue", value: "#457b9d" },
  { name: "Green", value: "#2a9d8f" },
  { name: "Yellow", value: "#e9c46a" },
  { name: "Orange", value: "#f4a261" },
  { name: "Navy", value: "#264653" },
  { name: "Purple", value: "#6a0572" },
  { name: "Forest", value: "#1a7a3c" },
  { name: "Crimson", value: "#d53a3a" },
  { name: "Sky", value: "#3a7bd5" },
  { name: "White", value: "#f1faee" },
  { name: "Black", value: "#1d1d1d" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [kitHome, setKitHome] = useState("#e63946");
  const [kitAway, setKitAway] = useState("#f1faee");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, clubName, kitHome, kitAway }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto sign in after registration
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Kickoff Manager</h1>
        <p className="text-gray-400 mt-2">Create your club</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Manager Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                minLength={6}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (name && email && password.length >= 6) setStep(2);
              }}
              className="btn-primary w-full"
            >
              Next — Create Your Club
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Club Name
              </label>
              <input
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="input-field"
                placeholder="e.g. Ironclad FC"
                maxLength={30}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Home Kit Colour
              </label>
              <div className="grid grid-cols-6 gap-2">
                {KIT_COLORS.map((c) => (
                  <button
                    key={`home-${c.value}`}
                    type="button"
                    onClick={() => setKitHome(c.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      kitHome === c.value
                        ? "border-accent scale-110"
                        : "border-gray-700"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Away Kit Colour
              </label>
              <div className="grid grid-cols-6 gap-2">
                {KIT_COLORS.map((c) => (
                  <button
                    key={`away-${c.value}`}
                    type="button"
                    onClick={() => setKitAway(c.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      kitAway === c.value
                        ? "border-accent scale-110"
                        : "border-gray-700"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !clubName}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Club"}
              </button>
            </div>
          </>
        )}
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
