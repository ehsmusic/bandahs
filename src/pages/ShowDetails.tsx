import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { Show, Cliente, EquipeShow, DocumentoShow, FinanceiroShow, ParcelaFinanceira, Reuniao, Integrante } from '../types';
import { 
  Music, 
  Users, 
  FileText, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle,
  Upload,
  ExternalLink,
  Edit2,
  XCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, query, where, serverTimestamp, Timestamp, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-semibold text-sm",
      active ? "border-emerald-500 text-emerald-500 bg-emerald-500/5" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    )}
  >
    <Icon size={18} />
    {label}
  </button>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const ShowDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'equipe' | 'reunioes' | 'documentos' | 'financeiro'>('equipe');
  
  const [show, setShow] = useState<Show | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [equipe, setEquipe] = useState<EquipeShow[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoShow[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaFinanceira[]>([]);
  const [reunioesRelacionadas, setReunioesRelacionadas] = useState<Reuniao[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isAddParcelaModalOpen, setIsAddParcelaModalOpen] = useState(false);
  const [isEditParcelaModalOpen, setIsEditParcelaModalOpen] = useState(false);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<EquipeShow | null>(null);
  const [editingParcela, setEditingParcela] = useState<ParcelaFinanceira | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentoShow | null>(null);
  const [heleModal, setHeleModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const { data: todosIntegrantes } = useFirestoreCollection<Integrante>('integrantes');
  const { data: todosClientes } = useFirestoreCollection<Cliente>('clientes');

  const { register, handleSubmit, setValue, reset: resetEdit } = useForm<Partial<Show>>();
  const { register: regMember, handleSubmit: handleMemberSubmit, reset: resetMember, setValue: setMemberValue } = useForm<any>();
  const { register: regParcela, handleSubmit: handleParcelaSubmit, reset: resetParcela, setValue: setParcelaValue } = useForm<any>();
  const { register: regDoc, handleSubmit: handleDocSubmit, reset: resetDoc, setValue: setDocValue } = useForm<any>();

  // Fetch Show Data
  useEffect(() => {
    if (!id) return;
    const unsubShow = onSnapshot(doc(db, 'shows', id), (docSnap) => {
      if (docSnap.exists()) {
        const showData = { id: docSnap.id, ...docSnap.data() } as Show;
        setShow(showData);
        
        // Fetch Cliente
        onSnapshot(doc(db, 'clientes', showData.clienteId), (cSnap) => {
          if (cSnap.exists()) setCliente({ id: cSnap.id, ...cSnap.data() } as Cliente);
        });
      }
    });

    const unsubEquipe = onSnapshot(collection(db, 'shows', id, 'equipe'), (snap) => {
      setEquipe(snap.docs.map(d => ({ id: d.id, ...d.data() } as EquipeShow)));
    });

    const unsubDocs = onSnapshot(collection(db, 'shows', id, 'documentos'), (snap) => {
      setDocumentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentoShow)));
    });

    const unsubParcelas = onSnapshot(collection(db, 'shows', id, 'parcelas'), (snap) => {
      setParcelas(snap.docs.map(d => ({ id: d.id, ...d.data() } as ParcelaFinanceira)));
    });

    return () => {
      unsubShow();
      unsubEquipe();
      unsubDocs();
      unsubParcelas();
    };
  }, [id]);

  // Fetch Related Meetings
  useEffect(() => {
    if (!show?.reuniaoId) return;
    const q = query(collection(db, 'reunioes'), where('clienteId', '==', show.clienteId));
    const unsub = onSnapshot(q, (snap) => {
      setReunioesRelacionadas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reuniao)));
    });
    return unsub;
  }, [show]);

  const handleEdit = () => {
    if (!show) return;
    
    let dateStr = '';
    if (show.dataEvento instanceof Timestamp) {
      dateStr = format(show.dataEvento.toDate(), 'yyyy-MM-dd');
    } else if (show.dataEvento && typeof show.dataEvento === 'string') {
      dateStr = show.dataEvento;
    }

    setValue('nomeEvento', show.nomeEvento);
    setValue('dataEvento', dateStr);
    setValue('horarioEvento', show.horarioEvento);
    setValue('local', show.local);
    setValue('tipoEvento', show.tipoEvento);
    setValue('statusEvento', show.statusEvento);
    setValue('valorContrato', show.valorContrato);
    setValue('cidade', show.cidade);
    setValue('endereco', show.endereco);
    setValue('cerimonialista', show.cerimonialista);
    setValue('localCerimonia', show.localCerimonia);
    setValue('observacoes', show.observacoes);
    setValue('publicoEstimado', show.publicoEstimado);
    setValue('somContratado', show.somContratado);
    setValue('formaPagamento', show.formaPagamento);
    setValue('duracao', show.duracao);
    setValue('alimentacao', show.alimentacao);
    setValue('clienteId', show.clienteId);
    
    setIsEditModalOpen(true);
  };

  const onEditSubmit = async (formData: any) => {
    if (!id) return;
    try {
      const [year, month, day] = formData.dataEvento.split('-').map(Number);
      const [hour, minute] = (formData.horarioEvento || '00:00').split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hour, minute);
      
      const { dataEvento, ...rest } = formData;
      
      const finalData = {
        ...rest,
        dataEvento: Timestamp.fromDate(dateObj),
        publicoEstimado: Number(formData.publicoEstimado) || 0,
        somContratado: formData.somContratado === 'true',
        alimentacao: formData.alimentacao === 'true',
      };

      await updateDoc(doc(db, 'shows', id), finalData);
      
      // Também atualizar no financeiro/geral se o valor do contrato mudou
      if (formData.valorContrato !== undefined) {
        await setDoc(doc(db, 'shows', id, 'financeiro', 'geral'), {
          valorContrato: formData.valorContrato
        }, { merge: true });
      }

      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar show:", error);
      alert("Erro ao salvar alterações.");
    }
  };

  const onAddMembers = async () => {
    if (!id || selectedMembers.length === 0) return;
    try {
      const promises = selectedMembers.map(memberId => {
        const integrante = todosIntegrantes.find(i => i.id === memberId);
        return setDoc(doc(db, 'shows', id, 'equipe', memberId), {
          integranteId: memberId,
          funcao: integrante?.funcao || '',
          cache: integrante?.cachePadrao || 0,
          confirma: false,
          observacoes: ''
        });
      });
      
      await Promise.all(promises);
      
      setIsAddMemberModalOpen(false);
      setSelectedMembers([]);
      setHeleModal({
        isOpen: true,
        message: `${selectedMembers.length} integrantes adicionados com sucesso!`
      });
    } catch (error) {
      console.error("Erro ao adicionar integrantes:", error);
      alert("Erro ao adicionar integrantes.");
    }
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleEditMember = (member: EquipeShow) => {
    setEditingMember(member);
    setMemberValue('integranteId', member.integranteId);
    setMemberValue('funcao', member.funcao);
    setMemberValue('cache', member.cache);
    setMemberValue('observacoes', member.observacoes);
    setIsEditMemberModalOpen(true);
  };

  const onEditMemberSubmit = async (data: any) => {
    if (!id || !editingMember) return;
    try {
      await updateDoc(doc(db, 'shows', id, 'equipe', editingMember.id), {
        funcao: data.funcao,
        cache: Number(data.cache),
        observacoes: data.observacoes || ''
      });
      setIsEditMemberModalOpen(false);
      setEditingMember(null);
      resetMember();
    } catch (error) {
      console.error("Erro ao editar integrante:", error);
    }
  };

  const toggleMemberConfirmation = async (member: EquipeShow) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'shows', id, 'equipe', member.id), {
        confirma: !member.confirma
      });
    } catch (error) {
      console.error("Erro ao alternar confirmação:", error);
    }
  };

  const handleGerarOrcamentoShow = async () => {
    if (!show || !cliente) return;
    
    const dataEvento = show.dataEvento instanceof Timestamp 
      ? format(show.dataEvento.toDate(), 'dd/MM/yyyy')
      : show.dataEvento;

    const formatPhone = (phone: any) => {
      const cleaned = String(phone || '').replace(/\D/g, '');
      return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    };

    const payload = {
      tituloEvento: show.nomeEvento,
      valor: show.valorContrato || 0,
      nomeCliente: cliente.nome,
      telefone: formatPhone(cliente.telefone),
      cidade: show.cidade || show.local,
      dataEvento,
      tipoEvento: show.tipoEvento,
      duracao: show.duracao || '',
      somContratado: show.somContratado ? 'Sim' : 'Não',
      publicoEstimado: show.publicoEstimado || 0
    };

    try {
      const response = await fetch('https://webhook.ehstech.com.br/webhook/orcamentoHS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Criar documento no Firebase
        await addDoc(collection(db, 'shows', id, 'documentos'), {
          dataUpload: serverTimestamp(),
          nomeDocumento: `${show.nomeEvento}.pdf`,
          tipoDocumento: 'PDF',
          urlArquivo: result.urlArquivo || '' // Usar o campo correto retornado pelo webhook
        });

        setHeleModal({
          isOpen: true,
          message: "Olá! Acabei de enviar o orçamento deste show para o sistema. O documento foi gerado e salvo na aba Documentos!"
        });
      } else {
        alert("Erro ao enviar orçamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro no webhook:", error);
      alert("Erro de conexão ao enviar orçamento.");
    }
  };

  const canGenerateContract = () => {
    if (!show || !cliente) return false;
    
    const requiredFields = [
      cliente.nome,
      cliente.cpf,
      cliente.endereco,
      cliente.telefone,
      show.dataEvento,
      show.cidade,
      show.endereco || show.local,
      show.horarioEvento,
      show.duracao,
      show.valorContrato,
      show.nomeEvento
    ];

    return requiredFields.every(field => field !== undefined && field !== null && field !== '');
  };

  const handleGerarContrato = async () => {
    if (!show || !cliente) return;
    
    const dataEvento = show.dataEvento instanceof Timestamp 
      ? format(show.dataEvento.toDate(), 'dd/MM/yyyy')
      : show.dataEvento;

    const formatPhone = (phone: any) => {
      const cleaned = String(phone || '').replace(/\D/g, '');
      return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    };

    const payload = {
      nome: cliente.nome,
      cpf: cliente.cpf,
      enderecoContratante: cliente.endereco,
      telefone: formatPhone(cliente.telefone),
      email: cliente.email || '',
      dataEvento,
      cidade: show.cidade,
      local: show.endereco || show.local,
      horarioEvento: show.horarioEvento,
      duracao: show.duracao,
      valorShow: show.valorContrato,
      tituloEvento: show.nomeEvento
    };

    try {
      const response = await fetch('https://webhook.ehstech.com.br/webhook/contrato_hs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setHeleModal({
          isOpen: true,
          message: "Olá! O contrato foi gerado com sucesso e enviado para processamento!"
        });
        setIsContractModalOpen(false);
      } else {
        alert("Erro ao gerar contrato. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro no webhook de contrato:", error);
      alert("Erro de conexão ao gerar contrato.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'pdf_hs');

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dvq0tmbil/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        await addDoc(collection(db, 'shows', id, 'documentos'), {
          nomeDocumento: file.name,
          tipoDocumento: file.type.includes('pdf') ? 'PDF' : 'Imagem',
          urlArquivo: data.secure_url,
          dataUpload: serverTimestamp()
        });
        alert("Documento enviado com sucesso!");
      } else {
        alert("Erro ao enviar para o Cloudinary.");
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro de conexão ao enviar arquivo.");
    }
  };

  const handleEditDoc = (docItem: DocumentoShow) => {
    setEditingDoc(docItem);
    setDocValue('nomeDocumento', docItem.nomeDocumento);
    setDocValue('tipoDocumento', docItem.tipoDocumento);
    setIsEditDocModalOpen(true);
  };

  const onEditDocSubmit = async (data: any) => {
    if (!id || !editingDoc) return;
    try {
      await updateDoc(doc(db, 'shows', id, 'documentos', editingDoc.id), {
        nomeDocumento: data.nomeDocumento,
        tipoDocumento: data.tipoDocumento
      });
      setIsEditDocModalOpen(false);
      setEditingDoc(null);
      resetDoc();
    } catch (error) {
      console.error("Erro ao editar documento:", error);
    }
  };

  const deleteDocItem = async (docId: string) => {
    if (!id || !window.confirm("Excluir este documento permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'shows', id, 'documentos', docId));
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
    }
  };

  const onAddParcela = async (data: any) => {
    if (!id) return;
    try {
      await addDoc(collection(db, 'shows', id, 'parcelas'), {
        valorPagoParcela: Number(data.valorPagoParcela),
        formaPagamento: data.formaPagamento,
        statusPagamento: data.statusPagamento,
        dataPagamento: data.dataPagamento ? Timestamp.fromDate(new Date(data.dataPagamento)) : null,
        linkComprovante: data.linkComprovante || ''
      });
      setIsAddParcelaModalOpen(false);
      resetParcela();
    } catch (error) {
      console.error("Erro ao adicionar parcela:", error);
    }
  };

  const handleEditParcela = (parcela: ParcelaFinanceira) => {
    setEditingParcela(parcela);
    setParcelaValue('valorPagoParcela', parcela.valorPagoParcela);
    setParcelaValue('formaPagamento', parcela.formaPagamento);
    setParcelaValue('statusPagamento', parcela.statusPagamento);
    setParcelaValue('linkComprovante', parcela.linkComprovante);
    
    let dateStr = '';
    if (parcela.dataPagamento instanceof Timestamp) {
      dateStr = format(parcela.dataPagamento.toDate(), 'yyyy-MM-dd');
    }
    setParcelaValue('dataPagamento', dateStr);
    
    setIsEditParcelaModalOpen(true);
  };

  const onEditParcelaSubmit = async (data: any) => {
    if (!id || !editingParcela) return;
    try {
      await updateDoc(doc(db, 'shows', id, 'parcelas', editingParcela.id), {
        valorPagoParcela: Number(data.valorPagoParcela),
        formaPagamento: data.formaPagamento,
        statusPagamento: data.statusPagamento,
        dataPagamento: data.dataPagamento ? Timestamp.fromDate(new Date(data.dataPagamento)) : null,
        linkComprovante: data.linkComprovante || ''
      });
      setIsEditParcelaModalOpen(false);
      setEditingParcela(null);
      resetParcela();
    } catch (error) {
      console.error("Erro ao editar parcela:", error);
    }
  };

  const deleteParcela = async (parcelaId: string) => {
    if (!id || !window.confirm("Excluir esta parcela?")) return;
    try {
      await deleteDoc(doc(db, 'shows', id, 'parcelas', parcelaId));
    } catch (error) {
      console.error("Erro ao excluir parcela:", error);
    }
  };

  // Atualizar valor total pago no financeiro geral
  useEffect(() => {
    if (!id || !parcelas) return;
    
    const totalPago = parcelas
      .filter(p => p.statusPagamento === 'Pago')
      .reduce((acc, curr) => acc + (Number(curr.valorPagoParcela) || 0), 0);
      
    // Atualizar no subdocumento financeiro
    updateDoc(doc(db, 'shows', id, 'financeiro', 'geral'), {
      valorPagoTotal: totalPago
    }).catch(err => console.error("Erro ao atualizar total pago no subdoc:", err));

    // Sincronizar com o documento principal do show para o Dashboard
    updateDoc(doc(db, 'shows', id), {
      valorPagoTotal: totalPago
    }).catch(err => console.error("Erro ao sincronizar total pago no doc principal:", err));
  }, [id, parcelas]);

  const removeMember = async (memberId: string) => {
    if (!id || !window.confirm("Remover integrante deste show?")) return;
    try {
      await deleteDoc(doc(db, 'shows', id, 'equipe', memberId));
    } catch (error) {
      console.error("Erro ao remover integrante:", error);
    }
  };

  if (!show) return <div className="p-10 text-center text-slate-500">Carregando detalhes do show...</div>;

  const date = show.dataEvento?.seconds ? new Date(show.dataEvento.seconds * 1000) : new Date();

  const totalCachesConfirmados = equipe
    .filter(m => m.confirma)
    .reduce((acc, curr) => acc + (Number(curr.cache) || 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/shows')} className="text-slate-500 hover:text-slate-900 transition-all">Shows</button>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-bold">{show.nomeEvento}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{show.nomeEvento}</h1>
          <div className="flex flex-wrap gap-4 text-slate-500 text-sm">
            <span className="flex items-center gap-1.5"><Calendar size={16} /> {format(date, "dd/MM/yyyy")}</span>
            <span className="flex items-center gap-1.5"><Clock size={16} /> {show.horarioEvento}</span>
            <span className="flex items-center gap-1.5"><MapPin size={16} /> {show.local}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleEdit}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Edit2 size={18} />
            Editar Show
          </button>
          <span className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
            show.statusEvento === 'Confirmado' ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-500"
          )}>
            {show.statusEvento}
          </span>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <nav className="flex border-b border-slate-100 overflow-x-auto">
          <TabButton active={activeTab === 'equipe'} onClick={() => setActiveTab('equipe')} icon={Users} label="Equipe" />
          <TabButton active={activeTab === 'reunioes'} onClick={() => setActiveTab('reunioes')} icon={Calendar} label="Reuniões" />
          <TabButton active={activeTab === 'documentos'} onClick={() => setActiveTab('documentos')} icon={FileText} label="Documentos" />
          <TabButton active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={DollarSign} label="Financeiro" />
        </nav>

        <div className="p-8">
          {activeTab === 'equipe' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">Equipe do Show</h3>
                  <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                    Total Confirmado: R$ {totalCachesConfirmados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button 
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Plus size={18} /> Adicionar Integrante
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipe.map(m => {
                  const integrante = todosIntegrantes.find(i => i.id === m.integranteId);
                  return (
                    <div key={m.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 group relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600">
                            <Music size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{integrante?.nome || 'Desconhecido'}</p>
                            <p className="text-xs text-slate-500">{m.funcao}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditMember(m)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => removeMember(m.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {m.observacoes && (
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Observações</p>
                          <p className="text-xs text-slate-600 italic">"{m.observacoes}"</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <div className="text-sm font-bold text-emerald-600">R$ {m.cache}</div>
                        <button 
                          onClick={() => toggleMemberConfirmation(m)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            m.confirma 
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          )}
                        >
                          {m.confirma ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {m.confirma ? 'Confirmado' : 'Pendente'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'reunioes' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Histórico de Reuniões</h3>
              <div className="space-y-4">
                {reunioesRelacionadas.map(r => {
                  let dateDisplay = '';
                  if (r.data instanceof Timestamp) {
                    dateDisplay = format(r.data.toDate(), 'dd/MM/yyyy');
                  } else if (typeof r.data === 'string') {
                    const [year, month, day] = r.data.split('-');
                    dateDisplay = `${day}/${month}/${year}`;
                  }

                  return (
                    <div 
                      key={r.id} 
                      onClick={() => navigate(`/reunioes/${r.id}`)}
                      className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center px-3 py-1 bg-white border border-slate-200 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{dateDisplay.split('/')[1]}/{dateDisplay.split('/')[2]}</p>
                          <p className="text-lg font-black text-slate-900">{dateDisplay.split('/')[0]}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{r.nomeEvento}</p>
                          <p className="text-xs text-slate-500">{r.tipoEvento} • {r.status}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{r.decisao}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Documentos e Arquivos</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={handleGerarOrcamentoShow}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                  >
                    <ExternalLink size={18} /> Gerar Orçamento
                  </button>
                  {canGenerateContract() && (
                    <button 
                      onClick={() => setIsContractModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <FileText size={18} /> Gerar Contrato
                    </button>
                  )}
                  <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20">
                    <Upload size={18} /> Upload Cloudinary
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentos.map(docItem => (
                  <div key={docItem.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-500" />
                      <div>
                        <p className="font-bold text-sm text-slate-900">{docItem.nomeDocumento}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{docItem.tipoDocumento}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={docItem.urlArquivo} target="_blank" className="p-2 text-slate-400 hover:text-slate-900 transition-all">
                        <ExternalLink size={18} />
                      </a>
                      <button onClick={() => handleEditDoc(docItem)} className="p-2 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteDocItem(docItem.id)} className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Valor do Contrato</p>
                  <p className="text-2xl font-black text-slate-900">
                    {show.valorContrato ? `R$ ${show.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                  </p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Valor Pago</p>
                  <p className="text-2xl font-black text-emerald-600">
                    R$ {parcelas.filter(p => p.statusPagamento === 'Pago').reduce((acc, curr) => acc + (Number(curr.valorPagoParcela) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200">
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Saldo Devedor</p>
                  <p className="text-2xl font-black text-rose-600">
                    {show.valorContrato 
                      ? `R$ ${(show.valorContrato - parcelas.filter(p => p.statusPagamento === 'Pago').reduce((acc, curr) => acc + (Number(curr.valorPagoParcela) || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : 'R$ 0,00'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Parcelas e Pagamentos</h3>
                  <button 
                    onClick={() => setIsAddParcelaModalOpen(true)}
                    className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={16} /> Adicionar Parcela
                  </button>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Valor</th>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Forma</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parcelas.map(p => (
                        <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">R$ {p.valorPagoParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {p.dataPagamento instanceof Timestamp ? format(p.dataPagamento.toDate(), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{p.formaPagamento}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-1 rounded-md text-[10px] font-black uppercase", p.statusPagamento === 'Pago' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                              {p.statusPagamento}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {p.linkComprovante && <a href={p.linkComprovante} target="_blank" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><ExternalLink size={16} /></a>}
                              <button onClick={() => handleEditParcela(p)} className="p-2 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => deleteParcela(p.id)} className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar Show */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Editar Informações do Show</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onEditSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-1">Nome do Evento *</label>
                  <input {...register('nomeEvento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cliente *</label>
                  <select {...register('clienteId', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="">Selecione um cliente</option>
                    {todosClientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Data do Evento *</label>
                  <input type="date" {...register('dataEvento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Horário *</label>
                  <input type="time" {...register('horarioEvento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Tipo de Evento</label>
                  <select {...register('tipoEvento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="Casamento">Casamento</option>
                    <option value="Formatura">Formatura</option>
                    <option value="Aniversário">Aniversário</option>
                    <option value="Confraternização">Confraternização</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Público Estimado</label>
                  <input type="number" {...register('publicoEstimado')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Som Contratado?</label>
                  <select {...register('somContratado')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="false">Cliente possui som</option>
                    <option value="true">Contratar HS Produções</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Alimentação Banda?</label>
                  <select {...register('alimentacao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="true">Sim, haverá alimentação</option>
                    <option value="false">Não haverá</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Duração do Show</label>
                  <select {...register('duracao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="1 hora">1 hora</option>
                    <option value="2 horas">2 horas</option>
                    <option value="3 horas">3 horas</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Forma de Pagamento</label>
                  <select {...register('formaPagamento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="À vista">À vista</option>
                    <option value="Parcelado">Parcelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Status</label>
                  <select {...register('statusEvento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="Confirmado">Confirmado</option>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Realizado">Realizado</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Valor do Contrato (R$)</label>
                  <input type="number" step="0.01" {...register('valorContrato', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Local</label>
                  <input {...register('local')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-1">Endereço Completo</label>
                  <input {...register('endereco')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cidade</label>
                  <input {...register('cidade')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cerimonialista</label>
                  <input {...register('cerimonialista')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-1">Local da Cerimônia (se diferente)</label>
                  <input {...register('localCerimonia')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-1">Observações Gerais</label>
                  <textarea {...register('observacoes')} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Integrante (Multi-select) */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Adicionar Integrantes ao Show</h2>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Selecione os integrantes que farão parte deste show:</p>
              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {todosIntegrantes.map(i => {
                  const isAlreadyInShow = equipe.some(m => m.integranteId === i.id);
                  const isSelected = selectedMembers.includes(i.id);
                  
                  return (
                    <button
                      key={i.id}
                      disabled={isAlreadyInShow}
                      onClick={() => toggleMemberSelection(i.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        isAlreadyInShow ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed" :
                        isSelected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 hover:border-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-all",
                          isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <CheckCircle size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{i.nome}</p>
                          <p className="text-xs opacity-70">{i.funcao}</p>
                        </div>
                      </div>
                      {isAlreadyInShow && <span className="text-[10px] font-bold uppercase text-slate-400">Já adicionado</span>}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddMemberModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button 
                  onClick={onAddMembers}
                  disabled={selectedMembers.length === 0}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                >
                  Adicionar {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Integrante */}
      {isEditMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Editar Integrante no Show</h2>
              <button onClick={() => { setIsEditMemberModalOpen(false); setEditingMember(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleMemberSubmit(onEditMemberSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Integrante</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 font-medium">
                  {todosIntegrantes.find(i => i.id === editingMember?.integranteId)?.nome}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Função neste Show</label>
                  <input {...regMember('funcao')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Cache (R$)</label>
                  <input type="number" {...regMember('cache')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Observações</label>
                <textarea {...regMember('observacoes')} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsEditMemberModalOpen(false); setEditingMember(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Documento */}
      {isEditDocModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Editar Documento</h2>
              <button onClick={() => { setIsEditDocModalOpen(false); setEditingDoc(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleDocSubmit(onEditDocSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nome do Documento *</label>
                <input {...regDoc('nomeDocumento', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Tipo</label>
                <select {...regDoc('tipoDocumento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="PDF">PDF</option>
                  <option value="Imagem">Imagem</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Orçamento">Orçamento</option>
                  <option value="Comprovante">Comprovante</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsEditDocModalOpen(false); setEditingDoc(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Parcela */}
      {(isAddParcelaModalOpen || isEditParcelaModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{isEditParcelaModalOpen ? 'Editar Parcela' : 'Adicionar Parcela'}</h2>
              <button onClick={() => { setIsAddParcelaModalOpen(false); setIsEditParcelaModalOpen(false); setEditingParcela(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleParcelaSubmit(isEditParcelaModalOpen ? onEditParcelaSubmit : onAddParcela)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" {...regParcela('valorPagoParcela', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Data do Pagamento</label>
                  <input type="date" {...regParcela('dataPagamento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Forma de Pagamento</label>
                  <select {...regParcela('formaPagamento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Status</label>
                  <select {...regParcela('statusPagamento')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Link do Comprovante</label>
                <input {...regParcela('linkComprovante')} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsAddParcelaModalOpen(false); setIsEditParcelaModalOpen(false); setEditingParcela(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">
                  {isEditParcelaModalOpen ? 'Salvar Alterações' : 'Adicionar Parcela'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Contrato */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Gerar Contrato</h3>
            <p className="text-slate-500 mb-6">Deseja realmente gerar o contrato para este show? Todos os dados obrigatórios foram validados.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsContractModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all text-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGerarContrato}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Hele */}
      {heleModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto rounded-full bg-blue-500/10 border-2 border-blue-500/20 overflow-hidden">
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
