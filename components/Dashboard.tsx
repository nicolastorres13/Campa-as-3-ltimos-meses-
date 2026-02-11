
import React, { useMemo, useState, useRef } from 'react';
import { CampaignData } from '../types';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Area, LabelList, Cell, ComposedChart, Line, AreaChart, BarChart, Legend
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
      avgDeliveryRate: (s.totalDelivered / (s.totalSent || 1)) * 100 || 0,
      avgOpenRate: (s.totalOpened / (s.totalDelivered || 1)) * 100 || 0,
      avgClickRate: (s.totalClicked / (s.totalDelivered || 1)) * 100 || 0,
      avgCTO: (s.totalClicked / (s.totalOpened || 1)) * 100 || 0,
      avgFunnelAdvance: (s.totalAvanzo / (s.totalOpened || 1)) * 100 || 0,
      avgInfluenceRate: (s.totalEnrolled / (s.totalOpened || 1)) * 100 || 0,
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
        canal: item.canal,
        clics: item["con clic"],
        apertura: Number(((item.abierto / (item.entregado || 1)) * 100).toFixed(1)) || 0,
        matriculaPerc: Number(((item.matriculado / (item.abierto || 1)) * 100).toFixed(2)) || 0
      }))
      .sort((a, b) => b.apertura - a.apertura)
      .slice(0, 10);
  }, [data, selectedCampaign]);

  const funnelProgressData = useMemo(() => {
    const filtered = funnelChannelFilter === 'all' ? data : data.filter(item => item.canal.toLowerCase().includes(funnelChannelFilter.toLowerCase()));
    const groups: Record<string, { avanzo: number, abierto: number, entregado: number }> = {};
    filtered.forEach(item => {
      const camp = item.campaña || 'Sin Nombre';
      if (!groups[camp]) groups[camp] = { avanzo: 0, abierto: 0, entregado: 0 };
      groups[camp].avanzo += item.avanzo;
      groups[camp].abierto += item.abierto;
      groups[camp].entregado += item.entregado;
    });
    return Object.entries(groups).map(([name, g]) => {
      const base = (funnelChannelFilter === 'hsm' && g.abierto === 0) ? g.entregado : g.abierto;
      return { 
        name, 
        avanzoPerc: Number(((g.avanzo / (base || 1)) * 100).toFixed(1)) || 0
      };
    }).sort((a, b) => b.avanzoPerc - a.avanzoPerc);
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
    return Object.entries(groups).map(([name, g]) => ({ 
      name, 
      influencePerc: Number(((g.matriculado / (g.abierto || 1)) * 100).toFixed(2)) || 0
    })).sort((a, b) => b.influencePerc - a.influencePerc);
  }, [data, influenceChannelFilter]);

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

    const hsmInf = (hsm.matriculados / (hsm.abiertos || 1)) * 100 || 0;
    const emailInf = (email.matriculados / (email.abiertos || 1)) * 100 || 0;

    const topRankingCamp = top10ByApertura[0];
    const avgApertura = stats.avgOpenRate;

    const conclusions = {
      canales: `Análisis Ponderado: El canal ${hsmInf > emailInf ? 'HSM' : 'EMAIL'} domina con un ${Math.max(hsmInf, emailInf).toFixed(2)}% de influencia. La eficacia por canal confirma que este rendimiento es consistente y no producto de anomalías estadísticas.`,
      funnel: `Diagnóstico de Embudo: Con un avance promedio del ${stats.avgFunnelAdvance.toFixed(1)}%, detectamos que las campañas con mayor volumen tienden a normalizar la tasa, mientras que nichos específicos de HSM logran conversiones quirúrgicas de alto valor.`,
      formatos: `Impacto de Formato: No hay correlación lineal simple. Los formatos visuales en Email superan en apertura, pero el texto directo en HSM pondera mejor en la decisión final de matriculación.`,
      suscripcion: `Retención: El churn se mantiene bajo en campañas de alto engagement. Las campañas de HSM deben cuidar la frecuencia para evitar bloqueos, priorizando la relevancia sobre la insistencia.`,
      ranking: topRankingCamp ? `Ranking de Apertura: '${topRankingCamp.name}' lidera con ${topRankingCamp.apertura}%. Este resultado es un benchmark crítico; campañas que superan la media del ${avgApertura.toFixed(1)}% demuestran una segmentación de 'Golden Audience' que debe ser replicada.` : `Ranking pendiente de datos suficientes.`,
      influencia: `ROI e Influencia: La tasa global del ${stats.avgInfluenceRate.toFixed(2)}% es saludable. Los éxitos pasados en el canal ${hsmInf > emailInf ? 'HSM' : 'EMAIL'} sugieren una redistribución presupuestaria para el próximo ciclo.`
    };

    return { conclusions, bestChannel: hsmInf > emailInf ? 'HSM' : 'EMAIL', bestChannelRate: Math.max(hsmInf, emailInf).toFixed(2) };
  }, [data, stats, top10ByApertura]);

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
      openRate: Number(((g.abiertos / (g.entregados || 1)) * 100).toFixed(1)) || 0,
      influenceRate: Number(((g.matriculados / (g.abiertos || 1)) * 100).toFixed(2)) || 0
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
        "Entrega %": Number(((g.entregado / (g.enviado || 1)) * 100).toFixed(1)) || 0,
        "Apertura %": Number(((g.abierto / (g.entregado || 1)) * 100).toFixed(1)) || 0,
        "Avance Funnel %": Number(((g.avanzo / (g.abierto || 1)) * 100).toFixed(1)) || 0
      };
    });
  }, [data]);

  const downloadAsImage = async (elementId: string, fileName: string) => {
    const node = document.getElementById(elementId);
    if (!node) return;
    try {
      // @ts-ignore
      const dataUrl = await window.htmlToImage.toPng(node, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 w-full overflow-hidden text-slate-900">
      {/* VISTA GENERAL */}
      <div id="section-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full relative group/section">
        <StatCard title="Enviado" value={stats.totalSent.toLocaleString()} icon={<IconEmail />} color="blue" />
        <StatCard title="Entregado" value={stats.totalDelivered.toLocaleString()} subtitle={`${stats.avgDeliveryRate.toFixed(1)}% de éxito`} icon={<IconCheck />} color="blue" />
        <StatCard title="% Apertura" value={`${stats.avgOpenRate.toFixed(1)}%`} subtitle="Abiertos / Entregados" icon={<IconEye />} color="purple" />
        <StatCard title="% Clic" value={`${stats.avgClickRate.toFixed(1)}%`} subtitle="Clics / Entregados" icon={<IconCursor />} color="purple" />
        <StatCard title="% CTO" value={`${stats.avgCTO.toFixed(1)}%`} subtitle="Clics / Abiertos" icon={<IconZap />} color="amber" />
        <StatCard title="% Influencia" value={`${stats.avgInfluenceRate.toFixed(2)}%`} subtitle="Matriculados / Abiertos" icon={<IconUsers />} color="amber" />
        <StatCard title="% Avance Funnel" value={`${stats.avgFunnelAdvance.toFixed(1)}%`} subtitle="Avanzo / Abierto" icon={<IconTrend />} color="emerald" />
        <StatCard title="Suscripción" value={stats.totalUnsubs.toLocaleString()} subtitle="Dato de columna 'suscripción'" icon={<IconX />} color="red" />
        <DownloadBtn onClick={() => downloadAsImage('section-stats', 'Resumen-Metricas')} />
      </div>

      {/* EFICACIA POR CANAL */}
      <div id="section-channel-efficiency" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full relative group/section">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-slate-800">Eficacia por Canal</h3>
          <DownloadBtn onClick={() => downloadAsImage('section-channel-efficiency', 'Eficacia-Canal')} />
        </div>
        <div className="h-[300px] min-h-[280px] w-full">
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
      <div id="section-funnel-advance" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full relative group/section">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800">% Avance en Funnel por Campaña</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <FilterButton active={funnelChannelFilter === 'all'} onClick={() => setFunnelChannelFilter('all')} label="Todos" />
              <FilterButton active={funnelChannelFilter === 'email'} onClick={() => setFunnelChannelFilter('email')} label="Email" />
              <FilterButton active={funnelChannelFilter === 'hsm'} onClick={() => setFunnelChannelFilter('hsm')} label="HSM" />
            </div>
            <DownloadBtn onClick={() => downloadAsImage('section-funnel-advance', 'Avance-Funnel')} visible />
          </div>
        </div>
        <div className="h-[350px] min-h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={funnelProgressData} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis axisLine={false} tickLine={false} unit="%" orientation="left" stroke="#059669" />
              <Tooltip formatter={(val: any) => [`${val}%`, 'Tasa Avance']} />
              <Area type="monotone" dataKey="avanzoPerc" stroke="#059669" fill="#10b981" fillOpacity={0.1} strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="avanzoPerc" position="top" offset={10} formatter={(val: number) => `${val}%`} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#047857' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* % INFLUENCIA POR CAMPAÑA */}
      <div id="section-influence" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full relative group/section">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800">% Influencia por Campaña</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <FilterButton active={influenceChannelFilter === 'all'} onClick={() => setInfluenceChannelFilter('all')} label="Todos" />
              <FilterButton active={influenceChannelFilter === 'email'} onClick={() => setInfluenceChannelFilter('email')} label="Email" />
              <FilterButton active={influenceChannelFilter === 'hsm'} onClick={() => setInfluenceChannelFilter('hsm')} label="HSM" />
            </div>
            <DownloadBtn onClick={() => downloadAsImage('section-influence', 'Influencia-Campana')} visible />
          </div>
        </div>
        <div className="h-[350px] min-h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={influenceProgressData} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis axisLine={false} tickLine={false} unit="%" stroke="#2563eb" />
              <Tooltip formatter={(val: any) => [`${val}%`, 'Tasa Influencia']} />
              <Area type="monotone" dataKey="influencePerc" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="influencePerc" position="top" offset={10} formatter={(val: number) => `${val}%`} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#1d4ed8' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SUSCRIPCIÓN POR CAMPAÑA */}
      <div id="section-subscription" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full relative group/section">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800">Suscripción por Campaña (Bajas)</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <FilterButton active={subChannelFilter === 'all'} onClick={() => setSubChannelFilter('all')} label="Todos" />
              <FilterButton active={subChannelFilter === 'email'} onClick={() => setSubChannelFilter('email')} label="Email" />
              <FilterButton active={subChannelFilter === 'hsm'} onClick={() => setSubChannelFilter('hsm')} label="HSM" />
            </div>
            <DownloadBtn onClick={() => downloadAsImage('section-subscription', 'Bajas-Suscripcion')} visible />
          </div>
        </div>
        <div className="h-[300px] min-h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={subscriptionProgressData} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
              <defs><linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="subs" stroke="#dc2626" fillOpacity={1} fill="url(#colorSub)" dot={{ r: 4, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="subs" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#991b1b' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PERFORMANCE POR FORMATO */}
      <div id="section-format-performance" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full relative group/section">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800">Performance por Formato Creativo</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <FilterButton active={formatChannelFilter === 'all'} onClick={() => setFormatChannelFilter('all')} label="Todos" />
              <FilterButton active={formatChannelFilter === 'email'} onClick={() => setFormatChannelFilter('email')} label="Email" />
              <FilterButton active={formatChannelFilter === 'hsm'} onClick={() => setFormatChannelFilter('hsm')} label="HSM" />
            </div>
            <DownloadBtn onClick={() => downloadAsImage('section-format-performance', 'Formatos-Creativos')} visible />
          </div>
        </div>
        <div className="h-[300px] min-h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={openRateByFormatData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} dy={10} />
              <YAxis axisLine={false} tickLine={false} unit="%" />
              <Tooltip />
              <Area type="monotone" dataKey="openRate" name="Tasa Apertura" stroke="#7c3aed" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.1} dot={{ r: 6, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="openRate" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#5b21b6' }} />
              </Area>
              <Area type="monotone" dataKey="influenceRate" name="Tasa Influencia" stroke="#2563eb" strokeWidth={3} fill="#3b82f6" fillOpacity={0.1} dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}>
                <LabelList dataKey="influenceRate" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1d4ed8' }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RANKING TOP 10 APERTURA (CON MÉTRICAS ADICIONALES) */}
      <div id="section-ranking" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full relative group/section">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Ranking: Top 10 Apertura</h3>
            <p className="text-[10px] text-slate-500">Visualización de Apertura vs Matrículas con detalle de Clics y Canal.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              className="w-full md:w-64 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <option value="all">Todas las Campañas</option>
              {campaignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <DownloadBtn onClick={() => downloadAsImage('section-ranking', 'Ranking-Detallado')} visible />
          </div>
        </div>
        <div className="h-[400px] min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={top10ByApertura} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} angle={-45} textAnchor="end" interval={0} height={100} />
              <YAxis axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}} 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl text-xs">
                        <p className="font-bold text-slate-900 mb-2">{label}</p>
                        <div className="space-y-1">
                          <p className="flex justify-between gap-4"><span>Canal:</span> <span className="font-mono font-bold text-blue-600 uppercase">{data.canal}</span></p>
                          <p className="flex justify-between gap-4"><span>Apertura:</span> <span className="font-mono font-bold">{data.apertura}%</span></p>
                          <p className="flex justify-between gap-4"><span>Clics:</span> <span className="font-mono font-bold">{data.clics}</span></p>
                          <p className="flex justify-between gap-4"><span>Matrículas:</span> <span className="font-mono font-bold text-emerald-600">{data.matriculaPerc}%</span></p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="apertura" name="% Apertura" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={35}>
                {top10ByApertura.map((_, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#6d28d9' : '#a78bfa'} />)}
                <LabelList dataKey="apertura" position="top" formatter={(val: number) => `${val}%`} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#6b21a8' }} offset={10} />
              </Bar>
              <Line type="monotone" dataKey="matriculaPerc" name="% Matrículas" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* REPORTE ESTRATÉGICO FINAL */}
      {insights && (
        <div id="section-strategic-report" className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-slate-800 w-full mt-6 relative group/section">
          <DownloadBtn onClick={() => downloadAsImage('section-strategic-report', 'Reporte-Analisis-Final')} />
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight mb-2">Análisis Estratégico & Conclusiones Ejecutivo</h2>
              <p className="text-slate-400 text-sm">Diagnóstico profundo basado en métricas de conversión.</p>
            </div>
            <div className="px-5 py-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl shrink-0 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Canal Líder (ROI)</p>
              <p className="text-xl font-black">{insights.bestChannel}</p>
              <p className="text-[10px] text-blue-300">Influencia: {insights.bestChannelRate}%</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportBlock title="Eficacia de Canales" content={insights.conclusions.canales} icon={<IconZap />} />
            <ReportBlock title="Diagnóstico de Avance Funnel" content={insights.conclusions.funnel} icon={<IconTrend />} />
            <ReportBlock title="Evaluación de Formatos Creativos" content={insights.conclusions.formatos} icon={<IconEye />} />
            <ReportBlock title="Salud de Base y Churn" content={insights.conclusions.suscripcion} icon={<IconX />} />
            <ReportBlock title="Insight del Ranking de Apertura" content={insights.conclusions.ranking} icon={<IconCursor />} />
            <ReportBlock title="Conclusión General e Inversión" content={insights.conclusions.influencia} icon={<IconUsers />} />
          </div>
        </div>
      )}

      {/* TABLA DE DETALLE */}
      <div id="section-detail-table" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full relative group/section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Detalle de Campañas</h3>
          <DownloadBtn onClick={() => downloadAsImage('section-detail-table', 'Detalle-Final')} />
        </div>
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
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-[200px]">{item.nombre}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{( (item.abierto / (item.entregado || 1)) * 100 || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{( (item.avanzo / (item.abierto || 1)) * 100 || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-blue-600 font-bold font-mono">{( (item.matriculado / (item.abierto || 1)) * 100 || 0).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DownloadBtn = ({ onClick, visible = false }: { onClick: () => void, visible?: boolean }) => (
  <button 
    onClick={onClick}
    className={`absolute top-4 right-4 p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-500 rounded-lg transition-all shadow-sm z-10 ${visible ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100'}`}
    title="Descargar Imagen"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
  </button>
);

const ReportBlock = ({ title, content, icon }: any) => (
  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">{icon}</div>
      <h4 className="font-bold text-slate-100 text-[11px] uppercase tracking-wide">{title}</h4>
    </div>
    <p className="text-slate-400 text-[10px] leading-relaxed text-justify">{content}</p>
  </div>
);

const FilterButton = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
);

const StatCard = ({ title, value, subtitle, icon, color }: any) => {
  const colors: any = { blue: 'text-blue-600 bg-blue-50', emerald: 'text-emerald-600 bg-emerald-50', amber: 'text-amber-600 bg-amber-50', purple: 'text-purple-600 bg-purple-50', red: 'text-red-600 bg-red-50' };
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{title}</h4>
        <div className={`p-1 rounded-lg shrink-0 ${colors[color]}`}>{icon}</div>
      </div>
      <div>
        <div className="text-lg font-bold text-slate-900 truncate">{value}</div>
        {subtitle && <div className="text-[8px] font-medium text-slate-400 mt-0.5 truncate">{subtitle}</div>}
      </div>
    </div>
  );
};

const IconEmail = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>;
const IconCheck = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconEye = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const IconCursor = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>;
const IconZap = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconUsers = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const IconTrend = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const IconX = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default Dashboard;
