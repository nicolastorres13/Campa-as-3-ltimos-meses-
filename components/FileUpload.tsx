
import React from 'react';
import { CampaignData } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: CampaignData[]) => void;
  setLoading: (loading: boolean) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, setLoading }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        // @ts-ignore
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // @ts-ignore
        const rawData = XLSX.utils.sheet_to_json(ws);

        const mappedData: CampaignData[] = rawData.map((row: any) => {
          const unsubsValue = 
            row["suscripción"] || 
            row["suscripcion"] || 
            row["Suscripción"] || 
            row["Suscripcion"] || 
            row["suscripción cancelada"] || 
            row["suscripcion cancelada"] || 
            row["Suscripción Cancelada"] || 
            row["cancelada"] || 
            0;

          const campName = row.campaña || row.Campaña || row.Campaign || 'Sin ID';
          const displayName = row.nombre || row.Nombre || campName;

          return {
            campaña: campName,
            nombre: displayName,
            matriculado: Number(row.matriculado || row.Matriculado || 0),
            avanzo: Number(row.avanzo || row.Avanzo || 0),
            enviado: Number(row.enviado || row.Enviado || 0),
            entregado: Number(row.entregado || row.Entregado || 0),
            abierto: Number(row.abierto || row.Abierto || 0),
            "con clic": Number(row["con clic"] || row["Con Clic"] || row.clic || 0),
            rebotar: Number(row.rebotar || row.Rebotar || 0),
            "suscripción cancelada": Number(unsubsValue),
            "bounced usuario desconocido": Number(row["bounced usuario desconocido"] || 0),
            "bounced mala configuración del buzón": Number(row["bounced mala configuración del buzón"] || 0),
            "tipo de suscripción": String(row["tipo de suscripción"] || row["Tipo de suscripción"] || 'N/A'),
            asunto: String(row.asunto || row.Asunto || 'N/A'),
            estado: String(row.estado || row.Estado || 'N/A'),
            "línea de negocio": String(row["línea de negocio"] || row["Línea de negocio"] || 'N/A'),
            canal: String(row.canal || row.Canal || 'N/A'),
            formato: String(row.formato || row.Formato || 'N/A'),
          };
        });

        onDataLoaded(mappedData);
      } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Error al leer el archivo Excel.");
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="w-full max-w-lg">
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-blue-300 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-blue-50 transition-all shadow-sm">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-12 h-12 mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mb-2 text-sm text-slate-700">
            <span className="font-semibold">Haz clic para subir el Excel</span>
          </p>
          <p className="text-xs text-slate-500 text-center px-4">Columnas: nombre, campaña, matriculado, avanzo, enviado, entregado, abierto, suscripción, estado, formato, canal...</p>
        </div>
        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
      </label>
    </div>
  );
};

export default FileUpload;
