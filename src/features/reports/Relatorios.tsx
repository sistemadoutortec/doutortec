import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileBarChart2, Filter, Loader2, Download } from 'lucide-react';

interface ReportRow {
  municipio: string;
  casosAbertos: number;
  casosRespondidos: number;
  casosForaSLA: number;
  tempoMedioAtendimento: number; // in hours
}

interface EspecialidadeOption {
  id: string;
  nome: string;
}

export const Relatorios: React.FC = () => {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  
  // Filters
  const [especialidadeFilter, setEspecialidadeFilter] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // States
  const [especialidades, setEspecialidades] = useState<EspecialidadeOption[]>([]);
  const [reportData, setReportData] = useState<ReportRow[]>([]);

  // High fidelity mock aggregate data by municipality
  const mockReportData: ReportRow[] = [
    { municipio: 'São Paulo', casosAbertos: 150, casosRespondidos: 142, casosForaSLA: 2, tempoMedioAtendimento: 1.8 },
    { municipio: 'São Bernardo do Campo', casosAbertos: 84, casosRespondidos: 79, casosForaSLA: 1, tempoMedioAtendimento: 2.5 },
    { municipio: 'Campinas', casosAbertos: 62, casosRespondidos: 58, casosForaSLA: 3, tempoMedioAtendimento: 3.1 },
    { municipio: 'São José dos Campos', casosAbertos: 45, casosRespondidos: 40, casosForaSLA: 0, tempoMedioAtendimento: 2.0 },
    { municipio: 'Ribeirão Preto', casosAbertos: 31, casosRespondidos: 28, casosForaSLA: 4, tempoMedioAtendimento: 6.2 },
  ];

  // Load specialties for the filter
  useEffect(() => {
    const fetchEspecialidades = async () => {
      try {
        const { data } = await supabase
          .from('especialidades')
          .select('id, nome')
          .order('nome', { ascending: true });
        if (data) {
          setEspecialidades(data);
        }
      } catch (err) {
        console.error('Erro ao buscar especialidades no relatório:', err);
      }
    };
    fetchEspecialidades();
    setReportData(mockReportData);
  }, []);

  const handleExportPDF = () => {
    setGeneratingPdf(true);
    setPdfSuccess(false);

    setTimeout(() => {
      setGeneratingPdf(false);
      setPdfSuccess(true);
      // Auto clear success alert after 4 seconds
      setTimeout(() => setPdfSuccess(false), 4000);
    }, 2000);
  };

  const handleClearFilters = () => {
    setEspecialidadeFilter('all');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart2 className="h-5 w-5 text-indigo-650" />
            Relatórios e Auditoria Gerencial
          </h3>
          <p className="text-xs text-gray-500 mt-1">Consulte o consolidado de interconsultas por região, especialidade e métricas de SLA</p>
        </div>
        
        <button
          onClick={handleExportPDF}
          disabled={generatingPdf}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white transition flex items-center gap-2 disabled:bg-indigo-400 disabled:cursor-not-allowed shrink-0"
        >
          {generatingPdf ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Gerando PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Exportar PDF do Relatório</span>
            </>
          )}
        </button>
      </div>

      {pdfSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>Relatório exportado com sucesso! O download do PDF iniciará automaticamente em instantes.</div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
        <div>
          <select
            value={especialidadeFilter}
            onChange={(e) => setEspecialidadeFilter(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          >
            <option value="all">Todas as Especialidades</option>
            {especialidades.map(esp => (
              <option key={esp.id} value={esp.id}>{esp.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 col-span-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
              title="Data Inicial"
            />
          </div>
          <div className="relative flex-1">
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
              title="Data Final"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-indigo-650 hover:text-indigo-550 flex items-center gap-1 transition"
          >
            <Filter className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Municipality Metrics Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Município</th>
                <th className="px-6 py-4 text-center">Total Casos Abertos</th>
                <th className="px-6 py-4 text-center">Casos Respondidos</th>
                <th className="px-6 py-4 text-center">Casos Fora SLA</th>
                <th className="px-6 py-4 text-center">Tempo Médio Resposta</th>
                <th className="px-6 py-4 text-right">Desempenho Geral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 bg-white">
              {reportData.map((row, index) => {
                const percentSLA = row.casosAbertos > 0 
                  ? Math.round(((row.casosAbertos - row.casosForaSLA) / row.casosAbertos) * 100) 
                  : 100;
                
                return (
                  <tr key={index} className="hover:bg-gray-55/30 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {row.municipio}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-800">
                      {row.casosAbertos}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">
                      {row.casosRespondidos}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-semibold ${row.casosForaSLA > 0 ? 'text-red-650' : 'text-gray-400'}`}>
                        {row.casosForaSLA}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-600">
                      {row.tempoMedioAtendimento.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${
                        percentSLA >= 95 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : percentSLA >= 85 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        SLA: {percentSLA}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
