import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline-sync';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');

dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath }); // Load local override/additional
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Prioritize Service Key for admin updates over Anon Key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (ou VITE_SUPABASE_ANON_KEY) devem ser definidos no .env');
    process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_KEY) {
    console.warn('\n[AVISO] SUPABASE_SERVICE_KEY não encontrada. Usando VITE_SUPABASE_ANON_KEY.');
    console.warn('[AVISO] Atualizações no banco de dados podem falhar se houver restrições de segurança (RLS).');
    console.warn('[AVISO] Adicione SUPABASE_SERVICE_KEY=... ao seu arquivo .env.local para corrigir isso.\n');
} else {
    console.log('[INFO] Rodando com permissões de Admin (Service Key detectada).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VIDEOS_DIR = path.resolve(__dirname, '../../public/exercises/hevy');
const CREDENTIALS_PATH = path.join(__dirname, 'client_secrets.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const PROCESSED_PATH = path.join(__dirname, 'processed.json');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

interface ProcessedFile {
    file: string;
    youtubeId: string;
    youtubeUrl: string;
    dbUpdated: boolean;
}

function loadProcessed(): Record<string, ProcessedFile> {
    if (fs.existsSync(PROCESSED_PATH)) {
        return JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
    }
    return {};
}

function saveProcessed(data: Record<string, ProcessedFile>) {
    fs.writeFileSync(PROCESSED_PATH, JSON.stringify(data, null, 2));
}

async function authorize() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`Error: ${CREDENTIALS_PATH} not found. Please download it from Google Cloud Console.`);
        process.exit(1);
    }
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    // Handle different formats of client_secrets.json
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris ? redirect_uris[0] : 'http://localhost');

    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }

    return getNewToken(oAuth2Client);
}

async function getNewToken(oAuth2Client: any) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Autorize este app visitando esta URL:', authUrl);
    console.log('\n---------------------------------------------------------');
    console.log('IMPORTANTE:');
    console.log('1. Após autorizar, você será redirecionado para uma página que pode falhar (localhost).');
    console.log('2. ISSO É NORMAL. Copie o código da barra de endereço do navegador.');
    console.log('3. O código começa depois de "code=" e vai até o "&" (se houver).');
    console.log('   Exemplo: http://localhost/?code=4/0ATX...&scope=...');
    console.log('   Copie apenas: 4/0ATX...');
    console.log('---------------------------------------------------------\n');

    const input = readline.question('Cole o código dessa página (ou a URL inteira) aqui: ');

    // Clean up input
    let code = input.trim();

    // Auto-extract code if user pasted the full URL
    if (code.includes('code=')) {
        const match = code.match(/code=([^&]+)/);
        if (match && match[1]) {
            code = match[1];
            console.log('Código detectado na URL: ' + code.substring(0, 10) + '...');
        }
    }

    // Decode generic URL encoding just in case (e.g. %2F -> /)
    if (code.includes('%')) {
        try {
            code = decodeURIComponent(code);
            console.log('Código decodificado (URL encoded).');
        } catch (e) {
            // Ignore if decode fails, use raw
        }
    }

    console.log(`Usando código: ${code.substring(0, 5)}...${code.substring(code.length - 5)}`);

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token armazenado em', TOKEN_PATH);
    return oAuth2Client;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Operação falhou, tentando novamente em ${delayMs}ms... (Tentativa ${i + 1}/${retries})`);
            await delay(delayMs);
        }
    }
    throw new Error('Inacessível'); // Unreachable
}

async function uploadVideo(auth: any, filePath: string, title: string) {
    const service = google.youtube({ version: 'v3', auth });

    console.log(`Enviando ${title}...`);

    try {
        const res = await service.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: `${title} #Shorts`,
                    description: 'Exercise video for FitCoach app #Shorts',
                },
                status: {
                    privacyStatus: 'unlisted', // Important: Unlisted
                    selfDeclaredMadeForKids: false,
                },
            },
            media: {
                body: fs.createReadStream(filePath),
            },
        });
        console.log(`Enviado! ID: ${res.data.id}`);
        return res.data;
    } catch (err: any) {
        console.error('A API retornou um erro: ' + err);
        // Handle invalid_grant (expired token)
        if (err.message && (err.message.includes('invalid_grant') || err.message.includes('No refresh token'))) {
            console.log('\n[!] Token expirado ou inválido. Deletando token armazenado para forçar reautenticação na próxima vez.\n');
            if (fs.existsSync(TOKEN_PATH)) {
                fs.unlinkSync(TOKEN_PATH);
                console.log(`[!] ${TOKEN_PATH} deletado. Por favor, execute o script novamente para reautenticar.`);
            }
            process.exit(1); // Exit to let user restart
        }
        throw err;
    }
}

async function updateDatabase(videoFileName: string, youtubeUrl: string) {
    // Search for the exercise that uses this file
    // We try to match by the path stored in DB.
    // The DB stores paths like "/exercises/hevy/video.mp4"
    // IMPORTANT: We use '%/' + filename to ensure exact filename match
    // This prevents 'crunch.mp4' from matching 'decline_crunch.mp4'

    console.log(`Procurando exercício com video_url terminando em: /${videoFileName}`);

    // Initial search - note the '/' before filename to ensure exact match
    let exercises;
    try {
        const { data, error: searchError } = await retryOperation(async () => {
            return await supabase
                .from('exercises')
                .select('id, name, video_url')
                .ilike('video_url', `%/${videoFileName}`);
        });

        if (searchError) {
            console.error('Erro ao encontrar exercício:', searchError);
            return false;
        }
        exercises = data;
    } catch (e) {
        console.error('Falha ao buscar exercício após tentativas:', e);
        return false;
    }

    if (!exercises || exercises.length === 0) {
        console.log(`Nenhum exercício encontrado para o arquivo ${videoFileName}`);
        return false;
    }

    // Warn if multiple exercises match (shouldn't happen with correct data)
    if (exercises.length > 1) {
        console.warn(`[AVISO] Múltiplos exercícios (${exercises.length}) encontrados para ${videoFileName}. Isso pode indicar dados duplicados.`);
    }

    let success = true;
    for (const ex of exercises) {
        console.log(`Atualizando exercício: ${ex.name} (${ex.id})`);

        try {
            await retryOperation(async () => {
                const { data: updatedRows, error: updateError } = await supabase
                    .from('exercises')
                    .update({ video_url: youtubeUrl })
                    .eq('id', ex.id)
                    .select();

                if (updateError) throw updateError;

                // If no rows returned, RLS probably blocked it
                if (!updatedRows || updatedRows.length === 0) {
                    throw new Error('ATUALIZAÇÃO BLOQUEADA PELO BANCO (Provável erro de permissão/RLS). O script precisa da SUPABASE_SERVICE_KEY.');
                }
                return true;
            });

            console.log(`Sucesso ao atualizar ${ex.name}`);
            // Append to SQL file as backup/primary method if RLS fails
            const sql = `UPDATE exercises SET video_url = '${youtubeUrl.replace("watch?v=", "shorts/")}' WHERE id = '${ex.id}';\n`;
            fs.appendFileSync(path.join(__dirname, 'updates.sql'), sql);

        } catch (error) {
            console.error(`Falha ao atualizar ${ex.name} após tentativas:`, error);
            success = false;
        }
    }
    return success;
}

async function main() {
    const auth = await authorize();
    const processed = loadProcessed();

    const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4'));

    console.log(`Encontrados ${files.length} arquivos de vídeo.`);

    for (const file of files) {
        // Performance optimization: Skip files that are fully processed and synced
        if (processed[file] && processed[file].dbUpdated) {
            console.log(`Pulando ${file} (já processado e sincronizado)`);
            continue;
        }

        const filePath = path.join(VIDEOS_DIR, file);
        const title = file.replace(/_/g, ' ').replace('.mp4', '');

        let youtubeId = processed[file]?.youtubeId;
        let youtubeUrl = processed[file]?.youtubeUrl;

        // Upload if not already uploaded (and we don't have an ID)
        if (!youtubeId) {
            try {
                const data = await uploadVideo(auth, filePath, title);
                youtubeId = data.id!;
                youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

                processed[file] = {
                    file,
                    youtubeId,
                    youtubeUrl,
                    dbUpdated: false
                };
                saveProcessed(processed);
            } catch (e: any) {
                // Handle Quota Exceeded specifically
                if (e.message && (e.message.includes('quota') || e.message.includes('exceeded'))) {
                    console.log('\n========================================================');
                    console.log('[!] COTA DO YOUTUBE ATINGIDA PARA HOJE.');
                    console.log('    O script vai parar agora. Tente novamente amanhã.');
                    console.log('========================================================\n');
                    process.exit(0);
                }

                console.error(`Falha ao enviar ${file}, pulando. Erro: ${e.message}`);
                continue;
            }
        } else {
            console.log(`[INFO] Vídeo já enviado: ${file} (${youtubeId})`);
        }

        // Force attempt to update DB if we have a URL, regardless of flag
        if (youtubeUrl) {
            const updated = await updateDatabase(file, youtubeUrl);
            if (updated) {
                // Only mark as true if currently false to save disk I/O
                if (!processed[file] || !processed[file].dbUpdated) {
                    if (!processed[file]) processed[file] = { file, youtubeId, youtubeUrl, dbUpdated: true };
                    processed[file].dbUpdated = true;
                    saveProcessed(processed);
                }
            }
        }
    }

    console.log('Concluído!');
}

main().catch(console.error);
