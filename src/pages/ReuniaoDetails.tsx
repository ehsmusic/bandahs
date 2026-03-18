import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Reuniao, Cliente, ReuniaoLog } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  FileText,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Plus,
  Square,
  Send,
  ArrowLeft,
  User,
  History,
  ExternalLink,
  Edit2,
  XCircle as XIcon,
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection, orderBy, onSnapshot, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

export const ReuniaoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reuniao, setReuniao] = useState<Reuniao | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [logs, setLogs] = useState<ReuniaoLog[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [newLog, setNewLog] = useState('');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [heleModal, setHeleModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Partial<Reuniao>>();

  useEffect(() => {
    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snap) => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
    });
    return unsubClientes;
  }, []);

  useEffect(() => {
    if (!id) return;

    const unsubReuniao = onSnapshot(doc(db, 'reunioes', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Reuniao;
        setReuniao(data);
        
        // Fetch cliente
        getDoc(doc(db, 'clientes', data.clienteId)).then(cSnap => {
          if (cSnap.exists()) setCliente({ id: cSnap.id, ...cSnap.data() } as Cliente);
        });

        // Timer Logic
        if (data.inicioReal && !data.fimReal && !data.isPaused) {
          setIsTimerRunning(true);
          const lastStart = data.lastStart?.toDate().getTime() || data.inicioReal.toDate().getTime();
          const accumulated = data.duracaoSegundos || 0;
          const now = Date.now();
          setTimer(accumulated + Math.floor((now - lastStart) / 1000));
        } else {
          setIsTimerRunning(false);
          setTimer(data.duracaoSegundos || 0);
        }
      }
    });

    const unsubLogs = onSnapshot(
      collection(db, 'reunioes', id, 'logs'),
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReuniaoLog));
        setLogs(logsData.sort((a, b) => b.data?.seconds - a.data?.seconds));
      }
    );

    const unsubDocs = onSnapshot(
      collection(db, 'reunioes', id, 'documentos'),
      (snapshot) => {
        setDocumentos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubReuniao();
      unsubLogs();
      unsubDocs();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleStartTimer = async () => {
    if (!id) return;
    try {
      const updateData: any = {
        status: 'Em andamento',
        isPaused: false,
        lastStart: serverTimestamp()
      };
      
      if (!reuniao?.inicioReal) {
        updateData.inicioReal = serverTimestamp();
        updateData.duracaoSegundos = 0;
      }

      await updateDoc(doc(db, 'reunioes', id), updateData);
    } catch (error) {
      console.error("Erro ao iniciar timer:", error);
    }
  };

  const handlePauseTimer = async () => {
    if (!id || !reuniao) return;
    try {
      const lastStart = reuniao.lastStart?.toDate().getTime() || reuniao.inicioReal.toDate().getTime();
      const now = Date.now();
      const currentSessionDuration = Math.floor((now - lastStart) / 1000);
      const totalAccumulated = (reuniao.duracaoSegundos || 0) + currentSessionDuration;

      await updateDoc(doc(db, 'reunioes', id), {
        isPaused: true,
        status: 'Em espera',
        duracaoSegundos: totalAccumulated
      });
    } catch (error) {
      console.error("Erro ao pausar timer:", error);
    }
  };

  const handleStopTimer = async () => {
    if (!id || !reuniao) return;
    try {
      let totalDuration = reuniao.duracaoSegundos || 0;
      
      if (!reuniao.isPaused) {
        const lastStart = reuniao.lastStart?.toDate().getTime() || reuniao.inicioReal.toDate().getTime();
        const now = Date.now();
        totalDuration += Math.floor((now - lastStart) / 1000);
      }
      
      await updateDoc(doc(db, 'reunioes', id), {
        fimReal: serverTimestamp(),
        duracaoSegundos: totalDuration,
        status: 'Realizada',
        isPaused: false
      });
    } catch (error) {
      console.error("Erro ao parar timer:", error);
    }
  };

  const handleDecisao = async (decisao: 'Aprovado' | 'Recusado') => {
    if (!id || !reuniao) return;
    try {
      await updateDoc(doc(db, 'reunioes', id), {
        decisao,
        status: 'Realizada'
      });
      alert(`Reunião marcada como ${decisao}`);
    } catch (error) {
      console.error("Erro ao processar decisão:", error);
    }
  };

  const handleGerarEvento = async () => {
    if (!id || !reuniao) return;
    try {
      let dateObj: Date;
      if (reuniao.data instanceof Timestamp) {
        dateObj = reuniao.data.toDate();
      } else {
        dateObj = new Date(reuniao.data + 'T' + (reuniao.horario || '00:00'));
      }

      const dataFormatada = format(dateObj, 'dd-MM-yyyy');
      const showId = `${reuniao.tipoEvento || 'Outro'}-${reuniao.clienteId}-${dataFormatada}`;
      
      await setDoc(doc(db, 'shows', showId), {
        id: showId,
        clienteId: reuniao.clienteId,
        reuniaoId: id,
        nomeEvento: reuniao.nomeEvento || '',
        dataEvento: Timestamp.fromDate(dateObj),
        horarioEvento: reuniao.horario || '',
        local: reuniao.local || '',
        statusEvento: 'Confirmado',
        tipoEvento: reuniao.tipoEvento || 'Outro',
        valorContrato: reuniao.valorShow || 0,
        cidade: '',
        endereco: ''
      }, { merge: true });

      // Adicionar dados financeiros iniciais
      await setDoc(doc(db, 'shows', showId, 'financeiro', 'geral'), {
        valorContrato: reuniao.valorShow || 0,
        valorPagoTotal: 0,
        observacoes: 'Gerado a partir da reunião'
      }, { merge: true });

      setHeleModal({
        isOpen: true,
        message: `Com certeza! Já gerei o evento "${reuniao.nomeEvento}" para você. Tudo pronto na aba de Shows!`
      });
    } catch (error) {
      console.error("Erro ao gerar evento:", error);
    }
  };

  const handleGerarOrcamento = async () => {
    if (!reuniao || !id) return;
    try {
      let dateObj: Date;
      if (reuniao.data instanceof Timestamp) {
        dateObj = reuniao.data.toDate();
      } else {
        dateObj = new Date(reuniao.data + 'T' + (reuniao.horario || '00:00'));
      }

      const formatPhone = (phone: any) => {
        const cleaned = String(phone || '').replace(/\D/g, '');
        return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
      };

      const payload = {
        tituloEvento: reuniao.nomeEvento,
        valor: reuniao.valorShow || 0,
        nomeCliente: cliente?.nome || 'Não informado',
        telefone: formatPhone(cliente?.telefone || ''),
        cidade: reuniao.local || 'Não informada',
        dataEvento: format(dateObj, 'dd/MM/yyyy'),
        tipoEvento: reuniao.tipoEvento,
        duracao: reuniao.duracao || '',
        somContratado: reuniao.somContratado ? 'Sim' : 'Não',
        publicoEstimado: reuniao.publicoEstimado || 0
      };

      const response = await fetch('https://webhook.ehstech.com.br/webhook/orcamentoHS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Criar documento no Firebase
        await addDoc(collection(db, 'reunioes', id, 'documentos'), {
          dataUpload: serverTimestamp(),
          nomeDocumento: `Orçamento - ${reuniao.nomeEvento}.pdf`,
          tipoDocumento: 'PDF',
          urlArquivo: result.urlArquivo || ''
        });

        setHeleModal({
          isOpen: true,
          message: "Olá! Acabei de enviar o orçamento para o sistema. O documento foi gerado e salvo na seção de documentos desta reunião!"
        });
      } else {
        alert("Erro ao enviar orçamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao gerar orçamento:", error);
    }
  };

  const handleEdit = () => {
    if (!reuniao) return;

    // Convert Timestamp to YYYY-MM-DD for input
    let dateStr = '';
    if (reuniao.data instanceof Timestamp) {
      dateStr = format(reuniao.data.toDate(), 'yyyy-MM-dd');
    } else if (reuniao.data && typeof reuniao.data === 'string') {
      dateStr = reuniao.data;
    }

    setValue('data', dateStr);
    setValue('horario', reuniao.horario);
    setValue('clienteId', reuniao.clienteId);
    setValue('tipoEvento', reuniao.tipoEvento);
    setValue('nomeEvento', reuniao.nomeEvento);
    setValue('local', reuniao.local);
    setValue('publicoEstimado', reuniao.publicoEstimado);
    setValue('linkReuniao', reuniao.linkReuniao);
    setValue('follow', reuniao.follow);
    setValue('valorShow', reuniao.valorShow);
    setValue('somContratado', reuniao.somContratado);
    setValue('duracao', reuniao.duracao);
    setIsModalOpen(true);
  };

  const onEditSubmit = async (formData: any) => {
    if (!id) return;
    try {
      if (!formData.data || !formData.horario) {
        alert("Data e horário são obrigatórios");
        return;
      }

      const [year, month, day] = formData.data.split('-').map(Number);
      const [hour, minute] = (formData.horario || '00:00').split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hour, minute);
      
      const { data, horario, ...rest } = formData;

      const finalData: any = {
        ...rest,
        horario,
        data: Timestamp.fromDate(dateObj),
        somContratado: formData.somContratado === 'true',
        duracao: formData.duracao || '',
      };

      // Remover campos undefined para evitar erro no Firestore
      Object.keys(finalData).forEach(key => finalData[key] === undefined && delete finalData[key]);

      await updateDoc(doc(db, 'reunioes', id), finalData);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar reunião:", error);
      alert("Erro ao salvar alterações.");
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newLog.trim()) return;

    try {
      await addDoc(collection(db, 'reunioes', id, 'logs'), {
        texto: newLog,
        data: serverTimestamp()
      });
      setNewLog('');
    } catch (error) {
      console.error("Erro ao adicionar log:", error);
    }
  };

  const handleCancelMeeting = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'reunioes', id), {
        status: 'Cancelada',
        isPaused: false,
        fimReal: serverTimestamp()
      });
      alert("Reunião cancelada com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar reunião:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
  }

  if (!reuniao) return <div className="p-8 text-center text-slate-500">Carregando reunião...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/reunioes')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para Reuniões
        </button>
        <button 
          onClick={handleEdit}
          disabled={reuniao.status === 'Em andamento'}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border",
            reuniao.status === 'Em andamento'
              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          )}
          title={reuniao.status === 'Em andamento' ? "Não é possível editar uma reunião em andamento" : "Editar Dados"}
        >
          <Edit2 size={18} />
          Editar Dados
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Info e Timer */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  reuniao.status === 'Em andamento' ? "bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse" :
                  reuniao.status === 'Em espera' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                  reuniao.status === 'Cancelada' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                  "bg-blue-50 text-blue-600 border border-blue-100"
                )}>
                  {reuniao.status}
                </span>
                {reuniao.decisao && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    reuniao.decisao === 'Aprovado' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                  )}>
                    {reuniao.decisao}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{reuniao.nomeEvento || 'Reunião sem nome'}</h1>
              <div className="flex items-center gap-2 text-slate-500">
                <User size={16} />
                <span className="font-medium">{cliente?.nome}</span>
              </div>
            </div>

              <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-blue-600" />
                {reuniao.data instanceof Timestamp 
                  ? format(reuniao.data.toDate(), 'dd/MM/yyyy') 
                  : formatDate(reuniao.data)
                } às {reuniao.horario}
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-blue-600" />
                {reuniao.local || 'Não definido'}
              </div>
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-blue-600" />
                {reuniao.tipoEvento}
              </div>
              <div className="flex items-center gap-3">
                <Users size={18} className="text-blue-600" />
                {reuniao.publicoEstimado || 0} pessoas
              </div>
              <div className="flex items-center gap-3 text-emerald-600 font-bold">
                <span className="text-slate-500 font-normal">Valor:</span>
                {reuniao.valorShow ? `R$ ${reuniao.valorShow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
              </div>
              {reuniao.linkReuniao && (
                <a href={reuniao.linkReuniao} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-blue-600 hover:underline">
                  <Video size={18} />
                  Link da Reunião
                </a>
              )}
            </div>

            {/* Cronômetro */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Duração da Reunião</p>
                <div className="text-4xl font-mono font-bold text-emerald-600 bg-slate-50 py-4 rounded-2xl border border-slate-100">
                  {formatTime(timer)}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {!reuniao.inicioReal ? (
                  <button 
                    onClick={handleStartTimer}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Play size={18} />
                    Iniciar Reunião
                  </button>
                ) : !reuniao.fimReal ? (
                  <div className="grid grid-cols-2 gap-2">
                    {reuniao.isPaused ? (
                      <button 
                        onClick={handleStartTimer}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <Play size={18} />
                        Retomar
                      </button>
                    ) : (
                      <button 
                        onClick={handlePauseTimer}
                        className="bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <Pause size={18} />
                        Pausar
                      </button>
                    )}
                    <button 
                      onClick={handleStopTimer}
                      className="bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Square size={18} />
                      Finalizar
                    </button>
                  </div>
                ) : (
                  <div className="w-full text-center py-3 bg-slate-50 rounded-xl text-slate-500 font-bold text-sm border border-slate-100">
                    Reunião Finalizada
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decisão Final</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleDecisao('Aprovado')}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      reuniao.decisao === 'Aprovado' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100"
                    )}
                  >
                    <CheckCircle size={14} />
                    Aprovar
                  </button>
                  <button 
                    onClick={() => handleDecisao('Recusado')}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      reuniao.decisao === 'Recusado' ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100"
                    )}
                  >
                    <XCircle size={14} />
                    Recusar
                  </button>
                </div>
                {reuniao.status !== 'Cancelada' && (
                  <button 
                    onClick={handleCancelMeeting}
                    className="w-full bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border border-rose-100"
                  >
                    <XCircle size={14} />
                    Cancelar Reunião
                  </button>
                )}
                {reuniao.decisao === 'Aprovado' && (
                  <div className="space-y-2 mt-2">
                    <button 
                      onClick={handleGerarOrcamento}
                      className="w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border border-emerald-100"
                    >
                      <FileText size={14} />
                      Gerar Orçamento
                    </button>
                    <button 
                      onClick={handleGerarEvento}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10"
                    >
                      <Plus size={14} />
                      Gerar Evento
                    </button>
                  </div>
                )}
              </div>

              {reuniao.inicioReal && (
                <div className="text-[10px] text-slate-400 text-center space-y-1 pt-2">
                  <p>Início: {format(reuniao.inicioReal.toDate(), 'HH:mm:ss')}</p>
                  {reuniao.fimReal && <p>Fim: {format(reuniao.fimReal.toDate(), 'HH:mm:ss')}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Documentos Gerados */}
          {documentos.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-blue-500" />
                <h2 className="text-xl font-bold text-slate-900">Documentos Gerados</h2>
              </div>
              <div className="space-y-3">
                {documentos.map(docItem => (
                  <div key={docItem.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{docItem.nomeDocumento}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black">
                          {docItem.dataUpload ? format(docItem.dataUpload.toDate(), 'dd/MM/yyyy HH:mm') : '...'}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={docItem.urlArquivo} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Logs / Atendimento */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col h-[600px] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <History size={24} className="text-emerald-500" />
              <h2 className="text-xl font-bold text-slate-900">Histórico de Atendimento</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <FileText size={48} className="opacity-20" />
                  <p>Nenhum registro ainda.</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Registro</span>
                      <span>{log.data ? format(log.data.toDate(), 'dd/MM/yyyy HH:mm') : '...'}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{log.texto}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddLog} className="mt-6 pt-6 border-t border-slate-100">
              <div className="relative">
                <textarea 
                  value={newLog}
                  onChange={(e) => setNewLog(e.target.value)}
                  placeholder="Digite aqui o que aconteceu na reunião..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-14 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none text-slate-900"
                  rows={3}
                />
                <button 
                  type="submit"
                  disabled={!newLog.trim()}
                  className="absolute bottom-4 right-4 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Editar Reunião</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon /></button>
            </div>
            <form onSubmit={handleSubmit(onEditSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Data *</label>
                  <input type="date" {...register('data', { required: "Data é obrigatória" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.data ? "border-rose-500" : "border-slate-200")} />
                  {errors.data && <p className="text-rose-500 text-[10px] mt-1 font-bold">{String(errors.data.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Horário *</label>
                  <input type="time" {...register('horario', { required: "Horário é obrigatório" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.horario ? "border-rose-500" : "border-slate-200")} />
                  {errors.horario && <p className="text-rose-500 text-[10px] mt-1 font-bold">{String(errors.horario.message)}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cliente *</label>
                  <select {...register('clienteId', { required: "Cliente é obrigatório" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.clienteId ? "border-rose-500" : "border-slate-200")}>
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {errors.clienteId && <p className="text-rose-500 text-[10px] mt-1 font-bold">{String(errors.clienteId.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Tipo de Evento *</label>
                  <select {...register('tipoEvento', { required: "Tipo de evento é obrigatório" })} className={cn("w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50", errors.tipoEvento ? "border-rose-500" : "border-slate-200")}>
                    <option value="Casamento">Casamento</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Aniversário">Aniversário</option>
                    <option value="Outro">Outro</option>
                  </select>
                  {errors.tipoEvento && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.tipoEvento.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nome do Evento</label>
                <input {...register('nomeEvento')} placeholder="Ex: Casamento de João e Maria" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Público Estimado</label>
                <input type="number" {...register('publicoEstimado', { valueAsNumber: true })} placeholder="Ex: 200" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Local do Evento</label>
                <input {...register('local')} placeholder="Ex: Buffet França" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Link da Reunião</label>
                <input {...register('linkReuniao')} placeholder="https://meet.google.com/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Som Contratado?</label>
                <select {...register('somContratado')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="false">Não</option>
                  <option value="true">Sim (HS Produções)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Duração do Show</label>
                <select {...register('duracao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="">Selecione a duração</option>
                  <option value="1 hora">1 hora</option>
                  <option value="2 horas">2 horas</option>
                  <option value="3 horas">3 horas</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Valor do Show (R$)</label>
                <input type="number" step="0.01" {...register('valorShow', { valueAsNumber: true })} placeholder="0,00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal da Hele */}
      {heleModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto rounded-full bg-blue-50 border-2 border-blue-100 overflow-hidden">
                  <img 
                    src="https://res.cloudinary.com/dvq0tmbil/image/upload/v1771442541/heleTransparente_uqdzk4.png" 
                    alt="Hele Assistente"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                  <CheckCircle size={20} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Ação Concluída!</h3>
                <p className="text-slate-500 leading-relaxed">
                  {heleModal.message}
                </p>
              </div>

              <button 
                onClick={() => setHeleModal({ isOpen: false, message: '' })}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
