import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Trophy, Search, MapPin, FilterX, Loader2, AlertCircle } from 'lucide-react';

interface SpecialistMetric {
  id: string;
  nome: string;
  municipio: string;
  volumeCasos: number;
  taxaResolucao: number;
  tempoMedioResposta: number;
  scoreQualidade: number;
}

export const RankingEspecialistas: React.FC = () => {
  const [municipioFilter, setMunicipioFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // TanStack Query to fetch specialists, cases, and evaluations in parallel and compute metrics
  const { data: rankingList = [], isLoading, error } = useQuery<SpecialistMetric[]>({
    queryKey: ['ranking-especialistas', dataInicio, dataFim, municipioFilter],
    queryFn: async () => {
      // 1. Fetch approved specialists
      const { data: specialists, error: espError } = await supabase
        .from('perfis')
        .select('id, nome, municipio, crm_coren')
        .eq('role', 'especialista')
        .eq('status_cadastro', 'aprovado');

      if (espError) throw espError;

      // 2. Fetch cases that are assigned to specialists
      let casesQuery = supabase
        .from('casos')
        .select(`
          id, especialista_id, status, created_at, respondido_em, solicitante_id,
          solicitante:perfis!solicitante_id(municipio)
        `)
        .not('especialista_id', 'is', null)
        .in('status', ['em_progresso', 'respondido', 'fechado']);

      if (dataInicio) {
        casesQuery = casesQuery.gte('created_at', `${dataInicio}T00:00:00Z`);
      }
      if (dataFim) {
        casesQuery = casesQuery.lte('created_at', `${dataFim}T23:59:59Z`);
      }

      const { data: cases, error: casesError } = await casesQuery;
      if (casesError) throw casesError;

      // 3. Fetch evaluations
      const { data: avaliacoes, error: avalError } = await supabase
        .from('casos_avaliacoes')
        .select('caso_id, especialista_id, grau_satisfacao');
      if (avalError) throw avalError;

      const filterMunLower = municipioFilter.trim().toLowerCase();

      // Filter cases in-memory by solicitante municipality
      const validCasos = (cases || []).filter(c => {
        if (!filterMunLower) return true;
        const mun = (c.solicitante as any)?.municipio || '';
        return mun.toLowerCase().includes(filterMunLower);
      });

      const validCasoIds = new Set(validCasos.map(c => c.id));
      const validAvaliacoes = (avaliacoes || []).filter(a => validCasoIds.has(a.caso_id));

      // 4. Compute metrics per specialist
      const resultList = (specialists || []).map(esp => {
        const espCasosAtribuidos = validCasos.filter(c => c.especialista_id === esp.id);
        const espCasosResolvidos = espCasosAtribuidos.filter(c => c.status === 'respondido' || c.status === 'fechado');
        
        const volumeCasos = espCasosResolvidos.length;
        const taxaResolucao = espCasosAtribuidos.length > 0 
          ? Math.round((espCasosResolvidos.length / espCasosAtribuidos.length) * 100)
          : 100;

        // Tempo médio de resposta
        let totalHoras = 0;
        let countTempos = 0;
        espCasosResolvidos.forEach(c => {
          if (c.respondido_em) {
            const fim = new Date(c.respondido_em).getTime();
            const inicio = new Date(c.created_at).getTime();
            const diffMs = fim - inicio;
            if (diffMs > 0) {
              totalHoras += diffMs / (1000 * 60 * 60);
              countTempos++;
            }
          }
        });
        const tempoMedioResposta = countTempos > 0 
          ? parseFloat((totalHoras / countTempos).toFixed(1)) 
          : 0;

        // Score de qualidade (grau_satisfacao 1-5 de casos_avaliacoes)
        const espAvals = validAvaliacoes.filter(a => a.especialista_id === esp.id);
        const somaGrau = espAvals.reduce((acc, curr) => acc + curr.grau_satisfacao, 0);
        const scoreQualidade = espAvals.length > 0 
          ? parseFloat((somaGrau / espAvals.length).toFixed(1)) 
          : 0;

        return {
          id: esp.id,
          nome: esp.nome,
          municipio: esp.municipio || 'Não especificado',
          volumeCasos,
          taxaResolucao,
          tempoMedioResposta,
          scoreQualidade
        };
      });

      // Sort by resolved cases volume descending
      return resultList.sort((a, b) => b.volumeCasos - a.volumeCasos);
    }
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setMunicipioFilter('');
    setDataInicio('');
    setDataFim('');
  };

  const getScoreBadge = (score: number) => {
    if (score === 0) {
      return (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-500 border border-gray-200">
          Sem avaliações
        </span>
      );
    }
    if (score >= 4.5) {
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
          Excelente
        </span>
      );
    }
    if (score >= 3.5) {
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

  // Client-side filter on specialist name
  const filteredRanking = rankingList.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
      {/* Header card */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-indigo-600" />
            Ranking e Desempenho de Especialistas
          </h3>
          <p className="text-xs text-gray-500 mt-1">Acompanhe métricas de produtividade, SLA e pontuações médicas gerais em tempo real</p>
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
            className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-905 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Município do caso..."
            value={municipioFilter}
            onChange={(e) => setMunicipioFilter(e.target.value)}
            className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-905 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 col-span-1">
          <div className="relative flex-1">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-805 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
              title="Data Inicial"
            />
          </div>
          <div className="relative flex-1">
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-855 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
              title="Data Final"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-indigo-650 hover:text-indigo-550 flex items-center gap-1 transition cursor-pointer"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Metrics List/Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-gray-150">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm text-red-655 bg-red-50 rounded-xl border border-red-200 flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5 animate-bounce text-red-500" />
          <span>Erro ao carregar dados do ranking: {(error as any).message || error}</span>
        </div>
      ) : filteredRanking.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-150">
          Nenhum resultado correspondente aos filtros.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-w-full">
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
                    <td className="px-6 py-4 text-center font-semibold">
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
                      {item.volumeCasos > 0 ? `${item.tempoMedioResposta}h` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {item.scoreQualidade > 0 ? (
                        <div className="flex items-center justify-center gap-1 font-mono">
                          <span className="text-amber-500">★</span>
                          <span>{item.scoreQualidade.toFixed(1)}/5.0</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
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
