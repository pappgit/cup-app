import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CupData } from '../types';
import { DEFAULT_CUP } from '../types';
import { fetchCup, persistCup, stripCupMeta } from '../lib/cupApi';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CupContextValue {
  cup: CupData;
  cupId: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  update: (patch: Partial<CupData> | ((prev: CupData) => CupData)) => Promise<void>;
  refresh: () => Promise<void>;
}

const CupContext = createContext<CupContextValue | null>(null);

export function CupProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const [cup, setCup] = useState<CupData>(DEFAULT_CUP);
  const [cupId, setCupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cupIdRef = useRef('');
  const cupRef = useRef(cup);
  cupRef.current = cup;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Mangler Supabase-konfigurasjon (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchCup();
      cupIdRef.current = data.cupId;
      setCupId(data.cupId);
      setCup(stripCupMeta(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke laste cup-data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!supabase || !cupIdRef.current) return;

    const id = cupIdRef.current;
    const channel = supabase
      .channel(`cup-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cups', filter: `id=eq.${id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `cup_id=eq.${id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `cup_id=eq.${id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_items', filter: `cup_id=eq.${id}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sponsors', filter: `cup_id=eq.${id}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cupId, load]);

  const update = useCallback(
    async (patch: Partial<CupData> | ((prev: CupData) => CupData)) => {
      if (!isAdmin) {
        setError('Du må være logget inn som admin for å lagre endringer');
        return;
      }

      const next =
        typeof patch === 'function' ? patch(cupRef.current) : { ...cupRef.current, ...patch };
      setCup(next);

      setSaving(true);
      try {
        const id = await persistCup(next, cupIdRef.current || undefined);
        cupIdRef.current = id;
        setCupId(id);
        const fresh = await fetchCup();
        cupIdRef.current = fresh.cupId;
        setCupId(fresh.cupId);
        setCup(stripCupMeta(fresh));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunne ikke lagre');
        await load();
      } finally {
        setSaving(false);
      }
    },
    [isAdmin, load]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  return (
    <CupContext.Provider
      value={{ cup, cupId, loading, saving, error, update, refresh }}
    >
      {children}
    </CupContext.Provider>
  );
}

export function useCup() {
  const ctx = useContext(CupContext);
  if (!ctx) throw new Error('useCup må brukes innen CupProvider');
  return ctx;
}
