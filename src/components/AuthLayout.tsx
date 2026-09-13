import type { ReactNode } from 'react';
import { CreditCard, Users, HandCoins, FileBarChart } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

const features = [
  { icon: CreditCard,   title: 'Cartões & Limites', color: '#00d5c4', bg: 'rgba(0,213,196,0.10)',  border: 'rgba(0,213,196,0.24)' },
  { icon: Users,        title: 'Clientes',          color: '#60a5fa', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.24)' },
  { icon: HandCoins,    title: 'Operações via Pix', color: '#10f2b0', bg: 'rgba(16,242,176,0.10)', border: 'rgba(16,242,176,0.24)' },
  { icon: FileBarChart, title: 'Relatórios',        color: '#a78bfa', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.24)' },
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Ambient wash — one soft light source, not decorative corner blobs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 12% 8%, rgba(0,213,196,0.10), transparent 65%)' }}
      />

      {/* Hero column (desktop only) — dominant, product-led */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center relative z-10 px-16 xl:px-24 py-12 overflow-hidden"
        style={{ borderRight: '1px solid var(--glass-border)' }}
      >
        {/* Oversized ghost mark — fills the negative space, reinforces the brand */}
        <img
          src="/creditflow-icon.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute select-none"
          style={{
            width: 620, height: 620,
            right: '-160px', bottom: '-180px',
            opacity: 0.05,
            transform: 'rotate(-8deg)',
            filter: 'saturate(1.4)',
          }}
        />

        <div className="max-w-[640px] relative">
          <div className="reveal flex items-center gap-3" style={{ animationDelay: '0.05s' }}>
            <img src="/creditflow-icon.png" alt="" width={44} height={44} className="logo-badge shrink-0" />
            <span className="brand-wordmark text-white text-[19px]">
              Credit<span className="brand-flow">Flow</span>
            </span>
          </div>

          <h1
            className="reveal text-[48px] xl:text-[58px] font-extrabold leading-[1.05] mt-9 mb-6"
            style={{ color: 'var(--text-primary)', letterSpacing: '-1.2px', animationDelay: '0.14s' }}
          >
            Do limite do cartão<br />ao <span className="brand-flow">lucro</span> no bolso.
          </h1>
          <p className="reveal text-[16px] leading-relaxed max-w-[460px] mb-7" style={{ color: 'var(--text-secondary)', animationDelay: '0.22s' }}>
            Controle de empréstimos via cartão de crédito: limites, clientes, parcelas e fluxo de caixa em um só painel.
          </p>

          <div className="reveal flex flex-wrap gap-2.5" style={{ animationDelay: '0.3s' }}>
            {features.map(f => (
              <span
                key={f.title}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full text-[13px] font-medium"
                style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}
              >
                <f.icon className="w-4 h-4" /> {f.title}
              </span>
            ))}
          </div>
        </div>

        {/* Floating product preview — real screenshot, not fake UI chrome */}
        <div className="reveal relative mt-14 max-w-[680px]" style={{ animationDelay: '0.4s' }}>
          <div
            className="pointer-events-none absolute -inset-16 rounded-[40px]"
            style={{ background: 'radial-gradient(ellipse 60% 60% at 45% 45%, rgba(0,213,196,0.18), transparent 70%)', filter: 'blur(6px)' }}
          />
          <div
            className="mockup-float relative rounded-[14px] overflow-hidden"
            style={{
              transform: 'perspective(1400px) rotateY(-9deg) rotateX(4deg)',
              boxShadow: '0 50px 90px -25px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
            }}
          >
            <img
              src="/dashboard-preview.png"
              alt="Painel do CreditFlow mostrando patrimônio disponível, valores a receber e gráficos de entradas e saídas"
              className="block w-full h-auto"
              width={1156}
              height={720}
            />
          </div>
        </div>
      </div>

      {/* Auth rail — compact, docked to the right edge */}
      <div
        className="flex-1 lg:flex-none lg:w-[400px] flex items-center justify-center relative z-10 px-5 sm:px-8 py-10 overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.12)' }}
      >
        {/* Small ghost mark echoing the hero, so branding reaches the auth card too */}
        <img
          src="/creditflow-icon.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute select-none hidden lg:block"
          style={{ width: 260, height: 260, top: '-70px', right: '-70px', opacity: 0.05, transform: 'rotate(10deg)' }}
        />
        {children}
      </div>
    </div>
  );
}
