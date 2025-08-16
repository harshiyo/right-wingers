import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Logo from '../assets/logo.png'
import { useDocument } from 'react-firebase-hooks/firestore'
import { doc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useStore } from '../context/StoreContext'
import { ChristmasEffect } from '../components/ChristmasEffect'
import { HalloweenEffect } from '../components/HalloweenEffect'
import { getFestiveType } from '../utils/festiveUtils'
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

// Live clock component
const LiveClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timerId)
  }, [])

  return (
    <div className="text-center">
      <p className="text-lg font-semibold">{currentTime.toLocaleDateString()}</p>
      <p className="text-3xl font-bold">{currentTime.toLocaleTimeString()}</p>
    </div>
  )
}

// Success animation overlay
function LoginSuccessAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const duration = 1 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
      });
    }, 200);

    const timeout = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-white flex items-center justify-center z-[9998]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex flex-col items-center"
      >
        <CheckCircle2 className="text-green-500 w-24 h-24" />
        <motion.span
          className="mt-4 text-2xl font-bold text-gray-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Login Successful!
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

export function Login() {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()
  const { loginWithCredentials, currentUser } = useStore()

  const version = __APP_VERSION__ || '1.0.0'
  const buildDate = __BUILD_DATE__ || new Date().toISOString().split('T')[0]
  const [festiveType, setFestiveType] = useState(getFestiveType())

  const [snapshot, loading] = useDocument(doc(db, 'settings', 'loginScreen'))
  const locationName = snapshot?.data()?.locationName || 'Right Wingers'

  useEffect(() => {
    const savedCredentials = localStorage.getItem('pos_remember_me')
    if (savedCredentials) {
      try {
        const { email: savedEmail, password: savedPassword, rememberMe: savedRememberMe } = JSON.parse(savedCredentials)
        setEmail(savedEmail || '')
        setPassword(savedPassword || '')
        setRememberMe(savedRememberMe || false)
      } catch {
        localStorage.removeItem('pos_remember_me')
      }
    }
  }, [])

  useEffect(() => {
    const checkFestiveType = () => {
      const newFestiveType = getFestiveType()
      if (newFestiveType !== festiveType) {
        setFestiveType(newFestiveType)
      }
    }
    const intervalId = setInterval(checkFestiveType, 60000)
    return () => clearInterval(intervalId)
  }, [festiveType])

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await loginWithCredentials(email, password);
      if (success) {
        if (rememberMe) {
          localStorage.setItem('pos_remember_me', JSON.stringify({ email, password, rememberMe: true }))
        } else {
          localStorage.removeItem('pos_remember_me')
        }
        setShowSuccess(true) // Show animation instead of instant navigate
      } else {
        setError('Invalid email or password. Please check your credentials.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email address.');
      else if (err.code === 'auth/wrong-password') setError('Incorrect password. Please try again.');
      else if (err.code === 'auth/invalid-email') setError('Please enter a valid email address.');
      else if (err.code === 'auth/too-many-requests') setError('Too many failed attempts. Please try again later.');
      else setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked)
    if (!checked) localStorage.removeItem('pos_remember_me')
  }

  return (
    <div className="min-h-screen w-full flex bg-gray-100">
      {festiveType === 'christmas' && <ChristmasEffect />}
      {festiveType === 'halloween' && <HalloweenEffect />}

      <AnimatePresence>
        {showSuccess && (
          <LoginSuccessAnimation onComplete={() => navigate('/', { replace: true })} />
        )}
      </AnimatePresence>

      <div className="w-1/2 bg-[#800000] flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-24 -right-10 w-80 h-80 bg-white/10 rounded-full"></div>

        <div className="z-10 text-center flex-grow flex flex-col items-center justify-center">
          <img src={Logo} alt="POS System Logo" className="w-48 h-48 mx-auto" />
          <h2 className="text-3xl font-bold mt-6">
            {loading ? '...' : locationName}
          </h2>
          <div className="mt-6">
            <LiveClock />
          </div>
        </div>

        <div className="z-10 text-center pb-4">
          <p className="text-sm text-white/70">POS System v{version}</p>
          <p className="text-xs text-white/50">Build: {buildDate}</p>
        </div>
      </div>

      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md p-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-800">Cashier Login</h2>
          <p className="text-gray-600 mb-8">Welcome back! Please sign in to continue.</p>

          <form onSubmit={handleSignIn}>
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  className="pl-12 h-14 text-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Password"
                  className="pl-12 pr-12 h-14 text-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => handleRememberMeChange(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            </div>

            <div className="mt-8">
              <Button
                className="w-full h-14 text-lg font-bold bg-[#800000] hover:bg-red-800 disabled:opacity-50"
                type="submit"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
                <LogIn className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
