import React, { useState, useEffect } from 'react';
import { Trophy, Search, MapPin, FilterX, Loader2 } from 'lucide-react';

interface SpecialistMetric {
  id: string;
  nome: string;
  municipio: string;
  volumeCasos: number;
  taxaResolucao: number; // percentage (0-100)
  tempoMedioResposta: number; // in hours
  scoreQualidade: number; // 0-100
}

export const RankingEspecialistas: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [municipioFilter, setMunicipioFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // High fidelity mock aggregate data reflecting index.ts structures
  const [rankingList, setRankingList] = useState<SpecialistMetric[]>([]);

  const mockData: SpecialistMetric[] = [
    { id: '1', nome: 'Dra. Ana Beatriz Silva', municipio: 'São Paulo', volumeCasos: 48, taxaResolucao: 96, tempoMedioResposta: 1.5, scoreQualidade: 95 },
    { id: '2', nome: 'Dr. Marcos Oliveira', municipio: 'São Bernardo do Campo', volumeCasos: 42, taxaResolucao: 92, tempoMedioResposta: 2.2, scoreQualidade: 89 },
    { id: '3', nome: 'Dra. Juliana Mendes', municipio: 'São Paulo', volumeCasos: 37, taxaResolucao: 89, tempoMedioResposta: 3.0, scoreQualidade: 84 },
    { id: '4', nome: 'Dr. Carlos Roberto', municipio: 'Campinas', volumeCasos: 29, taxaResolucao: 85, tempoMedioResposta: 4.8, scoreQualidade: 78 },
    { id: '5', nome: 'Dra. Patrícia Costa', municipio: 'São José dos Campos', volumeCasos: 22, taxaResolucao: 80, tempoMedioResposta: 5.5, scoreQualidade: 68 },
    { id: '6', nome: 'Dr. Fernando Souza', municipio: 'Ribeirão Preto', volumeCasos: 15, taxaResolucao: 73, tempoMedioResposta: 12.0, scoreQualidade: 62 },
  ];

  // Fetch ranking metrics with delay to simulate API load
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setRankingList(mockData);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleClearFilters = () => {
    setSearchTerm('');
    setMunicipioFilter('');
    setDataInicio('');
    setDataFim('');
  };

  const getScoreBadge = (score: number) => {
    if (score > 85) {
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
          Excelente
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          Bom
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-250">
        Precisa Melhorar
      </span>
    );
  };

  const getMedal = (index: number) => {
    switch (index) {
      case 0: return <span className="text-lg" title="1º Colocado">🥇</span>;
      case 1: return <span className="text-lg" title="2º Colocado">🥈</span>;
      case 2: return <span className="text-lg" title="3º Colocado">🥉</span>;
      default: return <span className="text-xs text-gray-400 font-mono pl-1">#{index + 1}</span>;
    }
  };

  // Filter list based on UI inputs
  const filteredRanking = rankingList.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMunicipio = municipioFilter === '' || item.municipio.toLowerCase().includes(municipioFilter.toLowerCase());
    // Date filters simulated
    return matchesSearch && matchesMunicipio;
  });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-indigo-600" />
            Ranking e Desempenho de Especialistas
          </h3>
          <p className="text-xs text-gray-500 mt-1">Acompanhe métricas de produtividade, SLA e pontuações médicas gerais</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar especialista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Município..."
            value={municipioFilter}
            onChange={(e) => setMunicipioFilter(e.target.value)}
            className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 col-span-1">
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
            <FilterX className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Metrics List/Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-gray-150">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredRanking.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-150">
          Nenhum resultado correspondente aos filtros.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">Posição</th>
                  <th className="px-6 py-4">Especialista</th>
                  <th className="px-6 py-4">Município</th>
                  <th className="px-6 py-4 text-center">Casos Respondidos</th>
                  <th className="px-6 py-4 text-center">Taxa Resolução</th>
                  <th className="px-6 py-4 text-center">Tempo Médio Resposta</th>
                  <th className="px-6 py-4 text-center">Qualidade (Score)</th>
                  <th className="px-6 py-4 text-right">Classificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {filteredRanking.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-55/30 transition">
                    <td className="px-6 py-4 text-center">
                      {getMedal(index)}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {item.nome}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.municipio}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-800">
                      {item.volumeCasos}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-gray-800">{item.taxaResolucao}%</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1 mt-1">
                          <div 
                            className="bg-indigo-500 h-1 rounded-full" 
                            style={{ width: `${item.taxaResolucao}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-700">
                      {item.tempoMedioResposta}h
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {item.scoreQualidade}/100
                    </td>
                    <td className="px-6 py-4 text-right">
                      {getScoreBadge(item.scoreQualidade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
