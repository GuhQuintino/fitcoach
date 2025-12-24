import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Photo {
    id: string;
    image_url: string;
    notes: string | null;
    created_at: string;
}

const EvolutionGallery: React.FC<{ studentId?: string; isCoachView?: boolean }> = ({ studentId, isCoachView = false }) => {
    const { user } = useAuth();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const targetId = studentId || user?.id;

    useEffect(() => {
        if (targetId) {
            fetchPhotos();
        }
    }, [targetId]);

    const fetchPhotos = async () => {
        try {
            const { data, error } = await supabase
                .from('evolution_photos')
                .select('*')
                .eq('student_id', targetId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Erro ao buscar fotos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            // 1. Upload para o Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError, data } = await supabase.storage
                .from('evolution-photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('evolution-photos')
                .getPublicUrl(fileName);

            // 3. Salvar no Banco
            const { error: dbError } = await supabase
                .from('evolution_photos')
                .insert({
                    student_id: user.id,
                    image_url: publicUrl,
                    notes: ''
                });

            if (dbError) throw dbError;

            toast.success('Foto adicionada com sucesso!');
            fetchPhotos();
        } catch (error: any) {
            console.error('Erro no upload:', error);
            toast.error(error.message || 'Erro ao subir foto');
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (id: string, url: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta foto?')) return;

        try {
            // 1. Deletar do banco
            const { error: dbError } = await supabase
                .from('evolution_photos')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            // 2. Tentar deletar do storage (opcional, URL pública é difícil de extrair o path exato sem complexidade)
            // Aqui simplificamos deletando apenas do banco para o MVP

            toast.success('Foto removida');
            setPhotos(photos.filter(p => p.id !== id));
        } catch (error) {
            toast.error('Erro ao excluir foto');
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Carregando fotos...</div>;

    return (
        <div className="space-y-6">
            {!isCoachView && (
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Minha Evolução</h3>
                    <label className="cursor-pointer bg-primary dark:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2">
                        {uploading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-rounded text-lg">add_a_photo</span>
                        )}
                        Subir Foto
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            )}

            {photos.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center">
                    <span className="material-symbols-rounded text-5xl text-slate-300 mb-4 font-light">photo_library</span>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma foto adicionada ainda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <img src={photo.image_url} alt="Progresso" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-[10px] text-white/80 font-medium">
                                    {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                                </p>
                                {!isCoachView && (
                                    <button
                                        onClick={() => deletePhoto(photo.id, photo.image_url)}
                                        className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-rounded text-sm">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EvolutionGallery;
