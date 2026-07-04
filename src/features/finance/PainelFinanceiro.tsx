import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { DollarSign, Filter, Loader2 } from 'lucide-react';

interface FinanceLaunch {
  id: string;
  casoId: string;
  profissionalNome: string;
  dataResolucao: string;
  valorBonus: number;
  statusRepasse: 'pendente' | 'processando' | 'pago';
}

export const PainelFinanceiro: React.FC = () => {
  const { perfil } = useAuth();
  const isAdmin = perfil?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [launches, setLaunches] = useState<FinanceLaunch[]>([]);

  // High fidelity mock data reflecting case resolutions and bonus rules
  const mockLaunches: FinanceLaunch[] = [
    { id: 'F1', casoId: 'C823A4', profissionalNome: 'Dr. Marcos Oliveira', dataResolucao: '2026-06-28', valorBonus: 150.00, statusRepasse: 'pendente' },
    { id: 'F2', casoId: 'C741F2', profissionalNome: 'Dra. Ana Beatriz Silva', dataResolucao: '2026-06-27', valorBonus: 150.00, statusRepasse: 'processando' },
    { id: 'F3', casoId: 'C512D1', profissionalNome: 'Dra. Juliana Mendes', dataResolucao: '2026-06-26', valorBonus: 150.00, statusRepasse: 'pago' },
    { id: 'F4', casoId: 'C498B9', profissionalNome: 'Dr. Marcos Oliveira', dataResolucao: '2026-06-25', valorBonus: 150.00, statusRepasse: 'pago' },
    { id: 'F5', casoId: 'C312A5', profissionalNome: 'Dr. Carlos Roberto', dataResolucao: '2026-06-24', valorBonus: 150.00, statusRepasse: 'pago' },
  ];

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      // If specialist, only show their own entries
      if (!isAdmin) {
        setLaunches(mockLaunches.map(l => ({ ...l, profissionalNome: perfil?.nome || 'Você' })));
      } else {
        setLaunches(mockLaunches);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [perfil, isAdmin]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDataInicio('');
    setDataFim('');
  };

  const getStatusBadge = (status: 'pendente' | 'processando' | 'pago') => {
    switch (status) {
      case 'pago':
        return (
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 border border-green-200">
            Pago
          </span>
        );
      case 'processando':
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            Processando
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-250">
            Pendente
          </span>
        );
    }
  };

  // Filter launches based on criteria
  const filteredLaunches = launches.filter(launch => {
    const matchesStatus = statusFilter === 'all' || launch.statusRepasse === statusFilter;
    // Date ranges simulated
    return matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-650" />
            Controle Financeiro e Faturamento
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin 
              ? 'Monitore receitas da plataforma, custos operacionais e repasses aos especialistas.' 
              : 'Consulte seu extrato de repasses, saldos a receber e histórico de produção.'}
          </p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      {isAdmin ? (
        // Admin metrics grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Faturamento Total</span>
            <span className="text-2xl font-bold text-gray-900 mt-2">R$ 4.500,00</span>
            <span className="text-[10px] text-gray-400 mt-1">30 interconsultas realizadas</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Repasses a Especialistas</span>
            <span className="text-2xl font-bold text-indigo-600 mt-2">R$ 3.000,00</span>
            <span className="text-[10px] text-indigo-400 mt-1">R$ 150,00 fixo por caso</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-455 uppercase">Custo Médio por Caso</span>
            <span className="text-2xl font-bold text-gray-800 mt-2">R$ 100,00</span>
            <span className="text-[10px] text-gray-400 mt-1">Margem média de repasse</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Lucro Líquido</span>
            <span className="text-2xl font-bold text-green-600 mt-2">R$ 1.500,00</span>
            <span className="text-[10px] text-green-500 mt-1">Margem de 33.3% retida</span>
          </div>
        </div>
      ) : (
        // Specialist metrics grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Saldo a Receber</span>
            <span className="text-2xl font-bold text-amber-600 mt-2">R$ 300,00</span>
            <span className="text-[10px] text-amber-500 mt-1">2 casos aguardando pagamento</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Total Já Pago</span>
            <span className="text-2xl font-bold text-green-600 mt-2">R$ 1.200,05</span>
            <span className="text-[10px] text-green-500 mt-1">Repasses realizados via PIX/TED</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Valor por Consulta</span>
            <span className="text-2xl font-bold text-gray-800 mt-2">R$ 150,00</span>
            <span className="text-[10px] text-gray-400 mt-1">Valor fixo de bônus atual</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-450 uppercase">Casos Respondidos</span>
            <span className="text-2xl font-bold text-indigo-650 mt-2">10</span>
            <span className="text-[10px] text-indigo-500 mt-1">Total acumulado no mês</span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
          >
            <option value="all">Todos os Repasses</option>
            <option value="pendente">Pendente</option>
            <option value="processando">Processando</option>
            <option value="pago">Pago</option>
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
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 transition"
          >
            <Filter className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Launches Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-gray-150">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredLaunches.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-150">
          Nenhum lançamento financeiro registrado.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID Transação</th>
                  <th className="px-6 py-4">ID Caso</th>
                  {isAdmin && <th className="px-6 py-4">Especialista</th>}
                  <th className="px-6 py-4">Data Resolução</th>
                  <th className="px-6 py-4 text-center">Valor Bônus</th>
                  <th className="px-6 py-4 text-right">Status Repasse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {filteredLaunches.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-55/30 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      #{item.casoId}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {item.profissionalNome}
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(item.dataResolucao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-800">
                      R$ {item.valorBonus.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {getStatusBadge(item.statusRepasse)}
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
