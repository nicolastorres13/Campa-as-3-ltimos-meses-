
import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LabelList, Cell
} from 'recharts';

interface DashboardProps {
  data: CampaignData[];
}

type ChannelFilter = 'all' | 'email' | 'hsm';

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [funnelChannelFilter, setFunnelChannelFilter] = useState<ChannelFilter>('all');
  const [influenceChannelFilter, setInfluenceChannelFilter] = useState<ChannelFilter>('all');
  const [subChannelFilter, setSubChannelFilter] = useState<ChannelFilter>('all');
  const [formatChannelFilter, setFormatChannelFilter] = useState<ChannelFilter>('all');
  const [lineChannelFilter, setLineChannelFilter] = useState<ChannelFilter>('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const stats = useMemo(() => {
    const s = data.reduce((acc, curr) => ({
      totalSent: acc.totalSent + curr.enviado,
      totalDelivered: acc.totalDelivered + curr.entregado,
      totalOpened: acc.totalOpened + curr.abierto,
      totalClicked: acc.totalClicked + curr["con clic"],
      totalEnrolled: acc.totalEnrolled + curr.matriculado,
      totalAvanzo: acc.totalAvanzo + curr.avanzo,
      totalBounce: acc.totalBounce + curr.rebotar,
      totalUnsubs: acc.totalUnsubs + curr["suscripción cancelada"],
    }), {
      totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalEnrolled: 0,
      totalAvanzo: 0, totalBounce: 0, totalUnsubs: 0
    });

    return {
      ...s,
      avgDeliveryRate: (s.totalDelivered / s.totalSent) * 100 || 0,
      avgOpenRate: (s.totalOpened / s.totalDelivered) * 100 || 0,
      avgClickRate: (s.totalClicked / s.totalDelivered) * 100 || 0,
      avgCTO: (s.totalClicked / s.totalOpened) * 100 || 0,
      avgFunnelAdvance: (s.totalAvanzo / s.totalOpened) * 100 || 0,
      avgInfluenceRate: (s.totalEnrolled / s.totalOpened) * 100 || 0,
    };
  }, [data]);

  const campaignOptions = useMemo(() => {
    const names = Array.from(new Set(data.map(item => item.campaña)));
    return names.sort();
  }, [data]);

  const top10ByApertura = useMemo(() => {
    const filtered = selectedCampaign === 'all' 
      ? data 
      : data.filter(item => item.campaña === selectedCampaign);

    return filtered
      .map(item => ({
        name: item.nombre, 
        apertura: Number(((item.abierto / item.entregado) * 100).toFixed(1)) || 0
      }))
      .sort((a, b) => b.apertura - a.apertura)
      .slice(0, 10);
  }, [data, selectedCampaign]);

  // AJUSTE: Lógica refinada para Línea de Negocio
  const lineOfBusinessData = useMemo(() => {
    const filtered = lineChannelFilter === 'all' 
      ? data 
      : data.filter(item => item.canal.toLowerCase().includes(lineChannelFilter.toLowerCase()));

    const groups: Record<string, { abiertos: number, entregados: number, matriculados: number }> = {};
    
    filtered.forEach(item => {
      // Normalizamos el nombre de la línea para evitar duplicados por formato
      const rawLine = item["línea de negocio"] || 'N/A';
      const line = rawLine.trim().toUpperCase(); 
      
      if (!groups[line]) {
        groups[line] = { abiertos: 0, entregados: 0, matriculados: 0 };
      }
      groups[line].abiertos += item.abierto;
      groups[line].entregados += item.entregado;
      groups[line].matriculados += item.matriculado;
    });

    return Object.entries(groups)
      .map(([name, g]) => ({
        name: name, // Nombre de la línea de negocio (e.g., POSGRADO, PREGRADO)
        apertura: Number(((g.abiertos / g.entregados) * 100).toFixed(1)) || 0,
        influencia: Number(((g.matriculados / g.abiertos) * 100).toFixed(2)) || 0
      }))
      .sort((a, b) => b.apertura - a.apertura);
  }, [data, lineChannelFilter]);

  const insights = useMemo(() => {
    if (!data.length) return null;
    const channelMetrics = data.reduce((acc: any, curr) => {
      const channel = curr.canal.toLowerCase();
      if (!acc[channel]) acc[channel] = { abiertos: 0, entregados: 0, matriculados: 0, enviado: 0, avanzo: 0 };
      acc[channel].abiertos += curr.abierto;
      acc[channel].entregados += curr.entregado;
      acc[channel].matriculados += curr.matriculado;
      acc[channel].enviado += curr.enviado;
      acc[channel].avanzo += curr.avanzo;
      return acc;
    }, {});
    const hsm = channelMetrics.hsm || { abiertos: 0, entregados: 0, matriculados: 0, enviado: 0, avanzo: 0 };
    const email = channelMetrics.email || { abiertos: 0, entregados: 0, matriculados: 0, enviado: 0, avanzo: 0 };
    const hsmInf = (hsm.matriculados / hsm.abiertos) * 100 || 0;
    const emailInf = (email.matriculados / email.abiertos) * 100 || 0;
    const conclusions = {
      canales: `Tras un análisis exhaustivo de la eficacia por canal, observamos que el canal ${hsmInf > emailInf ? 'HSM' : 'EMAIL'} presenta una tasa de influencia superior (${Math.max(hsmInf, emailInf).toFixed(2)}%), consolidándose como el vehículo con mayor capacidad de conversión real. Por el contrario, el canal ${hsmInf <= emailInf ? 'HSM' : 'EMAIL'} muestra una eficiencia relativa menor, lo que sugiere una necesidad inmediata de revisar la segmentación de audiencias o la personalización del mensaje en dicho canal para evitar el desgaste de la base de datos.`,
      funnel: `El comportamiento del funnel revela una tasa promedio de avance del ${stats.avgFunnelAdvance.toFixed(1)}%. Este KPI es crítico, ya que indica que una parte significativa de la audiencia interactúa inicialmente pero pierde el hilo conductor antes de la conversión final. Es imperativo fortalecer los llamados a la acción (CTA) y simplificar la experiencia de usuario post-apertura para reducir la fricción operativa detectada en las campañas de bajo rendimiento.`,
      formatos: `La comparativa de performance por formato demuestra que no existe una correlación lineal directa entre una alta tasa de apertura y una alta tasa de influencia. Se han identificado formatos que logran captar la atención visual (Apertura) pero fallan en la persuasión de matriculación. Recomendamos priorizar los formatos con 'doble impacto' que mantienen la coherencia narrativa, ya que estos optimizan el ROI publicitario al asegurar que el tráfico generado sea de alta intención.`,
      suscripcion: `El volumen de cancelaciones detectado bajo la métrica de 'Suscripción' se concentra en campañas con asuntos de alta urgencia pero contenido de baja relevancia. Debemos mantener una frecuencia de envío moderada y eliminar definitivamente los disparadores que presentan una tasa de rebote superior al promedio, protegiendo así la reputación de los dominios de envío y la integridad de nuestra lista de contactos.`,
      influencia: `La tasa de influencia global del ${stats.avgInfluenceRate.toFixed(2)}% es el indicador definitivo del éxito de marketing en este periodo. Las campañas denominadas 'Estrellas' no solo superan este promedio, sino que demuestran una eficiencia excepcional en la conversión de leads fríos a matriculados activos. Estos casos de éxito deben ser analizados minuciosamente para replicar su estructura creativa y táctica en el próximo trimestre.`
    };
    const sortedByInfluence = [...data].sort((a, b) => ((b.matriculado / b.abierto) || 0) - ((a.matriculado / a.abierto) || 0));
    return {
      topPerformers: sortedByInfluence.slice(0, 3),
      bottomPerformers: [...data].sort((a, b) => (a.abierto / a.entregado) - (b.abierto / b.entregado)).slice(0, 3),
      conclusions,
      bestChannel: hsmInf > emailInf ? 'HSM' : 'EMAIL',
      bestChannelRate: Math.max(hsmInf, emailInf).toFixed(2)
    };
  }, [data, stats]);

  const funnelProgressData = useMemo(() => {
    const filtered = funnelChannelFilter === 'all' ? data : data.filter(item => item.canal.toLowerCase().includes(funnelChannelFilter.toLowerCase()));
    const groups: Record<string, { avanzo: number, abierto: number }> = {};
    filtered.forEach(item => {
      const camp = item.campaña || 'Sin Nombre';
      if (!groups[camp]) groups[camp] = { avanzo: 0, abierto: 0 };
      groups[camp].avanzo += item.avanzo;
      groups[camp].abierto += item.abierto;
    });
    return Object.entries(groups).map(([name, g]) => ({ name, avanzoPerc: Number(((g.avanzo / g.abierto) * 100).toFixed(1)) || 0 })).sort((a, b) => b.avanzoPerc - a.avanzoPerc);
  }, [data, funnelChannelFilter]);

  const influenceProgressData = useMemo(() => {
    const filtered = influenceChannelFilter === 'all' ? data : data.filter(item => item.canal.toLowerCase().includes(influenceChannelFilter.toLowerCase()));
    const groups: Record<string, { matriculado: number, abierto: number }> = {};
    filtered.forEach(item => {
      const camp = item.campaña || 'Sin Nombre';
      if (!groups[camp]) groups[camp] = { matriculado: 0, abierto: 0 };
      groups[camp].matriculado += item.matriculado;
      groups[camp].abierto += item.abierto;
    });
    return Object.entries(groups).map(([name, g]) => ({ name, influencePerc: Number(((g.matriculado / g.abierto) * 100).toFixed(2)) || 0 })).sort((a, b) => b.influencePerc - a.influencePerc);
  }, [data, influenceChannelFilter]);

  const subscriptionProgressData = useMemo(() => {
    const filtered = subChannelFilter === 'all' ? data : data.filter(item => item.canal.toLowerCase().includes(subChannelFilter.toLowerCase()));
    const groups: Record<string, { subs: number }> = {};
    filtered.forEach(item => {
      const camp = item.campaña || 'Sin Nombre';
      if (!groups[camp]) groups[camp] = { subs: 0 };
      groups[camp].subs += item["suscripción cancelada"];
    });
    return Object.entries(groups).map(([name, g]) => ({ name, subs: g.subs })).sort((a, b) => b.subs - a.subs);
  }, [data, subChannelFilter]);

  const openRateByFormatData = useMemo(() => {
    const filtered = formatChannelFilter === 'all' ? data : data.filter(item => item.canal.toLowerCase().includes(formatChannelFilter.toLowerCase()));
    const groups: Record<string, { abiertos: number, entregados: number, matriculados: number }> = {};
    filtered.forEach(item => {
      const fmt = item.formato?.toLowerCase().trim() || 'n/a';
      if (!groups[fmt]) groups[fmt] = { abiertos: 0, entregados: 0, matriculados: 0 };
      groups[fmt].abiertos += item.abierto;
      groups[fmt].entregados += item.entregado;
      groups[fmt].matriculados += item.matriculado;
    });
    return Object.entries(groups).map(([name, g]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      openRate: Number(((g.abiertos / g.entregados) * 100).toFixed(1)) || 0,
      influenceRate: Number(((g.matriculados / g.abiertos) * 100).toFixed(2)) || 0
    })).sort((a, b) => b.openRate - a.openRate);
  }, [data, formatChannelFilter]);

  const channelData = useMemo(() => {
    const groups: Record<string, { enviado: number, entregado: number, abierto: number, avanzo: number }> = {};
    data.forEach(item => {
      const canal = item.canal || 'Desconocido';
      if (!groups[canal]) groups[canal] = { enviado: 0, entregado: 0, abierto: 0, avanzo: 0 };
      groups[canal].enviado += item.enviado;
      groups[canal].entregado += item.entregado;
      groups[canal].abierto += item.abierto;
      groups[canal].avanzo += item.avanzo;
    });
    return Object.keys(groups).map(canal => {
      const g = groups[canal];
      return {
        name: canal,
        "Entrega %": Number(((g.entregado / g.enviado) * 100).toFixed(1)) || 0,
        "Apertura %": Number(((g.abierto / g.entregado) * 100).toFixed(1)) || 0,
        "Avance Funnel %": Number(((g.avanzo / g.abierto) * 100).toFixed(1)) || 0
      };
    });
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full overflow-hidden text-slate-900">
      {/* VISTA GENERAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <StatCard title="Enviado" value={stats.totalSent.toLocaleString()} icon={<IconEmail />} color="blue" />
        <StatCard title="Entregado" value={stats.totalDelivered.toLocaleString()} subtitle={`${stats.avgDeliveryRate.toFixed(1)}% de éxito`} icon={<IconCheck />} color="blue" />
        <StatCard title="% Apertura" value={`${stats.avgOpenRate.toFixed(1)}%`} subtitle="Abiertos / Entregados" icon={<IconEye />} color="purple" />
        <StatCard title="% Clic" value={`${stats.avgClickRate.toFixed(1)}%`} subtitle="Clics / Entregados" icon={<IconCursor />} color="purple" />
        <StatCard title="% CTO" value={`${stats.avgCTO.toFixed(1)}%`} subtitle="Clics / Abiertos" icon={<IconZap />} color="amber" />
        <StatCard title="% Influencia" value={`${stats.avgInfluenceRate.toFixed(2)}%`} subtitle="Matriculados / Abiertos" icon={<IconUsers />} color="amber" />
        <StatCard title="% Avance Funnel" value={`${stats.avgFunnelAdvance.toFixed(1)}%`} subtitle="Avanzo / Abierto" icon={<IconTrend />} color="emerald" />
        <StatCard title="Suscripción" value={stats.totalUnsubs.toLocaleString()} subtitle="Dato de columna 'suscripción'" icon={<IconX />} color="red" />
      </div>

      {/* EFICACIA POR CANAL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
        <h3 className="text-xl font-bold text-slate-800 mb-8">Eficacia Ponderada por Canal</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelData} barGap={12}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} dy={5} />
              <YAxis axisLine={false} tickLine={false} hide />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="Entrega %" fill="#3b82f6" radius={[4, 4, 0, 0]}><LabelList dataKey="Entrega %" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold' }} /></Bar>
              <Bar dataKey="Apertura %" fill="#8b5cf6" radius={[4, 4, 0, 0]}><LabelList dataKey="Apertura %" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold' }} /></Bar>
              <Bar dataKey="Avance Funnel %" fill="#10b981" radius={[4, 4, 0, 0]}><LabelList dataKey="Avance Funnel %" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold' }} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* % AVANCE EN FUNNEL POR CAMPAÑA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h3 className="text-lg font-bold text-slate-800">% Avance en Funnel por Campaña</h3>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <FilterButton active={funnelChannelFilter === 'all'} onClick={() => setFunnelChannelFilter('all')} label="Todos" />
            <FilterButton active={funnelChannelFilter === 'email'} onClick={() => setFunnelChannelFilter('email')} label="Email" />
            <FilterButton active={funnelChannelFilter === 'hsm'} onClick={() => setFunnelChannelFilter('hsm')} label="HSM" />
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={funnelProgressData} margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
              <defs><linearGradient id="colorAvanzo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis axisLine={false} tickLine={false} unit="%" />
              <Tooltip formatter={(val: number) => [`${val}%`, 'Avance']} />
              <Area type="monotone" dataKey="avanzoPerc" stroke="#059669" fillOpacity={1} fill="url(#colorAvanzo)" dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="avanzoPerc" position="top" offset={10} formatter={(val: number) => `${val}%`} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#047857' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SUSCRIPCIÓN POR CAMPAÑA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Suscripción por Campaña</h3>
            <p className="text-sm text-slate-500">Métrica basada en la columna 'suscripción'</p>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <FilterButton active={subChannelFilter === 'all'} onClick={() => setSubChannelFilter('all')} label="Todos" />
            <FilterButton active={subChannelFilter === 'email'} onClick={() => setSubChannelFilter('email')} label="Email" />
            <FilterButton active={subChannelFilter === 'hsm'} onClick={() => setSubChannelFilter('hsm')} label="HSM" />
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={subscriptionProgressData} margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
              <defs><linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(val: number) => [val, 'Suscripción']} />
              <Area type="monotone" dataKey="subs" stroke="#dc2626" fillOpacity={1} fill="url(#colorSub)" dot={{ r: 4, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="subs" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#991b1b' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PERFORMANCE POR FORMATO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Performance por Formato: Apertura vs Influencia</h3>
            <p className="text-sm text-slate-500">Comparativa ponderada por formato (Texto, Imagen, Carrusel)</p>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <FilterButton active={formatChannelFilter === 'all'} onClick={() => setFormatChannelFilter('all')} label="Todos" />
            <FilterButton active={formatChannelFilter === 'email'} onClick={() => setFormatChannelFilter('email')} label="Email" />
            <FilterButton active={formatChannelFilter === 'hsm'} onClick={() => setFormatChannelFilter('hsm')} label="HSM" />
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={openRateByFormatData} margin={{ top: 40, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorFormatOpen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorFormatInf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} formatter={(val: number, name: string) => [`${val}%`, name === 'openRate' ? 'Tasa de Apertura' : 'Tasa de Influencia']} />
              <Area type="monotone" dataKey="openRate" name="openRate" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorFormatOpen)" dot={{ r: 6, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="openRate" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#5b21b6' }} />
              </Area>
              <Area type="monotone" dataKey="influenceRate" name="influenceRate" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorFormatInf)" dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="influenceRate" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1d4ed8' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RANKING TOP 10 APERTURA POR CAMPAÑA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Ranking: Top 10 Apertura por Campaña</h3>
            <p className="text-sm text-slate-500">Visualización detallada por nombre de campaña</p>
          </div>
          <div className="relative w-full md:w-72">
            <select 
              className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none cursor-pointer font-medium text-slate-700"
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <option value="all">Ver todas las campañas</option>
              {campaignOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={top10ByApertura} margin={{ top: 40, right: 30, left: 10, bottom: 60 }}>
              <defs>
                <linearGradient id="colorRankingOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fontWeight: 500, fill: '#64748b'}} 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={80} 
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} unit="%" domain={[0, 110]} hide />
              <Tooltip 
                cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                formatter={(val: number) => [`${val}%`, 'Tasa de Apertura']} 
              />
              <Area 
                type="monotone" 
                dataKey="apertura" 
                stroke="#7c3aed" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRankingOpen)" 
                dot={{ r: 6, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
              >
                <LabelList 
                  dataKey="apertura" 
                  position="top" 
                  offset={15}
                  formatter={(val: number) => `${val}%`} 
                  style={{ fontSize: '11px', fontWeight: 'bold', fill: '#5b21b6' }} 
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PERFORMANCE POR LÍNEA DE NEGOCIO (Ajustado para usar columna Línea de Negocio del Excel) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Performance por Línea de Negocio: Apertura vs Influencia</h3>
            <p className="text-sm text-slate-500">Métricas consolidadas desde la columna 'Línea de Negocio'</p>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <FilterButton active={lineChannelFilter === 'all'} onClick={() => setLineChannelFilter('all')} label="Todos" />
            <FilterButton active={lineChannelFilter === 'email'} onClick={() => setLineChannelFilter('email')} label="Email" />
            <FilterButton active={lineChannelFilter === 'hsm'} onClick={() => setLineChannelFilter('hsm')} label="HSM" />
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineOfBusinessData} margin={{ top: 40, right: 30, left: 10, bottom: 60 }}>
              <defs>
                <linearGradient id="colorLineOpenAdj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLineInfAdj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#475569'}} 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={80} 
                dy={10} 
              />
              <YAxis axisLine={false} tickLine={false} unit="%" domain={[0, 110]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                formatter={(val: number, name: string) => [`${val}%`, name === 'apertura' ? 'Tasa de Apertura' : 'Tasa de Influencia']} 
              />
              <Area 
                type="monotone" 
                dataKey="apertura" 
                name="apertura" 
                stroke="#7c3aed" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorLineOpenAdj)" 
                dot={{ r: 6, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }}
              >
                <LabelList dataKey="apertura" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#5b21b6' }} />
              </Area>
              <Area 
                type="monotone" 
                dataKey="influencia" 
                name="influencia" 
                stroke="#2563eb" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorLineInfAdj)" 
                dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              >
                <LabelList dataKey="influencia" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1d4ed8' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#7c3aed]"></div>
            % Apertura
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2563eb]"></div>
            % Influencia
          </div>
        </div>
      </div>

      {/* REPORTE ESTRATÉGICO FINAL */}
      {insights && (
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-800 w-full mt-12 animate-in slide-in-from-bottom duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">Análisis Estratégico & Conclusiones Ejecutivo</h2>
              <p className="text-slate-400 max-w-2xl">Diagnóstico profundo por componente para la toma de decisiones directivas.</p>
            </div>
            <div className="px-6 py-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Impacto de Canal</p>
              <p className="text-2xl font-black">{insights.bestChannel}</p>
              <p className="text-xs font-medium text-blue-300">Influencia: {insights.bestChannelRate}%</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReportBlock title="Eficacia de Canales (Weighted Analysis)" content={insights.conclusions.canales} icon={<IconZap />} />
            <ReportBlock title="Diagnóstico de Avance Funnel" content={insights.conclusions.funnel} icon={<IconTrend />} />
            <ReportBlock title="Evaluación de Formatos Creativos" content={insights.conclusions.formatos} icon={<IconEye />} />
            <ReportBlock title="Salud de Base de Datos y Churn" content={insights.conclusions.suscripcion} icon={<IconX />} />
          </div>
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/40 p-8 rounded-2xl border border-blue-500/20 mt-6">
            <h3 className="text-xl font-black text-blue-400 mb-4 flex items-center gap-2"><IconCheck /> CONCLUSIÓN GENERAL DE INFLUENCIA (ROI)</h3>
            <p className="text-slate-200 text-sm leading-relaxed font-medium">{insights.conclusions.influencia}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <ActionItem type="KEEP" title="Escalar Modelos Éxito" desc={`Mantener el canal ${insights.bestChannel} y el formato ${openRateByFormatData[0]?.name || 'líder'} como eje.`} color="emerald" />
            <ActionItem type="IMPROVE" title="Ajuste de Narrativa" desc="Rediseñar CTA en campañas de baja influencia para mejorar transición a matriculación." color="amber" />
            <ActionItem type="REMOVE" title="Higiene de Lista" desc="Eliminar disparadores de baja apertura para optimizar reputación de remitente." color="red" />
          </div>
        </div>
      )}

      {/* TABLA DE DETALLE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Detalle de Campañas</h3>
        <div className="overflow-x-auto max-h-[400px] w-full">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Campaña</th>
                <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">% Apertura</th>
                <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">% Avance</th>
                <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">% Influencia</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-[200px]">{item.nombre}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{( (item.abierto / item.entregado) * 100 || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{( (item.avanzo / item.abierto) * 100 || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-blue-600 font-bold font-mono">{( (item.matriculado / item.abierto) * 100 || 0).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReportBlock = ({ title, content, icon }: any) => (
  <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-all group">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="font-bold text-slate-100 text-sm uppercase tracking-wide">{title}</h4>
    </div>
    <p className="text-slate-400 text-xs leading-relaxed text-justify">{content}</p>
  </div>
);

const ActionItem = ({ type, title, desc, color }: any) => {
  const colors: any = { emerald: 'text-emerald-400 bg-emerald-500/10', amber: 'text-amber-400 bg-amber-500/10', red: 'text-red-400 bg-red-500/10' };
  return (
    <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${colors[color]}`}>{type}</span>
        <p className="text-xs font-bold text-white">{title}</p>
      </div>
      <p className="text-[10px] text-slate-400 leading-normal">{desc}</p>
    </div>
  );
};

const FilterButton = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
);

const StatCard = ({ title, value, subtitle, icon, color }: any) => {
  const colors: any = { blue: 'text-blue-600 bg-blue-50', emerald: 'text-emerald-600 bg-emerald-50', amber: 'text-amber-600 bg-amber-50', purple: 'text-purple-600 bg-purple-50', red: 'text-red-600 bg-red-50' };
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate mr-2">{title}</h4>
        <div className={`p-1.5 rounded-lg shrink-0 ${colors[color]}`}>{icon}</div>
      </div>
      <div className="overflow-hidden">
        <div className="text-xl font-bold text-slate-900 truncate">{value}</div>
        {subtitle && <div className="text-[9px] font-medium text-slate-400 mt-0.5 truncate">{subtitle}</div>}
      </div>
    </div>
  );
};

const IconEmail = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>;
const IconCheck = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconEye = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const IconCursor = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>;
const IconZap = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconUsers = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const IconTrend = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const IconX = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default Dashboard;
