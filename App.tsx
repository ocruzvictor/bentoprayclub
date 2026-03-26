import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Clock, User, LogOut, CheckCircle2, AlertCircle, Share2, Users, TrendingDown, TrendingUp, X, Info } from 'lucide-react';
import { api, Participacao } from './services/api';

interface Slot {
  id: string;
  horario: string;
}

const slots = [
  { id: "slot_05_07", label: "05h–07h" },
  { id: "slot_07_10", label: "07h–10h" },
  { id: "slot_10_13", label: "10h–13h" },
  { id: "slot_13_16", label: "13h–16h" },
  { id: "slot_16_19", label: "16h–19h" },
  { id: "slot_19_22", label: "19h–22h" },
  { id: "slot_22_00", label: "22h–00h" },
  { id: "slot_00_05", label: "00h–05h" }
];

export default function App() {
  const [user, setUser] = useState<{ nome: string; id: string } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suggestionModal, setSuggestionModal] = useState<{
    show: boolean;
    slotId: slot.id;
    suggestions: {slot.label};
  }>({ show: false, slotId: '', suggestions: [] });

  // Admin Panel Component
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('bento_pray_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newUser = {
      nome: nameInput.trim(),
      id: uuidv4(),
    };
    localStorage.setItem('bento_pray_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('bento_pray_user');
    setUser(null);
    setNameInput('');
  };

  const fetchParticipacoes = useCallback(async () => {
    try {
      const data = await api.getParticipacoes();
      setParticipacoes(data);
    } catch (error) {
      console.error('Failed to fetch participacoes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await api.getConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchParticipacoes();
    fetchConfig();
    const interval = setInterval(() => {
      fetchParticipacoes();
      fetchConfig();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchParticipacoes, fetchConfig]);

  const getSlotCount = (slotId: string) => {
    return participacoes.filter((p) => p.slot_id === slotId).length;
  };

  const isUserInSlot = (slotId: string) => {
    if (!user) return false;
    return participacoes.some((p) => p.slot_id === slotId && p.user_id === user.id);
  };

  const getSlotColorClass = (count: number) => {
    if (count <= 2) return 'bg-emerald-100 border-emerald-300 text-emerald-800';
    if (count <= 5) return 'bg-amber-100 border-amber-300 text-amber-800';
    return 'bg-rose-100 border-rose-300 text-rose-800';
  };

  const getSlotStatusIcon = (count: number) => {
    if (count <= 2) return '🟢';
    if (count <= 5) return '🟡';
    return '🔴';
  };

  const handleParticipate = async (slotId: string, bypassSuggestion = false) => {
    if (!user) return;

    const count = getSlotCount(slotId);
    
    // Calculate average participants per slot
    const totalParticipants = participacoes.length;
    const average = totalParticipants / SLOTS.length;

    // Suggestion logic
    if (!bypassSuggestion && count > average && count >= 3) {
      // Find slots with fewer people
      const availableSlots = SLOTS.filter(s => !isUserInSlot(s.id) && s.id !== slotId);
      const sortedSlots = availableSlots.sort((a, b) => getSlotCount(a.id) - getSlotCount(b.id));
      const suggestions = sortedSlots.slice(0, 3);

      if (suggestions.length > 0 && getSlotCount(suggestions[0].id) < count) {
        setSuggestionModal({
          show: true,
          slotId,
          suggestions,
        });
        return;
      }
    }

    setActionLoading(slotId);
    try {
      await api.addParticipacao({
        slot_id: slotId,
        nome: user.nome,
        user_id: user.id,
      });

      await fetchParticipacoes();
      setSuggestionModal({ show: false, slotId: '', suggestions: [] });
    } catch (error: any) {
      console.error('Error participating:', error);
      alert(error.message || 'Erro de conexão');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (slotId: string) => {
    if (!user) return;

    setActionLoading(slotId);
    try {
      await api.removeParticipacao({
        slot_id: slotId,
        user_id: user.id,
      });

      await fetchParticipacoes();
    } catch (error: any) {
      console.error('Error leaving:', error);
      alert(error.message || 'Erro de conexão');
    } finally {
      setActionLoading(null);
    }
  };

  const handleShare = async () => {
    let shareText = 'Escala de oração 🙏\n\n';
    
    SLOTS.forEach(slot => {
      const count = getSlotCount(slot.id);
      if (count === 0) {
        shareText += `${slot.horario}: disponível ✅\n`;
      } else {
        shareText += `${slot.horario}: ${count} ${count === 1 ? 'pessoa' : 'pessoas'}\n`;
      }
    });

    shareText += `\nParticipe: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Escala de Oração',
          text: shareText,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Texto copiado para a área de transferência!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Não foi possível copiar o texto.');
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {config.mensagem_topo && (
          <div className="w-full max-w-md bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl mb-6 text-center font-medium shadow-sm">
            {config.mensagem_topo}
          </div>
        )}
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 w-full max-w-md text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Bento Pray Club</h1>
          <p className="text-slate-500 mb-8">Escala de oração contínua. Junte-se a nós!</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">Seu Nome</label>
              <input
                id="name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Digite seu nome..."
                className="w-full px-4 py-4 rounded-xl border border-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>

        <div className="w-full max-w-md bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <h2 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
            <Info size={16} />
            Como funciona:
          </h2>
          <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
            <li>Digite seu nome</li>
            <li>Escolha um ou mais horários para orar</li>
            <li>Você pode sair de um horário a qualquer momento</li>
          </ul>
        </div>
      </div>
    );
  }

  const mySlots = participacoes
    .filter((p) => p.user_id === user.id)
    .map((p) => {
      const slotDef = SLOTS.find(s => s.id === p.slot_id);
      return {
        id: p.slot_id,
        horario: slotDef ? slotDef.horario : p.slot_id
      };
    });
    
  const uniqueUsersCount = new Set(participacoes.map(p => p.user_id)).size;
  
  // Calculate emptiest and most crowded slots
  const slotsWithCounts = SLOTS.map(slot => ({
    ...slot,
    count: getSlotCount(slot.id)
  }));
  
  const sortedByCount = [...slotsWithCounts].sort((a, b) => a.count - b.count);
  const emptiestSlot = sortedByCount[0];
  const mostCrowdedSlot = sortedByCount[sortedByCount.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-600" size={24} />
            <h1 className="font-bold text-lg text-slate-800">Bento Pray Club</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-700 p-2"
            aria-label="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Top Message */}
        {config.mensagem_topo && (
          <section className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm text-amber-900 text-center font-medium">
            {config.mensagem_topo}
          </section>
        )}

        {/* Resumo Geral */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Users size={16} />
            Resumo Geral
          </h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Total de Pessoas</p>
              <p className="text-2xl font-bold text-blue-700">{uniqueUsersCount}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Total de Vagas Preenchidas</p>
              <p className="text-2xl font-bold text-slate-700">{participacoes.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-2 rounded-lg text-sm border border-emerald-100">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-emerald-600" />
                <span className="font-medium">Mais vazio:</span>
              </div>
              <span className="font-bold">{emptiestSlot?.horario} ({emptiestSlot?.count})</span>
            </div>
            <div className="flex items-center justify-between bg-rose-50 text-rose-800 px-3 py-2 rounded-lg text-sm border border-rose-100">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-rose-600" />
                <span className="font-medium">Mais cheio:</span>
              </div>
              <span className="font-bold">{mostCrowdedSlot?.horario} ({mostCrowdedSlot?.count})</span>
            </div>
          </div>
        </section>

        {/* Welcome & My Slots */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Olá,</p>
              <p className="font-semibold text-slate-800">{user.nome}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">
              Você está em:
            </h2>
            {mySlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mySlots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className="bg-blue-50 text-blue-700 pl-3 pr-1 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-blue-100"
                  >
                    <CheckCircle2 size={16} />
                    {slot.horario}
                    <button 
                      onClick={() => handleLeave(slot.id)}
                      disabled={actionLoading === slot.id}
                      className="p-1 hover:bg-blue-100 rounded-md transition-colors text-blue-500 hover:text-blue-700 disabled:opacity-50"
                      aria-label={`Sair do horário ${slot.horario}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">Nenhum horário selecionado ainda.</p>
            )}
          </div>
        </section>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Share2 size={20} />
          Compartilhar escala
        </button>

        {/* Slots List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Horários Fixos</h2>
            {loading && <span className="text-xs text-slate-400">Atualizando...</span>}
          </div>

          <div className="space-y-3">
            {SLOTS.map((slot) => {
              const count = getSlotCount(slot.id);
              const isParticipating = isUserInSlot(slot.id);
              const isLoading = actionLoading === slot.id;
              
              return (
                <div 
                  key={slot.id}
                  className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${
                    isParticipating ? 'border-blue-300 ring-1 ring-blue-100' : 
                    count === 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-800">{slot.horario}</span>
                      {count === 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Prioridade</span>}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1.5 ${getSlotColorClass(count)}`}>
                      <span>{getSlotStatusIcon(count)}</span>
                      {count} {count === 1 ? 'pessoa' : 'pessoas'}
                    </div>
                  </div>

                  <div>
                    {isParticipating ? (
                      <button
                        onClick={() => handleLeave(slot.id)}
                        disabled={isLoading}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Saindo...' : 'Sair deste horário'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleParticipate(slot.id)}
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {isLoading ? 'Entrando...' : 'Participar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Suggestion Modal */}
      {suggestionModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="bg-amber-50 p-6 text-center border-b border-amber-100">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-amber-900 mb-1">Horário Cheio 🙏</h3>
              <p className="text-amber-700 text-sm">
                Este horário já tem bastante gente. Você pode ajudar mais nestes horários que estão vazios:
              </p>
            </div>
            
            <div className="p-4 space-y-3 bg-slate-50">
              {suggestionModal.suggestions.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleParticipate(slot.id, true)}
                  className="w-full bg-white border border-slate-200 hover:border-blue-300 hover:ring-1 hover:ring-blue-100 p-3 rounded-xl flex items-center justify-between transition-all"
                >
                  <span className="font-bold text-slate-800">{slot.horario}</span>
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {getSlotCount(slot.id)} pessoas
                  </span>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleParticipate(suggestionModal.slotId, true)}
                className="w-full py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
              >
                Quero entrar no horário cheio mesmo assim
              </button>
              <button
                onClick={() => setSuggestionModal({ show: false, slotId: '', suggestions: [] })}
                className="w-full py-3 text-slate-400 font-medium hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel() {
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [mensagemTopo, setMensagemTopo] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partData, confData] = await Promise.all([
        api.getParticipacoes(),
        api.getConfig()
      ]);
      
      setParticipacoes(partData);
      setConfig(confData);
      setMensagemTopo(confData.mensagem_topo || '');
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.updateConfig('mensagem_topo', mensagemTopo);
      alert('Mensagem salva com sucesso!');
    } catch (error: any) {
      console.error('Error saving config:', error);
      alert(error.message || 'Erro de conexão');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDelete = async (slotId: string, userId: string) => {
    if (!confirm('Tem certeza que deseja remover esta participação?')) return;
    
    try {
      await api.removeParticipacao({ slot_id: slotId, user_id: userId });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      alert(error.message || 'Erro de conexão');
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando painel admin...</div>;

  // Group participacoes by slot
  const grouped = participacoes.reduce((acc, p) => {
    if (!acc[p.slot_id]) acc[p.slot_id] = [];
    acc[p.slot_id].push(p);
    return acc;
  }, {} as Record<string, Participacao[]>);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Painel Administrativo</h1>
          <a href="/" className="text-blue-600 hover:underline">Voltar para o App</a>
        </div>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Mensagem do Topo</h2>
          <textarea
            value={mensagemTopo}
            onChange={(e) => setMensagemTopo(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl mb-4 min-h-[100px]"
            placeholder="Digite a mensagem que aparecerá no topo do app..."
          />
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50"
          >
            {savingConfig ? 'Salvando...' : 'Salvar Mensagem'}
          </button>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Gerenciar Participações ({participacoes.length} total)</h2>
          
          <div className="space-y-6">
            {Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([slotId, parts]: [string, Participacao[]]) => (
              <div key={slotId} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-bold text-slate-700">
                  Horário: {slotId} ({parts.length} pessoas)
                </div>
                <div className="divide-y divide-slate-100">
                  {parts.map((p: Participacao) => (
                    <div key={`${p.slot_id}-${p.user_id}`} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-800">{p.nome}</p>
                        <p className="text-xs text-slate-500">ID: {p.user_id}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(p.slot_id, p.user_id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <p className="text-slate-500 italic">Nenhuma participação registrada.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
