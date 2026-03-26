export interface Participacao {
  slot_id: string;
  nome: string;
  user_id: string;
  data: string;
}

export const api = {
  async getParticipacoes(): Promise<Participacao[]> {
    const res = await fetch('/api/participacoes');
    if (!res.ok) throw new Error('Failed to fetch participacoes');
    return res.json();
  },
  
  async addParticipacao(data: { slot_id: string; nome: string; user_id: string }) {
    const res = await fetch('/api/participacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to add participacao');
    }
    return res.json();
  },
  
  async removeParticipacao(data: { slot_id: string; user_id: string }) {
    const res = await fetch('/api/participacoes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to remove participacao');
    }
    return res.json();
  },
  
  async getConfig(): Promise<Record<string, string>> {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
  },
  
  async updateConfig(key: string, value: string) {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update config');
    }
    return res.json();
  }
};
