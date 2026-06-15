interface StatusBadgeProps {
  status: string;
  type?: 'operation' | 'client' | 'parcela' | 'card';
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  // Operation
  em_aberto:         { label: 'Em Aberto',        color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.28)'   },
  pago_parcialmente: { label: 'Parcialmente Pago', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)'   },
  pago:              { label: 'Pago',              color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)'   },
  atrasado:          { label: 'Atrasado',          color: '#fb923c', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.28)'   },
  inadimplente:      { label: 'Inadimplente',      color: '#f87171', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)'    },
  // Client
  adimplente:        { label: 'Adimplente',        color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)'   },
  bloqueado:         { label: 'Bloqueado',         color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)'  },
  // Parcela
  paga:              { label: 'Paga',              color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)'   },
  pendente:          { label: 'Pendente',          color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.28)'   },
  vencida:           { label: 'Vencida',           color: '#f87171', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)'    },
  // Card
  ativo:             { label: 'Ativo',             color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)'   },
  cancelado:         { label: 'Cancelado',         color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)'  },
};

const fallback = { color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)' };

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = statusConfig[status] ?? { ...fallback, label: status };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 600,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '8px' }}>●</span>
      {c.label}
    </span>
  );
}
