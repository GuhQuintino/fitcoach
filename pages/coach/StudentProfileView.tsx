import React, { useEffect, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const StudentProfileView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<any>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Expiration Modal
    const [isEditingExpiration, setIsEditingExpiration] = useState(false);
    const [newExpirationDate, setNewExpirationDate] = useState('');
    const [savingExpiration, setSavingExpiration] = useState(false);

    useEffect(() => {
        if (id) {
            fetchStudentDetails();
        }
    }, [id]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id!)
                .single();
            if (pError) throw pError;
            setProfile(pData);

            const { data: sData, error: sError } = await supabase
                .from('students_data')
                .select('*')
                .eq('id', id!)
                .single();
            if (sError) throw sError;
            setStudentData(sData);

            if (sData?.consultancy_expires_at) {
                setNewExpirationDate(sData.consultancy_expires_at.split('T')[0]);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateExpiration = async () => {
        try {
            setSavingExpiration(true);
            const { error } = await supabase.rpc('approve_student', {
                student_uuid: id,
                expiration_date: new Date(newExpirationDate).toISOString()
            });

            if (error) throw error;

            setStudentData({ ...studentData, consultancy_expires_at: new Date(newExpirationDate).toISOString() });
            setIsEditingExpiration(false);
        } catch (error) {
            console.error('Error updating expiration:', error);
            alert('Erro ao atualizar validade.');
        } finally {
            setSavingExpiration(false);
        }
    };

    const formatAge = (birthDate: string) => {
        if (!birthDate) return '--';
        const ageDifMs = Date.now() - new Date(birthDate).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const isExpired = studentData?.consultancy_expires_at && new Date(studentData.consultancy_expires_at) < new Date();

    return (
        <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-24 min-h-screen">
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
                <Link to="/coach/students" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-rounded text-slate-700 dark:text-slate-200">arrow_back_ios_new</span>
                </Link>
                <h1 className="text-lg font-bold">Perfil do Aluno</h1>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 pointer-events-none">
                    <span className="material-symbols-rounded">edit</span>
                </button>
            </header>

            <section className="flex flex-col items-center pt-8 pb-4 px-4">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full p-1 shadow-xl shadow-primary/10 bg-white dark:bg-slate-800">
                        <img
                            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}`}
                            alt={profile?.full_name}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile?.full_name}</h2>
                    <div className="flex flex-col items-center gap-2 mt-2">
                        {isExpired ? (
                            <button
                                onClick={() => setIsEditingExpiration(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-colors"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Plano Vencido (Editar)
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditingExpiration(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-200 transition-colors"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Ativo até {new Date(studentData?.consultancy_expires_at).toLocaleDateString()}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="px-4 py-4">
                {profile?.phone && (
                    <a
                        className="flex items-center justify-center w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold h-12 rounded-xl gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-green-500/20"
                        href={`https://wa.me/${profile.phone.replace(/\D/g, '')}`}
                    >
                        <span className="material-symbols-rounded text-[20px]">chat</span>
                        <span>Mensagem via WhatsApp</span>
                    </a>
                )}
            </section>

            <section className="px-4 py-2">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3 px-1">Informações Pessoais</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-rounded text-primary text-[20px]">cake</span>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Idade</p>
                        </div>
                        <p className="text-slate-900 dark:text-white text-2xl font-bold">
                            {formatAge(studentData?.birth_date)} <span className="text-sm font-normal text-slate-400">anos</span>
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-rounded text-primary text-[20px]">height</span>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Altura</p>
                        </div>
                        <p className="text-slate-900 dark:text-white text-2xl font-bold">
                            {studentData?.height_cm || '--'} <span className="text-sm font-normal text-slate-400">cm</span>
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 shadow-sm col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-rounded text-primary text-[20px]">flag</span>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Objetivo</p>
                        </div>
                        <p className="text-slate-900 dark:text-white text-lg font-medium">
                            {studentData?.goal || 'Não definido'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Edit Expiration Modal */}
            {isEditingExpiration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-up">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Alterar Validade</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                            Defina uma nova data de vencimento para o plano deste aluno.
                        </p>

                        <input
                            type="date"
                            value={newExpirationDate}
                            onChange={(e) => setNewExpirationDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditingExpiration(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateExpiration}
                                disabled={savingExpiration}
                                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {savingExpiration ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav role="coach" />
        </div>
    );
};

export default StudentProfileView;
