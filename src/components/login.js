import { useAuth } from '../AuthContext';

export default function Login() {
  const { signInWithGoogle } = useAuth(); // Get login function from AuthContext

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="py-6 px-4">
        <div className="grid md:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          {/* Left side: login card */}
          <div className="border border-slate-300 rounded-lg p-6 max-w-md shadow-xl max-md:mx-auto text-center">
            <h3 className="text-slate-900 text-3xl font-semibold mb-4">Sign in</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Sign in to your account using Google and explore a world of possibilities.
            </p>

            {/* Login button triggers Supabase Google login */}
            <button
              onClick={signInWithGoogle}
              className="w-full py-2.5 px-4 mt-6 text-[15px] font-medium tracking-wide rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              Sign in with Google
            </button>
          </div>

          {/* Right side: image */}
          <div className="max-md:mt-8">
            <img
              src="https://readymadeui.com/login-image.webp"
              className="w-full aspect-[71/50] max-md:w-4/5 mx-auto block object-cover"
              alt="login"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
