import type { ReactNode } from 'react';
import { CreditCard, Users, HandCoins, FileBarChart, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

const features = [
  { icon: CreditCard,   title: 'Cartões & Limites', desc: 'Acompanhe limite usado, disponível e comprometido em tempo real.', color: '#00d5c4', bg: 'rgba(0,213,196,0.10)', border: 'rgba(0,213,196,0.22)' },
  { icon: Users,        title: 'Clientes',          desc: 'Histórico completo, situação e inadimplência por cliente.',        color: '#60a5fa', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.22)' },
  { icon: HandCoins,    title: 'Operações',         desc: 'Controle de parcelas, vencimentos e recebimentos via Pix.',        color: '#10f2b0', bg: 'rgba(16,242,176,0.10)', border: 'rgba(16,242,176,0.22)' },
  { icon: FileBarChart, title: 'Relatórios',        desc: 'Fluxo de caixa, lucro estimado e projeções financeiras.',          color: '#a78bfa', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)' },
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Glow blobs */}
      <div
        className="auth-blob pointer-events-none absolute -top-32 -left-24 w-[440px] h-[440px] rounded-full"
        style={{ background: 'rgba(0,213,196,0.16)', filter: 'blur(120px)' }}
      />
      <div
        className="auth-blob pointer-events-none absolute bottom-[-170px] right-[-130px] w-[440px] h-[440px] rounded-full"
        style={{ background: 'rgba(16,242,176,0.11)', filter: 'blur(130px)', animationDelay: '-5s' }}
      />
      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 75% 55% at 50% 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 55% at 50% 0%, black 30%, transparent 100%)',
        }}
      />

      {/* Left branding panel (desktop only) */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] max-w-[560px] relative z-10 px-14 py-12 shrink-0"
        style={{ borderRight: '1px solid var(--glass-border)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img src="/creditflow-icon.png" alt="" width={46} height={46} className="logo-badge shrink-0" />
            <div>
              <span className="brand-wordmark block text-white text-[21px] leading-none">
                Credit<span className="brand-flow">Flow</span>
              </span>
              <span className="block text-[10.5px] font-medium uppercase tracking-[1.2px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Empréstimos &amp; Finanças Pessoais
              </span>
            </div>
          </div>

          <h1
            className="text-[34px] font-extrabold leading-[1.15] mt-11 mb-4"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
          >
            Do limite do cartão<br />ao lucro no bolso.
          </h1>
          <p className="text-[14px] leading-relaxed max-w-[380px] mb-10" style={{ color: 'var(--text-secondary)' }}>
            Gerencie operações de empréstimo via cartão de crédito com controle total de limites,
            clientes, parcelas e fluxo de caixa em um só lugar.
          </p>

          <div className="space-y-3">
            {features.map(f => (
              <div
                key={f.title}
                className="flex items-start gap-3 p-3 rounded-[12px] transition-colors duration-200"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
              >
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}
                >
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          Dados isolados por conta • Sessão segura via Supabase Auth
        </div>
      </div>

      {/* Right panel — form content */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
