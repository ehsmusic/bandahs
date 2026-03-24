import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Show, Reuniao, Cliente } from '../types';
import { orderBy, where, limit, Timestamp } from 'firebase/firestore';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  DollarSign,
  ArrowRight,
  Filter,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl shadow-sm"
  >
    <div className="flex items-center justify-between mb-3 md:mb-4">
      <div className={cn("p-2 md:p-3 rounded-xl bg-opacity-10", color)}>
        <Icon className={color.replace('bg-', 'text-')} size={20} />
      </div>
      <TrendingUp className="text-emerald-500" size={14} />
    </div>
    <p className="text-slate-500 text-xs md:text-sm font-medium">{title}</p>
    <h3 className="text-xl md:text-2xl font-bold mt-1">{value}</h3>
  </motion.div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: shows } = useFirestoreCollection<Show>('shows', [orderBy('dataEvento', 'asc')]);
  const { data: reunioes } = useFirestoreCollection<Reuniao>('reunioes', [
    orderBy('data', 'asc')
  ]);
  const { data: clientes } = useFirestoreCollection<Cliente>('clientes');

  // Filtragem das reuniões baseada no filtro de mês
  const filteredReunioes = reunioes.filter(r => {
    if (['Agendada', 'Em andamento', 'Em espera'].indexOf(r.status) === -1) return false;

    let start: Date, end: Date;

    if (isCustomDate && startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else if (filterMonth) {
      const [year, month] = filterMonth.split('-').map(Number);
      start = startOfMonth(new Date(year, month - 1));
      end = endOfMonth(new Date(year, month - 1));
    } else {
      return true;
    }

    let reuniaoDate: Date;
    if (r.data instanceof Timestamp) {
      reuniaoDate = r.data.toDate();
    } else {
      // Formato YYYY-MM-DD
      const [ry, rm, rd] = r.data.split('-').map(Number);
      reuniaoDate = new Date(ry, rm - 1, rd);
    }
    
    return isWithinInterval(reuniaoDate, { start, end });
  }).slice(0, 5);

  // Filtragem dos shows baseada nos filtros do Dashboard
  const filteredShows = shows.filter(s => {
    // 1. Filtro de Tipo
    if (filterType !== 'Todos' && s.tipoEvento !== filterType) return false;
    
    // 2. Filtro de Status
    if (filterStatus !== 'Todos' && s.statusEvento !== filterStatus) return false;
    
    // 3. Filtro de Período
    let start: Date, end: Date;

    if (isCustomDate && startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else if (filterMonth) {
      const [year, month] = filterMonth.split('-').map(Number);
      start = startOfMonth(new Date(year, month - 1));
      end = endOfMonth(new Date(year, month - 1));
    } else {
      return true;
    }

    let showDate: Date;
    if (s.dataEvento instanceof Timestamp) {
      showDate = s.dataEvento.toDate();
    } else if (s.dataEvento?.seconds) {
      showDate = new Date(s.dataEvento.seconds * 1000);
    } else {
      showDate = new Date(s.dataEvento);
    }
    
    return isWithinInterval(showDate, { start, end });
  });

  const confirmedShows = filteredShows.filter(s => s.statusEvento === 'Confirmado');
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingShows = filteredShows.filter(s => {
    let showDate: Date;
    if (s.dataEvento instanceof Timestamp) {
      showDate = s.dataEvento.toDate();
    } else if (s.dataEvento?.seconds) {
      showDate = new Date(s.dataEvento.seconds * 1000);
    } else {
      showDate = new Date(s.dataEvento);
    }
    return showDate >= now;
  }).slice(0, 5);
  
  // Cálculos financeiros excluindo cancelados
  const activeShowsForFinance = filteredShows.filter(s => s.statusEvento !== 'Cancelado');
  const totalValue = activeShowsForFinance.reduce((acc, curr) => acc + (Number(curr.valorContrato) || 0), 0);
  const totalPaid = activeShowsForFinance.reduce((acc, curr) => acc + (Number(curr.valorPagoTotal) || 0), 0);
  const totalPending = totalValue - totalPaid;

  const resetFilters = () => {
    setFilterType('Todos');
    setFilterStatus('Todos');
    setFilterMonth(format(new Date(), 'yyyy-MM'));
    setIsCustomDate(false);
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">Bem-vindo ao centro de comando da sua banda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 w-full md:w-auto">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2">
            <Filter size={14} /> Filtros
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={isCustomDate ? 'custom' : 'month'}
              onChange={(e) => setIsCustomDate(e.target.value === 'custom')}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="month">Mensal</option>
              <option value="custom">Personalizado</option>
            </select>

            {!isCustomDate ? (
              <input 
                type="month" 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900"
              />
            ) : (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 w-28"
                />
                <span className="text-slate-400 text-[10px] font-bold uppercase">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 w-28"
                />
              </div>
            )}

            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="Todos">Tipos</option>
              <option value="Casamento">Casamento</option>
              <option value="Formatura">Formatura</option>
              <option value="Aniversário">Aniversário</option>
              <option value="Confraternização">Confraternização</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Outros">Outros</option>
            </select>

            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="Todos">Status</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Em negociação">Em negociação</option>
              <option value="Realizado">Realizado</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>

            <button 
              onClick={resetFilters}
              className="p-2 text-slate-400 hover:text-slate-900 transition-all ml-auto sm:ml-0"
              title="Limpar Filtros"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Shows Confirmados" 
          value={confirmedShows.length} 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Próximas Reuniões" 
          value={filteredReunioes.length} 
          icon={Calendar} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Total de Clientes" 
          value={clientes.length} 
          icon={Users} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total em Contratos" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)} 
          icon={DollarSign} 
          color="bg-slate-500" 
        />
        <StatCard 
          title="Total Recebido" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)} 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Saldo Devedor" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)} 
          icon={DollarSign} 
          color="bg-rose-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próximos Shows */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos Shows</h2>
            <Link to="/shows" className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingShows.length > 0 ? upcomingShows.map(show => {
              let date: Date;
              if (show.dataEvento instanceof Timestamp) {
                date = show.dataEvento.toDate();
              } else if (show.dataEvento?.seconds) {
                date = new Date(show.dataEvento.seconds * 1000);
              } else {
                date = new Date(show.dataEvento);
              }

              return (
                <div key={show.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-xs font-bold">
                        <span className="text-emerald-600">
                          {format(date, 'dd/MM')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {format(date, 'yyyy')}
                        </span>
                      </div>
                    <div>
                      <h4 className="font-semibold">{show.nomeEvento}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {show.horarioEvento} • {show.cidade}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">
                    {show.statusEvento}
                  </span>
                </div>
              );
            }) : (
              <div className="p-10 text-center text-slate-400">Nenhum show agendado.</div>
            )}
          </div>
        </section>

        {/* Próximas Reuniões */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximas Reuniões</h2>
            <Link to="/reunioes" className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredReunioes.length > 0 ? filteredReunioes.map(reuniao => (
              <div 
                key={reuniao.id} 
                onClick={() => navigate(`/reunioes/${reuniao.id}`)}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold">{reuniao.nomeEvento || 'Reunião sem nome'}</h4>
                    <p className="text-xs text-slate-500">
                      {reuniao.data instanceof Timestamp 
                        ? format(reuniao.data.toDate(), 'dd/MM/yyyy') 
                        : reuniao.data?.split('-')?.reverse()?.join('/') || ''
                      } às {reuniao.horario} • {reuniao.tipoEvento}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-slate-400">Status</span>
                  <span className="text-xs font-bold text-blue-600">{reuniao.status}</span>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400">Nenhuma reunião pendente.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
