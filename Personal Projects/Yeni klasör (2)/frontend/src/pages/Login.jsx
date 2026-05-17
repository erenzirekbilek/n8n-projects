import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      name: name || 'Admin',
      email: email || 'admin@test.com',
      role: 'admin',
    }));
    navigate('/');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Ticket Intelligence</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-tight">
            Ticket analiz &amp;<br />izleme platformu
          </h1>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-sm">
            Yapay zeka destekli intent analizi, sentiment tespiti ve güven skorlaması ile
            müşteri ticketlarınızı anlık izleyin.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Gerçek zamanlı WebSocket güncellemeleri',
              'AI tabanlı intent & sentiment analizi',
              'Human-in-the-loop feedback sistemi',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">© 2024 Ticket Intelligence</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900">Ticket Intelligence</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-900">Giriş Yap</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">Devam etmek için bilgilerinizi girin</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Ad Soyad</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Adınız Soyadınız"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800
                             placeholder-slate-400 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@sirket.com"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800
                             placeholder-slate-400 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold
                           hover:bg-blue-700 active:bg-blue-800 transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 mt-2"
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">Demo modunda çalışıyor</p>
        </div>
      </div>
    </div>
  );
}
