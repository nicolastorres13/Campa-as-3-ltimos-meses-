
export interface CampaignData {
  campaña: string;
  nombre: string;
  matriculado: number;
  avanzo: number;
  enviado: number;
  entregado: number;
  abierto: number;
  "con clic": number;
  rebotar: number;
  "suscripción cancelada": number;
  "bounced usuario desconocido": number;
  "bounced mala configuración del buzón": number;
  "tipo de suscripción": string;
  asunto: string;
  estado: string;
  "línea de negocio": string;
  canal: string;
  formato: string;
}

export interface DashboardStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalEnrolled: number;
  totalAvanzo: number;
  totalBounce: number;
  avgDeliveryRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgCTO: number;
  avgFunnelAdvance: number;
  avgBounceRate: number;
  avgEnrollmentRate: number;
  avgInfluenceRate: number;
}
